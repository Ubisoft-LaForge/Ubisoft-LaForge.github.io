// BRDFRenderer - WebGL2 progressive path tracer for BRDF visualization
// Supports point light and HDR environment map rendering with MIS

export class BRDFRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.programs = {};
    this.fbos = [null, null];
    this.textures = {
      accum: [null, null],
      envmap: null,
      marginalCDF: null,
      conditionalCDF: null,
      triangles: null,
      bvhNodes: null,
    };
    this.currentFBO = 0;
    this.sampleCount = 0;
    this.frameIndex = 0;
    this.animFrame = null;
    this.rendering = false;
    this.onUpdate = null;
    this.maxSamples = 64;
    this.floatLinearSupported = false;

    // Camera state
    this.camTheta = 0.3;
    this.camPhi = 0.0;
    this.camDist = 2.5;

    // Light/envmap settings
    this.lightMode = 1; // 0=point, 1=envmap
    this.lightTheta = 0.5;
    this.lightPhi = 1.0;
    this.envmapRotation = 0.0;
    this.exposure = 1.0;
    this.hasHDR = 0;
    this.backgroundFovScale = 1.75;
    this.maxTextureSize = 4096;

    // Envmap dimensions
    this.envmapWidth = 0;
    this.envmapHeight = 0;
    this.envmapTotalWeight = 1.0;

    // Geometry state
    this.geometryMode = 0; // 0=sphere, 1=mesh
    this.triangleCount = 0;
    this.bvhNodeCount = 0;
    this.triangleTextureWidth = 1;
    this.bvhTextureWidth = 1;
    this.modelData = null;

    // BRDF state
    this.brdfParams = {};
    this.brdfData = null;

    // Resize observer
    this.resizeObserver = null;

    // Dummy 1x1 texture for unbound samplers
    this._dummyTexture = null;
    this.quadVAO = null;
    this.quadBuffer = null;
  }

  async init() {
    const gl = this.canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    // Check required extensions
    const extFloat = gl.getExtension("EXT_color_buffer_float");
    if (!extFloat)
      console.warn("EXT_color_buffer_float not available, using fallback");
    this.floatLinearSupported = !!gl.getExtension("OES_texture_float_linear");
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

    this._setupResizeObserver();
    this._resizeCanvas();
    this._createAccumTextures();
    this._buildQuadBuffer();

    // Build display program (always available even before BRDF load)
    this._buildDisplayProgram();

    console.log("BRDFRenderer initialized");
  }

  _setupResizeObserver() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this._resizeCanvas();
        this._createAccumTextures();
        this.resetAccumulation();
      });
      this.resizeObserver.observe(this.canvas);
    }
  }

  _resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  _buildQuadBuffer() {
    const gl = this.gl;
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  _createAccumTextures() {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < 2; i++) {
      if (this.fbos[i]) gl.deleteFramebuffer(this.fbos[i]);
      if (this.textures.accum[i]) gl.deleteTexture(this.textures.accum[i]);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        w,
        h,
        0,
        gl.RGBA,
        gl.FLOAT,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.textures.accum[i] = tex;

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0,
      );
      this.fbos[i] = fbo;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  _compileShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Shader compile error:\n" + err);
    }
    return shader;
  }

  _linkProgram(vs, fs) {
    const gl = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a_position");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error("Program link error:\n" + err);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  _buildDisplayProgram() {
    const gl = this.gl;
    const vsSrc = `#version 300 es
layout(location=0) in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fsSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_accum;
uniform float u_exposure;

vec3 acesFilm(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main() {
  vec4 accum = texture(u_accum, v_uv);
  float count = max(accum.a, 1.0);
  vec3 color = accum.rgb / count;
  color *= u_exposure;
  color = acesFilm(color);
  color = pow(max(color, vec3(0.0)), vec3(1.0/2.2));
  fragColor = vec4(color, 1.0);
}`;
    const prog = this._linkProgram(
      this._compileShader(gl.VERTEX_SHADER, vsSrc),
      this._compileShader(gl.FRAGMENT_SHADER, fsSrc),
    );
    this.programs.display = prog;
  }

  _buildRenderProgram(brdfData) {
    const gl = this.gl;

    // Build uniform declarations for BRDF parameters
    let uniformDecls = "";
    for (const p of brdfData.parameters) {
      if (p.type === "bool") {
        uniformDecls += `uniform bool ${p.name};\n`;
      } else if (p.type === "float") {
        uniformDecls += `uniform float ${p.name};\n`;
      } else if (p.type === "int") {
        uniformDecls += `uniform int ${p.name};\n`;
      }
    }

    const vsSrc = `#version 300 es
layout(location=0) in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fsSrc = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_prevAccum;
uniform int u_sampleCount;
uniform int u_samplesPerPass;
uniform int u_frameIndex;

uniform int u_lightMode;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;

uniform vec3 u_camPos;
uniform mat3 u_camRot;
uniform float u_tanHalfFov;
uniform float u_backgroundFovScale;
uniform vec2 u_resolution;

uniform sampler2D u_envmap;
uniform vec2 u_envmapSize;
uniform int u_hasHDR;
uniform float u_envmapRotation;
uniform sampler2D u_marginalCDF;
uniform sampler2D u_conditionalCDF;
uniform float u_envmapTotalWeight;

uniform int u_geometryMode;
uniform sampler2D u_triangles;
uniform sampler2D u_bvhNodes;
uniform int u_triangleCount;
uniform int u_bvhNodeCount;
uniform int u_triangleTextureWidth;
uniform int u_bvhTextureWidth;

${uniformDecls}

const float PI = 3.14159265358979323846;
const float TWO_PI = 6.28318530717958647692;
const float INV_PI = 0.31830988618379067154;
const float INV_TWO_PI = 0.15915494309189533577;

// PCG random number generator
uint pcgHash(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

uint rngState;
void seedRNG(uvec2 pixel, uint frame) {
  rngState = pcgHash(pixel.x + pcgHash(pixel.y + pcgHash(frame * 6791u + 13u)));
}

float rand() {
  rngState = pcgHash(rngState);
  return float(rngState) / 4294967296.0;
}

vec2 rand2() { return vec2(rand(), rand()); }
vec3 rand3() { return vec3(rand(), rand(), rand()); }

vec4 fetchPacked(sampler2D tex, int index, int width) {
  int y = index / width;
  int x = index - y * width;
  return texelFetch(tex, ivec2(x, y), 0);
}

// Sphere intersection
bool intersectSphere(vec3 ro, vec3 rd, out float t, out vec3 normal) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float disc = b*b - c;
  if (disc < 0.0) return false;
  float sqrtDisc = sqrt(disc);
  float t0 = -b - sqrtDisc;
  float t1 = -b + sqrtDisc;
  t = (t0 > 0.001) ? t0 : t1;
  if (t < 0.001) return false;
  normal = normalize(ro + rd * t);
  return true;
}

bool intersectAABB(vec3 ro, vec3 invRd, vec3 bmin, vec3 bmax, float maxT) {
  vec3 t0 = (bmin - ro) * invRd;
  vec3 t1 = (bmax - ro) * invRd;
  vec3 tNear3 = min(t0, t1);
  vec3 tFar3 = max(t0, t1);
  float tNear = max(max(tNear3.x, tNear3.y), max(tNear3.z, 0.001));
  float tFar = min(min(tFar3.x, tFar3.y), tFar3.z);
  return tFar >= tNear && tNear <= maxT;
}

bool intersectTriangle(int triIndex, vec3 ro, vec3 rd, inout float closestT, out vec3 normal) {
  int base = triIndex * 6;
  vec3 p0 = fetchPacked(u_triangles, base, u_triangleTextureWidth).xyz;
  vec3 e1 = fetchPacked(u_triangles, base + 1, u_triangleTextureWidth).xyz;
  vec3 e2 = fetchPacked(u_triangles, base + 2, u_triangleTextureWidth).xyz;

  vec3 pvec = cross(rd, e2);
  float det = dot(e1, pvec);
  if (abs(det) < 1e-8) return false;

  float invDet = 1.0 / det;
  vec3 tvec = ro - p0;
  float u = dot(tvec, pvec) * invDet;
  if (u < 0.0 || u > 1.0) return false;

  vec3 qvec = cross(tvec, e1);
  float v = dot(rd, qvec) * invDet;
  if (v < 0.0 || u + v > 1.0) return false;

  float triT = dot(e2, qvec) * invDet;
  if (triT < 0.001 || triT >= closestT) return false;

  vec3 n0 = fetchPacked(u_triangles, base + 3, u_triangleTextureWidth).xyz;
  vec3 n1 = fetchPacked(u_triangles, base + 4, u_triangleTextureWidth).xyz;
  vec3 n2 = fetchPacked(u_triangles, base + 5, u_triangleTextureWidth).xyz;
  normal = normalize(n0 * (1.0 - u - v) + n1 * u + n2 * v);
  if (dot(normal, rd) > 0.0) normal = -normal;
  closestT = triT;
  return true;
}

bool intersectMesh(vec3 ro, vec3 rd, out float t, out vec3 normal) {
  if (u_bvhNodeCount <= 0 || u_triangleCount <= 0) return false;

  vec3 invRd = 1.0 / mix(rd, vec3(1e-20), lessThan(abs(rd), vec3(1e-20)));
  int stack[64];
  int stackPtr = 0;
  stack[stackPtr++] = 0;

  bool hit = false;
  t = 1e20;
  normal = vec3(0.0, 1.0, 0.0);

  for (int iter = 0; iter < 2048; iter++) {
    if (stackPtr <= 0) break;
    int nodeIndex = stack[--stackPtr];
    if (nodeIndex < 0 || nodeIndex >= u_bvhNodeCount) continue;

    vec4 a = fetchPacked(u_bvhNodes, nodeIndex * 2, u_bvhTextureWidth);
    vec4 b = fetchPacked(u_bvhNodes, nodeIndex * 2 + 1, u_bvhTextureWidth);
    if (!intersectAABB(ro, invRd, a.xyz, b.xyz, t)) continue;

    int leftOrStart = int(a.w);
    int rightOrCount = int(b.w);

    if (leftOrStart < 0) {
      int start = -leftOrStart - 1;
      for (int i = 0; i < 8; i++) {
        if (i >= rightOrCount) break;
        vec3 triNormal;
        if (intersectTriangle(start + i, ro, rd, t, triNormal)) {
          normal = triNormal;
          hit = true;
        }
      }
    } else {
      if (stackPtr < 63) stack[stackPtr++] = leftOrStart;
      if (stackPtr < 63) stack[stackPtr++] = rightOrCount;
    }
  }

  return hit;
}

bool intersectScene(vec3 ro, vec3 rd, out float t, out vec3 normal) {
  if (u_geometryMode == 1) {
    return intersectMesh(ro, rd, t, normal);
  }
  return intersectSphere(ro, rd, t, normal);
}

// Tangent frame
void buildTangentFrame(vec3 N, vec3 P, out vec3 T, out vec3 B) {
  if (u_geometryMode == 0) {
    float xzLen2 = dot(N.xz, N.xz);
    T = xzLen2 > 1e-8 ? normalize(vec3(N.z, 0.0, -N.x)) : vec3(1.0, 0.0, 0.0);
    B = cross(N, T);
    return;
  }

  vec3 axis = abs(N.y) < 0.95 ? vec3(0, 1, 0) : vec3(1, 0, 0);
  vec3 radial = P - N * dot(P, N);
  T = dot(radial, radial) > 1e-8 ? normalize(radial) : normalize(cross(axis, N));
  B = cross(N, T);
}

// Environment map sampling
vec3 sampleEnvmap(vec3 dir) {
  float rotatedPhi = atan(dir.x, dir.z) + u_envmapRotation;
  float u = rotatedPhi * INV_TWO_PI;
  if (u < 0.0) u += 1.0;
  if (u > 1.0) u -= 1.0;
  float v = acos(clamp(dir.y, -1.0, 1.0)) * INV_PI;
  if (u_hasHDR == 1 && u_lightMode == 1) {
    return texture(u_envmap, vec2(u, v)).rgb;
  }
  // Procedural sky
  float sky = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 skyColor = mix(vec3(0.4, 0.55, 1.0), vec3(0.8, 0.9, 1.0), sky);
  vec3 sunDir = normalize(u_lightDir);
  float sunDot = max(0.0, dot(dir, sunDir));
  float sun = pow(sunDot, 128.0) * 50.0;
  return skyColor + vec3(sun);
}

float envmapPdf(vec3 dir) {
  if (u_hasHDR == 0) return 1.0 / (4.0 * PI);
  // Look up luminance at this direction and compute PDF
  // pdf = lum * W * H / (totalWeight * 2*PI^2)  [sinTheta cancels out]
  float rotatedPhi = atan(dir.x, dir.z) + u_envmapRotation;
  float u = rotatedPhi * INV_TWO_PI;
  if (u < 0.0) u += 1.0;
  if (u > 1.0) u -= 1.0;
  float v = acos(clamp(dir.y, -1.0, 1.0)) * INV_PI;
  vec3 envColor = texture(u_envmap, vec2(u, v)).rgb;
  float lum = dot(envColor, vec3(0.2126, 0.7152, 0.0722));
  float W = u_envmapSize.x, H = u_envmapSize.y;
  return max(0.0, lum) * W * H / max(1e-10, u_envmapTotalWeight * TWO_PI * PI);
}

// Binary search in CDF texture (1D stored as texture)
float binarySearchCDF1D(sampler2D cdfTex, int texWidth, float u, int row) {
  int lo = 0, hi = texWidth - 1;
  while (lo < hi) {
    int mid = (lo + hi) / 2;
    float val = texelFetch(cdfTex, ivec2(mid, row), 0).r;
    if (val < u) lo = mid + 1;
    else hi = mid;
  }
  return (float(lo) + 0.5) / float(texWidth);
}

float binarySearchMarginal(sampler2D cdfTex, int texHeight, float u) {
  int lo = 0, hi = texHeight - 1;
  while (lo < hi) {
    int mid = (lo + hi) / 2;
    float val = texelFetch(cdfTex, ivec2(mid, 0), 0).r;
    if (val < u) lo = mid + 1;
    else hi = mid;
  }
  return float(lo);
}

vec3 sampleEnvmapIS(out float pdf) {
  if (u_hasHDR == 0) {
    // Uniform sphere sampling for procedural sky
    float u1 = rand(), u2 = rand();
    float cosTheta = 1.0 - 2.0 * u1;
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
    float phi = TWO_PI * u2;
    vec3 dir = vec3(sinTheta * cos(phi), cosTheta, sinTheta * sin(phi));
    pdf = 1.0 / (4.0 * PI);
    return dir;
  }

  int W = int(u_envmapSize.x);
  int H = int(u_envmapSize.y);

  float u1 = rand(), u2 = rand();

  // Sample row from marginal CDF
  float rowF = binarySearchMarginal(u_marginalCDF, H, u1);
  int row = int(clamp(rowF, 0.0, float(H - 1)));
  float v = (rowF + 0.5) / float(H);
  float theta = v * PI;
  float sinTheta = sin(theta);

  // Sample column from conditional CDF
  float colU = binarySearchCDF1D(u_conditionalCDF, W, u2, row);
  float phi = colU * TWO_PI;

  // Compute direction (rotated)
  phi -= u_envmapRotation;
  vec3 dir = vec3(sin(theta) * sin(phi), cos(theta), sin(theta) * cos(phi));

  // PDF in solid angle: pdf = lum * W * H / (totalWeight * 2*PI^2)
  // sinTheta cancels because the CDF weight already includes sinTheta
  vec3 envColor = (u_hasHDR == 1) ? texture(u_envmap, vec2(colU, v)).rgb : vec3(0.5);
  float lum = dot(envColor, vec3(0.2126, 0.7152, 0.0722));
  pdf = max(1e-10, lum) * float(W) * float(H) / max(1e-10, u_envmapTotalWeight * TWO_PI * PI);

  return normalize(dir);
}

// MIS weight (balance heuristic)
float misWeight(float pdfA, float pdfB) {
  return pdfA / (pdfA + pdfB + 1e-10);
}

// BRDF code injected here:
${brdfData.shaderCode}

// IS functions (importance sampling):
${
  brdfData.isFuncCode ||
  `
// Fallback: cosine-weighted hemisphere sampling
vec3 sampleBRDF(float u1, float u2, vec3 N, vec3 T, vec3 B, vec3 wo, out float pdf) {
  float r = sqrt(u1);
  float phi = TWO_PI * u2;
  vec3 wi = normalize(r*cos(phi)*T + r*sin(phi)*B + sqrt(max(0.0,1.0-u1))*N);
  pdf = max(0.001, dot(N, wi)) / PI;
  return wi;
}
float pdfBRDF(vec3 wi, vec3 wo, vec3 N, vec3 T, vec3 B) {
  return max(0.0, dot(N, wi)) / PI;
}
`
}

void main() {
  vec2 pixel = v_uv * u_resolution;
  seedRNG(uvec2(uint(pixel.x), uint(pixel.y)), uint(u_frameIndex));

  vec4 prev = texture(u_prevAccum, v_uv);
  vec3 accumColor = prev.rgb;
  float accumCount = prev.a;

  for (int s = 0; s < u_samplesPerPass; s++) {
    // Jittered ray direction
    vec2 jitter = vec2(rand(), rand()) - 0.5;
    vec2 ndc = (pixel + jitter) / u_resolution * 2.0 - 1.0;
    ndc.x *= u_resolution.x / u_resolution.y;

    vec3 rayDir = normalize(u_camRot * vec3(ndc * u_tanHalfFov, -1.0));
    vec3 bgRayDir = normalize(u_camRot * vec3(ndc * u_tanHalfFov * u_backgroundFovScale, -1.0));
    vec3 rayOri = u_camPos;

    float t;
    vec3 N;
    if (!intersectScene(rayOri, rayDir, t, N)) {
      // Miss: sample background
      vec3 bg = sampleEnvmap(bgRayDir);
      accumColor += bg;
      accumCount += 1.0;
      continue;
    }

    vec3 hitPos = rayOri + rayDir * t;
    vec3 V = -rayDir;
    vec3 T, B;
    buildTangentFrame(N, hitPos, T, B);

    vec3 contrib = vec3(0.0);

    if (u_lightMode == 0) {
      // Point light (direct illumination)
      vec3 L = normalize(u_lightDir);
      float NdotL = max(0.0, dot(N, L));
      if (NdotL > 0.0) {
        vec3 brdfVal = BRDF(L, V, N, T, B);
        contrib = brdfVal * u_lightColor * NdotL;
      }
    } else {
      // Envmap: MIS between BRDF sampling and envmap IS sampling
      float misRatio = 0.5;

      if (rand() < misRatio) {
        // BRDF importance sampling
        float u1 = rand(), u2 = rand();
        float brdfPdf;
        vec3 L = sampleBRDF(u1, u2, N, T, B, V, brdfPdf);

        float NdotL = dot(N, L);
        if (NdotL > 0.0 && brdfPdf > 1e-6) {
          vec3 brdfVal = BRDF(L, V, N, T, B);
          vec3 envColor = sampleEnvmap(L);
          float envPdf = envmapPdf(L);
          float w = misWeight(brdfPdf * misRatio, envPdf * (1.0 - misRatio));
          contrib = brdfVal * envColor * NdotL * w / (brdfPdf * misRatio + 1e-10);
        }
      } else {
        // Envmap importance sampling
        float envPdf;
        vec3 L = sampleEnvmapIS(envPdf);

        float NdotL = dot(N, L);
        if (NdotL > 0.0 && envPdf > 1e-6) {
          vec3 brdfVal = BRDF(L, V, N, T, B);
          vec3 envColor = sampleEnvmap(L);
          float brdfPdf = pdfBRDF(L, V, N, T, B);
          float w = misWeight(envPdf * (1.0 - misRatio), brdfPdf * misRatio);
          contrib = brdfVal * envColor * NdotL * w / (envPdf * (1.0 - misRatio) + 1e-10);
        }
      }
    }

    // Clamp fireflies
    float lum = dot(contrib, vec3(0.2126, 0.7152, 0.0722));
    if (lum > 100.0) contrib *= 100.0 / lum;

    accumColor += contrib;
    accumCount += 1.0;
  }

  fragColor = vec4(accumColor, accumCount);
}`;

    try {
      const prog = this._linkProgram(
        this._compileShader(gl.VERTEX_SHADER, vsSrc),
        this._compileShader(gl.FRAGMENT_SHADER, fsSrc),
      );
      if (this.programs.render) gl.deleteProgram(this.programs.render);
      this.programs.render = prog;
      return true;
    } catch (e) {
      console.error("Failed to build render program:", e);
      return false;
    }
  }

  loadBRDF(brdfData) {
    this.brdfData = brdfData;

    // Initialize parameter values from defaults
    this.brdfParams = {};
    for (const p of brdfData.parameters) {
      this.brdfParams[p.name] = p.default;
    }

    const ok = this._buildRenderProgram(brdfData);
    this.resetAccumulation();
    return ok;
  }

  _uploadFloatDataTexture(existingTexture, data, texelCount) {
    const gl = this.gl;
    const width = Math.min(this.maxTextureSize, 4096, Math.max(1, texelCount));
    const height = Math.max(1, Math.ceil(texelCount / width));
    const padded = new Float32Array(width * height * 4);
    padded.set(data);

    if (existingTexture) gl.deleteTexture(existingTexture);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      width,
      height,
      0,
      gl.RGBA,
      gl.FLOAT,
      padded,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return { texture: tex, width, height };
  }

  loadModel(modelData) {
    this.modelData = modelData;
    this.triangleCount = modelData.triangleCount;
    this.bvhNodeCount = modelData.nodeCount;

    const triUpload = this._uploadFloatDataTexture(
      this.textures.triangles,
      modelData.triangleData,
      this.triangleCount * 6,
    );
    this.textures.triangles = triUpload.texture;
    this.triangleTextureWidth = triUpload.width;

    const nodeUpload = this._uploadFloatDataTexture(
      this.textures.bvhNodes,
      modelData.nodeData,
      this.bvhNodeCount * 2,
    );
    this.textures.bvhNodes = nodeUpload.texture;
    this.bvhTextureWidth = nodeUpload.width;

    this.geometryMode = 1;
    this.resetAccumulation();
  }

  clearModel() {
    const gl = this.gl;
    if (!gl) return;

    if (this.textures.triangles) {
      gl.deleteTexture(this.textures.triangles);
      this.textures.triangles = null;
    }
    if (this.textures.bvhNodes) {
      gl.deleteTexture(this.textures.bvhNodes);
      this.textures.bvhNodes = null;
    }

    this.geometryMode = 0;
    this.triangleCount = 0;
    this.bvhNodeCount = 0;
    this.triangleTextureWidth = 1;
    this.bvhTextureWidth = 1;
    this.modelData = null;
    this.resetAccumulation();
  }

  buildEnvmapCDF(data, width, height) {
    const marginalCDF = new Float32Array(height);
    const conditionalCDF = new Float32Array(width * height);
    let totalWeight = 0;

    for (let j = 0; j < height; j++) {
      const sinTheta = Math.sin((Math.PI * (j + 0.5)) / height);
      let rowSum = 0;
      for (let i = 0; i < width; i++) {
        const idx = (j * width + i) * 3;
        const lum =
          0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
        rowSum += Math.max(0, lum) * sinTheta;
        conditionalCDF[j * width + i] = rowSum;
      }
      if (rowSum > 0) {
        for (let i = 0; i < width; i++) conditionalCDF[j * width + i] /= rowSum;
      } else {
        for (let i = 0; i < width; i++)
          conditionalCDF[j * width + i] = (i + 1) / width;
      }
      totalWeight += rowSum;
      marginalCDF[j] = totalWeight;
    }
    if (totalWeight > 0) {
      for (let j = 0; j < height; j++) marginalCDF[j] /= totalWeight;
    }
    return { marginalCDF, conditionalCDF, totalWeight };
  }

  async loadEnvmap(exrData) {
    const gl = this.gl;
    const { data, width, height } = exrData;
    const envmapPixels = new Float32Array(width * height * 4);

    for (let src = 0, dst = 0; src < data.length; src += 3, dst += 4) {
      envmapPixels[dst] = data[src];
      envmapPixels[dst + 1] = data[src + 1];
      envmapPixels[dst + 2] = data[src + 2];
      envmapPixels[dst + 3] = 1.0;
    }

    this.envmapWidth = width;
    this.envmapHeight = height;

    // Upload envmap texture
    if (this.textures.envmap) gl.deleteTexture(this.textures.envmap);
    const envTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, envTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      width,
      height,
      0,
      gl.RGBA,
      gl.FLOAT,
      envmapPixels,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      this.floatLinearSupported ? gl.LINEAR : gl.NEAREST,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      this.floatLinearSupported ? gl.LINEAR : gl.NEAREST,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.envmap = envTex;

    // Build CDF
    const { marginalCDF, conditionalCDF, totalWeight } = this.buildEnvmapCDF(
      data,
      width,
      height,
    );
    this.envmapTotalWeight = totalWeight;

    // Upload marginal CDF (1D stored as width=height, height=1)
    if (this.textures.marginalCDF) gl.deleteTexture(this.textures.marginalCDF);
    const margTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, margTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      height,
      1,
      0,
      gl.RED,
      gl.FLOAT,
      marginalCDF,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.marginalCDF = margTex;

    // Upload conditional CDF (width x height)
    if (this.textures.conditionalCDF)
      gl.deleteTexture(this.textures.conditionalCDF);
    const condTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, condTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      width,
      height,
      0,
      gl.RED,
      gl.FLOAT,
      conditionalCDF,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.conditionalCDF = condTex;

    this.hasHDR = 1;
    this.resetAccumulation();
    console.log(
      `Envmap loaded: ${width}x${height}, totalWeight=${totalWeight.toFixed(4)}`,
    );
  }

  setMode(mode) {
    this.lightMode = mode === "envmap" ? 1 : 0;
    this.resetAccumulation();
  }

  setLightDir(theta, phi) {
    this.lightTheta = theta;
    this.lightPhi = phi;
    this.resetAccumulation();
  }

  setEnvmapRotation(angle) {
    this.envmapRotation = angle;
    this.resetAccumulation();
  }

  setExposure(val) {
    this.exposure = val;
    // Exposure doesn't need accumulation reset (only affects display)
  }

  setParameter(name, value) {
    this.brdfParams[name] = value;
    this.resetAccumulation();
  }

  resetParameters() {
    if (!this.brdfData) return;

    for (const param of this.brdfData.parameters) {
      this.brdfParams[param.name] = param.default;
    }

    this.resetAccumulation();
  }

  setMaxSamples(value) {
    const nextValue = Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : 0;
    this.maxSamples = nextValue;
    if (this.onUpdate) this.onUpdate(this.sampleCount);
  }

  setCameraOrbit(theta, phi, dist) {
    this.camTheta = theta;
    this.camPhi = phi;
    this.camDist = dist;
    this.resetAccumulation();
  }

  clearEnvmap() {
    const gl = this.gl;
    if (!gl) return;

    if (this.textures.envmap) {
      gl.deleteTexture(this.textures.envmap);
      this.textures.envmap = null;
    }
    if (this.textures.marginalCDF) {
      gl.deleteTexture(this.textures.marginalCDF);
      this.textures.marginalCDF = null;
    }
    if (this.textures.conditionalCDF) {
      gl.deleteTexture(this.textures.conditionalCDF);
      this.textures.conditionalCDF = null;
    }

    this.hasHDR = 0;
    this.envmapWidth = 0;
    this.envmapHeight = 0;
    this.envmapTotalWeight = 1.0;
    this.resetAccumulation();
  }

  resetAccumulation() {
    const gl = this.gl;
    if (!gl) return;
    this.sampleCount = 0;
    this.frameIndex = 0;
    this.currentFBO = 0;

    // Clear both accumulation textures
    for (let i = 0; i < 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  getSampleCount() {
    return this.sampleCount;
  }

  _getCameraMatrix() {
    const sinT = Math.sin(this.camTheta);
    const cosT = Math.cos(this.camTheta);
    const sinP = Math.sin(this.camPhi);
    const cosP = Math.cos(this.camPhi);

    // Camera position on sphere
    const cx = this.camDist * sinT * sinP;
    const cy = this.camDist * cosT;
    const cz = this.camDist * sinT * cosP;

    // Look-at matrix
    const forward = [
      -cx / this.camDist,
      -cy / this.camDist,
      -cz / this.camDist,
    ];
    const worldUp = [0, 1, 0];

    let right = [
      forward[1] * worldUp[2] - forward[2] * worldUp[1],
      forward[2] * worldUp[0] - forward[0] * worldUp[2],
      forward[0] * worldUp[1] - forward[1] * worldUp[0],
    ];
    const rLen = Math.sqrt(right[0] ** 2 + right[1] ** 2 + right[2] ** 2);
    right = right.map((v) => v / rLen);

    const up = [
      right[1] * forward[2] - right[2] * forward[1],
      right[2] * forward[0] - right[0] * forward[2],
      right[0] * forward[1] - right[1] * forward[0],
    ];

    // Column-major for WebGL
    return {
      pos: [cx, cy, cz],
      rot: new Float32Array([
        right[0],
        right[1],
        right[2],
        up[0],
        up[1],
        up[2],
        -forward[0],
        -forward[1],
        -forward[2],
      ]),
    };
  }

  _renderFrame() {
    const gl = this.gl;
    if (!gl || !this.programs.render || !this.brdfData) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    const samplesPerPass = Math.min(
      4,
      Math.max(1, Math.floor(16 / ((w * h) / (512 * 512)))),
    );
    const remainingSamples =
      this.maxSamples > 0
        ? Math.max(0, this.maxSamples - this.sampleCount)
        : samplesPerPass;
    const boundedSamplesPerPass =
      this.maxSamples > 0
        ? Math.min(samplesPerPass, remainingSamples)
        : samplesPerPass;

    const readFBO = this.currentFBO;
    const writeFBO = 1 - this.currentFBO;

    // --- Accumulation pass ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeFBO]);
    gl.viewport(0, 0, w, h);

    const prog = this.programs.render;
    gl.useProgram(prog);
    gl.bindVertexArray(this.quadVAO);

    // Bind previous accumulation
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.accum[readFBO]);
    gl.uniform1i(gl.getUniformLocation(prog, "u_prevAccum"), 0);

    gl.uniform1i(
      gl.getUniformLocation(prog, "u_sampleCount"),
      this.sampleCount,
    );
    gl.uniform1i(
      gl.getUniformLocation(prog, "u_samplesPerPass"),
      boundedSamplesPerPass,
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_frameIndex"), this.frameIndex);
    gl.uniform1i(gl.getUniformLocation(prog, "u_lightMode"), this.lightMode);

    // Light direction from spherical coords
    const lx = Math.sin(this.lightTheta) * Math.sin(this.lightPhi);
    const ly = Math.cos(this.lightTheta);
    const lz = Math.sin(this.lightTheta) * Math.cos(this.lightPhi);
    gl.uniform3f(gl.getUniformLocation(prog, "u_lightDir"), lx, ly, lz);
    gl.uniform3f(gl.getUniformLocation(prog, "u_lightColor"), 10.0, 10.0, 10.0);

    // Camera
    const cam = this._getCameraMatrix();
    gl.uniform3fv(gl.getUniformLocation(prog, "u_camPos"), cam.pos);
    gl.uniformMatrix3fv(
      gl.getUniformLocation(prog, "u_camRot"),
      false,
      cam.rot,
    );
    gl.uniform1f(gl.getUniformLocation(prog, "u_tanHalfFov"), Math.tan(0.35));
    gl.uniform1f(
      gl.getUniformLocation(prog, "u_backgroundFovScale"),
      this.backgroundFovScale,
    );
    gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), w, h);

    // Envmap
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.textures.envmap || this._getDummyTexture(),
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_envmap"), 1);
    gl.uniform2f(
      gl.getUniformLocation(prog, "u_envmapSize"),
      this.envmapWidth || 1,
      this.envmapHeight || 1,
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_hasHDR"), this.hasHDR);
    gl.uniform1f(
      gl.getUniformLocation(prog, "u_envmapRotation"),
      this.envmapRotation,
    );
    gl.uniform1f(
      gl.getUniformLocation(prog, "u_envmapTotalWeight"),
      this.envmapTotalWeight,
    );

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.textures.marginalCDF || this._getDummyTexture(),
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_marginalCDF"), 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.textures.conditionalCDF || this._getDummyTexture(),
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_conditionalCDF"), 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.textures.triangles || this._getDummyTexture(),
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_triangles"), 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.textures.bvhNodes || this._getDummyTexture(),
    );
    gl.uniform1i(gl.getUniformLocation(prog, "u_bvhNodes"), 5);

    gl.uniform1i(
      gl.getUniformLocation(prog, "u_geometryMode"),
      this.geometryMode,
    );
    gl.uniform1i(
      gl.getUniformLocation(prog, "u_triangleCount"),
      this.triangleCount,
    );
    gl.uniform1i(
      gl.getUniformLocation(prog, "u_bvhNodeCount"),
      this.bvhNodeCount,
    );
    gl.uniform1i(
      gl.getUniformLocation(prog, "u_triangleTextureWidth"),
      this.triangleTextureWidth,
    );
    gl.uniform1i(
      gl.getUniformLocation(prog, "u_bvhTextureWidth"),
      this.bvhTextureWidth,
    );

    // BRDF parameters
    for (const p of this.brdfData.parameters) {
      const val =
        this.brdfParams[p.name] !== undefined
          ? this.brdfParams[p.name]
          : p.default;
      const loc = gl.getUniformLocation(prog, p.name);
      if (loc === null) continue;
      if (p.type === "bool") {
        gl.uniform1i(loc, val ? 1 : 0);
      } else if (p.type === "float") {
        gl.uniform1f(loc, val);
      } else if (p.type === "int") {
        gl.uniform1i(loc, val | 0);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.sampleCount += boundedSamplesPerPass;
    this.frameIndex++;
    this.currentFBO = writeFBO;

    // --- Display pass ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);

    const dispProg = this.programs.display;
    gl.useProgram(dispProg);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.accum[writeFBO]);
    gl.uniform1i(gl.getUniformLocation(dispProg, "u_accum"), 0);
    gl.uniform1f(gl.getUniformLocation(dispProg, "u_exposure"), this.exposure);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (this.onUpdate) this.onUpdate(this.sampleCount);
  }

  _getDummyTexture() {
    if (!this._dummyTexture) {
      const gl = this.gl;
      this._dummyTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._dummyTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([128, 128, 128, 255]),
      );
    }
    return this._dummyTexture;
  }

  startRendering() {
    if (this.rendering) return;
    this.rendering = true;
    const loop = () => {
      if (!this.rendering) return;
      this._renderFrame();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stopRendering() {
    this.rendering = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  dispose() {
    this.stopRendering();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    const gl = this.gl;
    if (!gl) return;

    this.fbos.forEach((fbo) => {
      if (fbo) gl.deleteFramebuffer(fbo);
    });

    Object.values(this.textures).flat().forEach((texture) => {
      if (texture) gl.deleteTexture(texture);
    });
    if (this._dummyTexture) gl.deleteTexture(this._dummyTexture);

    Object.values(this.programs).forEach((program) => {
      if (program) gl.deleteProgram(program);
    });

    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.clearColor(0.067, 0.067, 0.067, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.flush();

    this.fbos = [null, null];
    this.textures = {
      accum: [null, null],
      envmap: null,
      marginalCDF: null,
      conditionalCDF: null,
      triangles: null,
      bvhNodes: null,
    };
    this.programs = {};
    this._dummyTexture = null;
    this.quadVAO = null;
    this.quadBuffer = null;
    this.modelData = null;
    this.brdfData = null;
    this.onUpdate = null;
    this.gl = null;
  }
}
