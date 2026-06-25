const BVH_LEAF_SIZE = 4;

function resolveOBJIndex(value, length) {
  if (!Number.isFinite(value) || value === 0) return -1;
  return value > 0 ? value - 1 : length + value;
}

function parseFaceVertex(token, vertexCount, normalCount) {
  const parts = token.split('/');
  const vertexIndex = resolveOBJIndex(Number.parseInt(parts[0], 10), vertexCount);
  const normalPart = parts.length >= 3 ? parts[2] : '';
  const normalIndex = normalPart
    ? resolveOBJIndex(Number.parseInt(normalPart, 10), normalCount)
    : -1;

  return { vertexIndex, normalIndex };
}

function normalizeVec3(x, y, z) {
  const len = Math.hypot(x, y, z);
  if (len <= 1e-12) return [0, 1, 0];
  return [x / len, y / len, z / len];
}

function computeFlatNormal(ax, ay, az, bx, by, bz, cx, cy, cz) {
  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;
  return normalizeVec3(
    e1y * e2z - e1z * e2y,
    e1z * e2x - e1x * e2z,
    e1x * e2y - e1y * e2x,
  );
}

function sortRange(order, start, end, centroids, axis) {
  const segment = order.slice(start, end);
  segment.sort((a, b) => centroids[a * 3 + axis] - centroids[b * 3 + axis]);

  for (let i = 0; i < segment.length; i++) {
    order[start + i] = segment[i];
  }
}

function buildBVH(triangleBounds, triangleCentroids, triangleCount) {
  const order = Array.from({ length: triangleCount }, (_, index) => index);
  const nodes = [];

  function buildNode(start, end) {
    const nodeIndex = nodes.length;
    const node = {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
      left: 0,
      rightOrCount: 0,
      leaf: false,
    };
    nodes.push(node);

    const centroidMin = [Infinity, Infinity, Infinity];
    const centroidMax = [-Infinity, -Infinity, -Infinity];

    for (let i = start; i < end; i++) {
      const triIndex = order[i];
      for (let axis = 0; axis < 3; axis++) {
        const boundsBase = triIndex * 6;
        const minValue = triangleBounds[boundsBase + axis];
        const maxValue = triangleBounds[boundsBase + 3 + axis];
        const centroidValue = triangleCentroids[triIndex * 3 + axis];

        node.min[axis] = Math.min(node.min[axis], minValue);
        node.max[axis] = Math.max(node.max[axis], maxValue);
        centroidMin[axis] = Math.min(centroidMin[axis], centroidValue);
        centroidMax[axis] = Math.max(centroidMax[axis], centroidValue);
      }
    }

    const count = end - start;
    if (count <= BVH_LEAF_SIZE) {
      node.leaf = true;
      node.left = start;
      node.rightOrCount = count;
      return nodeIndex;
    }

    const extent = [
      centroidMax[0] - centroidMin[0],
      centroidMax[1] - centroidMin[1],
      centroidMax[2] - centroidMin[2],
    ];
    let axis = 0;
    if (extent[1] > extent[axis]) axis = 1;
    if (extent[2] > extent[axis]) axis = 2;

    if (extent[axis] <= 1e-12) {
      node.leaf = true;
      node.left = start;
      node.rightOrCount = count;
      return nodeIndex;
    }

    sortRange(order, start, end, triangleCentroids, axis);

    const mid = start + Math.floor(count / 2);
    const left = buildNode(start, mid);
    const right = buildNode(mid, end);
    node.left = left;
    node.rightOrCount = right;
    return nodeIndex;
  }

  buildNode(0, triangleCount);

  const nodeData = new Float32Array(nodes.length * 8);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const base = i * 8;
    nodeData[base] = node.min[0];
    nodeData[base + 1] = node.min[1];
    nodeData[base + 2] = node.min[2];
    nodeData[base + 3] = node.leaf ? -node.left - 1 : node.left;
    nodeData[base + 4] = node.max[0];
    nodeData[base + 5] = node.max[1];
    nodeData[base + 6] = node.max[2];
    nodeData[base + 7] = node.rightOrCount;
  }

  return { nodeData, nodeCount: nodes.length, order };
}

export function parseOBJModel(source, name = 'OBJ Model') {
  const positions = [];
  const normals = [];
  const faces = [];
  const bboxMin = [Infinity, Infinity, Infinity];
  const bboxMax = [-Infinity, -Infinity, -Infinity];

  const lines = source.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line[0] === '#') continue;

    if (line.startsWith('v ')) {
      const parts = line.split(/\s+/);
      const x = Number.parseFloat(parts[1]);
      const y = Number.parseFloat(parts[2]);
      const z = Number.parseFloat(parts[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

      positions.push(x, y, z);
      bboxMin[0] = Math.min(bboxMin[0], x);
      bboxMin[1] = Math.min(bboxMin[1], y);
      bboxMin[2] = Math.min(bboxMin[2], z);
      bboxMax[0] = Math.max(bboxMax[0], x);
      bboxMax[1] = Math.max(bboxMax[1], y);
      bboxMax[2] = Math.max(bboxMax[2], z);
    } else if (line.startsWith('vn ')) {
      const parts = line.split(/\s+/);
      const n = normalizeVec3(
        Number.parseFloat(parts[1]),
        Number.parseFloat(parts[2]),
        Number.parseFloat(parts[3]),
      );
      normals.push(n[0], n[1], n[2]);
    } else if (line.startsWith('f ')) {
      const tokens = line.slice(2).trim().split(/\s+/);
      if (tokens.length < 3) continue;

      const vertices = tokens.map((token) =>
        parseFaceVertex(token, positions.length / 3, normals.length / 3),
      );

      for (let i = 1; i < vertices.length - 1; i++) {
        const a = vertices[0];
        const b = vertices[i];
        const c = vertices[i + 1];
        if (a.vertexIndex < 0 || b.vertexIndex < 0 || c.vertexIndex < 0) continue;
        faces.push(
          a.vertexIndex,
          b.vertexIndex,
          c.vertexIndex,
          a.normalIndex,
          b.normalIndex,
          c.normalIndex,
        );
      }
    }
  }

  const vertexCount = positions.length / 3;
  const triangleCount = faces.length / 6;
  if (vertexCount === 0 || triangleCount === 0) {
    throw new Error('OBJ file did not contain renderable triangles');
  }

  const center = [
    (bboxMin[0] + bboxMax[0]) * 0.5,
    (bboxMin[1] + bboxMax[1]) * 0.5,
    (bboxMin[2] + bboxMax[2]) * 0.5,
  ];
  const maxExtent = Math.max(
    bboxMax[0] - bboxMin[0],
    bboxMax[1] - bboxMin[1],
    bboxMax[2] - bboxMin[2],
  );
  const scale = maxExtent > 0 ? 1.8 / maxExtent : 1;

  const triangleData = new Float32Array(triangleCount * 24);
  const triangleBounds = new Float32Array(triangleCount * 6);
  const triangleCentroids = new Float32Array(triangleCount * 3);

  function readPosition(index) {
    const base = index * 3;
    return [
      (positions[base] - center[0]) * scale,
      (positions[base + 1] - center[1]) * scale,
      (positions[base + 2] - center[2]) * scale,
    ];
  }

  const generatedNormals = new Float32Array(vertexCount * 3);
  for (let tri = 0; tri < triangleCount; tri++) {
    const faceBase = tri * 6;
    const p0 = readPosition(faces[faceBase]);
    const p1 = readPosition(faces[faceBase + 1]);
    const p2 = readPosition(faces[faceBase + 2]);
    const flatNormal = computeFlatNormal(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
    );

    for (let i = 0; i < 3; i++) {
      const vertexBase = faces[faceBase + i] * 3;
      generatedNormals[vertexBase] += flatNormal[0];
      generatedNormals[vertexBase + 1] += flatNormal[1];
      generatedNormals[vertexBase + 2] += flatNormal[2];
    }
  }

  for (let i = 0; i < vertexCount; i++) {
    const base = i * 3;
    const n = normalizeVec3(generatedNormals[base], generatedNormals[base + 1], generatedNormals[base + 2]);
    generatedNormals[base] = n[0];
    generatedNormals[base + 1] = n[1];
    generatedNormals[base + 2] = n[2];
  }

  function readNormal(index, fallback, vertexIndex) {
    if (index < 0) {
      const base = vertexIndex * 3;
      return normalizeVec3(generatedNormals[base], generatedNormals[base + 1], generatedNormals[base + 2]);
    }
    const base = index * 3;
    return normalizeVec3(normals[base], normals[base + 1], normals[base + 2]);
  }

  for (let tri = 0; tri < triangleCount; tri++) {
    const faceBase = tri * 6;
    const p0 = readPosition(faces[faceBase]);
    const p1 = readPosition(faces[faceBase + 1]);
    const p2 = readPosition(faces[faceBase + 2]);
    const flatNormal = computeFlatNormal(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
    );
    const n0 = readNormal(faces[faceBase + 3], flatNormal, faces[faceBase]);
    const n1 = readNormal(faces[faceBase + 4], flatNormal, faces[faceBase + 1]);
    const n2 = readNormal(faces[faceBase + 5], flatNormal, faces[faceBase + 2]);

    const outBase = tri * 24;
    triangleData.set([p0[0], p0[1], p0[2], 0], outBase);
    triangleData.set([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2], 0], outBase + 4);
    triangleData.set([p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2], 0], outBase + 8);
    triangleData.set([n0[0], n0[1], n0[2], 0], outBase + 12);
    triangleData.set([n1[0], n1[1], n1[2], 0], outBase + 16);
    triangleData.set([n2[0], n2[1], n2[2], 0], outBase + 20);

    const minX = Math.min(p0[0], p1[0], p2[0]);
    const minY = Math.min(p0[1], p1[1], p2[1]);
    const minZ = Math.min(p0[2], p1[2], p2[2]);
    const maxX = Math.max(p0[0], p1[0], p2[0]);
    const maxY = Math.max(p0[1], p1[1], p2[1]);
    const maxZ = Math.max(p0[2], p1[2], p2[2]);

    triangleBounds.set([minX, minY, minZ, maxX, maxY, maxZ], tri * 6);
    triangleCentroids.set([
      (p0[0] + p1[0] + p2[0]) / 3,
      (p0[1] + p1[1] + p2[1]) / 3,
      (p0[2] + p1[2] + p2[2]) / 3,
    ], tri * 3);
  }

  const { nodeData, nodeCount, order } = buildBVH(triangleBounds, triangleCentroids, triangleCount);
  const reorderedTriangleData = new Float32Array(triangleData.length);
  for (let dst = 0; dst < triangleCount; dst++) {
    const srcBase = order[dst] * 24;
    reorderedTriangleData.set(triangleData.subarray(srcBase, srcBase + 24), dst * 24);
  }

  return {
    name,
    triangleCount,
    nodeCount,
    triangleData: reorderedTriangleData,
    nodeData,
  };
}

export async function loadOBJModel(path, sourceText, displayName) {
  let source = sourceText;
  if (!source) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
    source = await resp.text();
  }

  return parseOBJModel(source, displayName || path);
}
