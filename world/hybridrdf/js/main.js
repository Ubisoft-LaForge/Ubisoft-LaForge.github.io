// Main entry point for BRDF Viewer
import { BRDFRenderer } from './renderer.js';
import { BRDFParser } from './brdf-parser.js';
import { UIControls } from './ui-controls.js';
import { loadEXR } from './exr-loader.js';
import { DEFAULT_BRDF, DEFAULT_ENVMAP, DEFAULT_MODEL } from './assets.js';
import { loadOBJModel } from './model-loader.js';

let renderer = null;
let ui = null;
let currentBRDF = null;
let viewerState = 'stopped';
const ORBIT_SPEED = 0.01;

// Camera orbit state
const orbitState = {
  dragging: false,
  lastX: 0,
  lastY: 0,
  theta: 1.1,
  phi: 0.5,
  dist: 3.6,
};

async function loadBRDFFile(path, sourceText, displayName) {
  const activeRenderer = renderer;
  if (!activeRenderer) return;

  try {
    let source = sourceText;
    if (!source) {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
      source = await resp.text();
    }

    const brdfData = BRDFParser.parse(source);
    if (renderer !== activeRenderer) return;
    brdfData.name = displayName || path;
    currentBRDF = brdfData;

    const ok = activeRenderer.loadBRDF(brdfData);
    if (!ok) {
      showStatus('BRDF shader compilation failed. Check console for errors.', 'error');
      return;
    }

    // Update UI parameters
    if (ui) {
      ui.updateBRDFParams(brdfData.parameters, renderer.brdfParams);
    }

    showStatus(`Loaded: ${brdfData.name}`, 'success');
  } catch (e) {
    console.error('Failed to load BRDF:', e);
    showStatus('Failed to load BRDF: ' + e.message, 'error');
  }
}

async function loadEnvmapFile(path, arrayBuffer, displayName) {
  const activeRenderer = renderer;
  if (!activeRenderer) return;
  const loadingEl = document.getElementById('loading-overlay');

  try {
    if (loadingEl) {
      loadingEl.style.display = 'flex';
      loadingEl.querySelector('.loading-text').textContent = 'Loading environment map...';
    }

    let data;
    if (arrayBuffer) {
      data = await loadEXR(arrayBuffer);
    } else if (path) {
      data = await loadEXR(path);
    } else {
      // Use procedural sky
      if (renderer !== activeRenderer) return;
      activeRenderer.clearEnvmap();
      if (loadingEl) loadingEl.style.display = 'none';
      showStatus('Using procedural sky', 'success');
      return;
    }

    if (renderer !== activeRenderer) return;
    await activeRenderer.loadEnvmap(data);
    showStatus(`Environment map loaded: ${displayName || path || 'custom'}`, 'success');
  } catch (e) {
    console.error('Failed to load envmap:', e);
    showStatus('Failed to load envmap: ' + e.message, 'error');
  } finally {
    if (renderer === activeRenderer && loadingEl) loadingEl.style.display = 'none';
  }
}

async function loadModelFile(path, sourceText, displayName) {
  const activeRenderer = renderer;
  if (!activeRenderer) return;
  const loadingEl = document.getElementById('loading-overlay');

  try {
    if (loadingEl) {
      loadingEl.style.display = 'flex';
      loadingEl.querySelector('.loading-text').textContent = path || sourceText
        ? 'Loading geometry...'
        : 'Switching geometry...';
    }

    if (!path && !sourceText) {
      if (renderer !== activeRenderer) return;
      activeRenderer.clearModel();
      showStatus('Geometry: Analytic Sphere', 'success');
      return;
    }

    const modelData = await loadOBJModel(path, sourceText, displayName);
    if (renderer !== activeRenderer) return;
    activeRenderer.loadModel(modelData);
    showStatus(
      `Geometry loaded: ${modelData.name} (${modelData.triangleCount.toLocaleString()} triangles)`,
      'success',
    );
  } catch (e) {
    console.error('Failed to load model:', e);
    showStatus('Failed to load model: ' + e.message, 'error');
  } finally {
    if (renderer === activeRenderer && loadingEl) loadingEl.style.display = 'none';
  }
}

function showStatus(msg, type) {
  const el = document.getElementById('status-message');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-message ' + (type || '');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

function setupOrbitControls(canvas) {
  canvas.addEventListener('mousedown', (e) => {
    if (renderer && viewerState === 'running' && e.button === 0) {
      orbitState.dragging = true;
      orbitState.lastX = e.clientX;
      orbitState.lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!renderer || !orbitState.dragging) return;
    const dx = e.clientX - orbitState.lastX;
    const dy = e.clientY - orbitState.lastY;
    orbitState.lastX = e.clientX;
    orbitState.lastY = e.clientY;

    orbitState.phi -= dx * ORBIT_SPEED;
    orbitState.theta = Math.max(0.05, Math.min(Math.PI - 0.05, orbitState.theta - dy * ORBIT_SPEED));

    renderer.setCameraOrbit(orbitState.theta, orbitState.phi, orbitState.dist);
  });

  window.addEventListener('mouseup', () => {
    orbitState.dragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('wheel', (e) => {
    if (!renderer || viewerState !== 'running') return;
    e.preventDefault();
    orbitState.dist = Math.max(1.2, Math.min(6.0, orbitState.dist + e.deltaY * 0.005));
    renderer.setCameraOrbit(orbitState.theta, orbitState.phi, orbitState.dist);
  }, { passive: false });

  // Touch support
  let lastTouchDist = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (!renderer || viewerState !== 'running') return;
    e.preventDefault();
    if (e.touches.length === 1) {
      orbitState.dragging = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      orbitState.dragging = false;
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!renderer || viewerState !== 'running') return;
    e.preventDefault();
    if (e.touches.length === 1 && orbitState.dragging) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      orbitState.phi -= dx * ORBIT_SPEED;
      orbitState.theta = Math.max(0.05, Math.min(Math.PI - 0.05, orbitState.theta - dy * ORBIT_SPEED));
      renderer.setCameraOrbit(orbitState.theta, orbitState.phi, orbitState.dist);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = lastTouchDist - dist;
      lastTouchDist = dist;
      orbitState.dist = Math.max(1.2, Math.min(6.0, orbitState.dist + delta * 0.02));
      renderer.setCameraOrbit(orbitState.theta, orbitState.phi, orbitState.dist);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    orbitState.dragging = false;
  });

  canvas.style.cursor = 'grab';
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (!renderer || viewerState !== 'running') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    switch (e.key.toUpperCase()) {
      case 'R':
        renderer.resetAccumulation();
        showStatus('Accumulation reset', 'info');
        break;
      case 'P': {
        const isPoint = renderer.lightMode === 0;
        renderer.setMode(isPoint ? 'envmap' : 'point');
        // Update UI buttons
        const btns = document.querySelectorAll('.mode-btn');
        btns.forEach((btn, i) => {
          btn.classList.toggle('active', i === (isPoint ? 1 : 0));
        });
        const pointControls = document.getElementById('point-light-controls');
        const envControls = document.getElementById('envmap-controls');
        if (pointControls) pointControls.style.display = isPoint ? 'none' : '';
        if (envControls) envControls.style.display = isPoint ? '' : 'none';
        showStatus(`Mode: ${isPoint ? 'Environment Map' : 'Point Light'}`, 'info');
        break;
      }
    }
  });
}

function setViewerOverlay(message, { loading = false, visible = true } = {}) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;

  overlay.style.display = visible ? 'flex' : 'none';
  const spinner = overlay.querySelector('.loading-spinner');
  const text = overlay.querySelector('.loading-text');
  if (spinner) spinner.hidden = !loading;
  if (text) {
    text.textContent = message;
    text.style.color = '';
  }
}

function setToggleButton(label, { disabled = false, running = false } = {}) {
  const button = document.getElementById('viewer-toggle');
  if (!button) return;
  button.textContent = label;
  button.disabled = disabled;
  button.setAttribute('aria-pressed', running ? 'true' : 'false');
}

function setControlsIdle(message = 'Start the viewer to show its controls.') {
  const panel = document.getElementById('controls-panel');
  if (!panel) return;
  panel.innerHTML = '';
  const text = document.createElement('p');
  text.className = 'viewer-idle-message';
  text.textContent = message;
  panel.appendChild(text);
}

async function startViewer() {
  if (viewerState !== 'stopped') return;

  const canvas = document.getElementById('brdf-canvas');
  if (!canvas) return;

  viewerState = 'starting';
  setToggleButton('Starting…', { disabled: true });
  setViewerOverlay('Initializing WebGL2…', { loading: true });

  try {
    renderer = new BRDFRenderer(canvas);
    await renderer.init();

    renderer.onUpdate = (count) => {
      if (ui) ui.updateSampleCount(count);
    };
    renderer.setCameraOrbit(orbitState.theta, orbitState.phi, orbitState.dist);

    ui = new UIControls(renderer, {
      onBRDFChange: (path, sourceText, displayName) => {
        loadBRDFFile(path, sourceText, displayName);
      },
      onEnvmapChange: (path, arrayBuffer, displayName) => {
        loadEnvmapFile(path, arrayBuffer, displayName);
      },
      onModelChange: (path, sourceText, displayName) => {
        loadModelFile(path, sourceText, displayName);
      },
    });
    ui.init();

    setViewerOverlay('Loading BRDF…', { loading: true });
    await loadBRDFFile(DEFAULT_BRDF.url, null, DEFAULT_BRDF.label);

    setViewerOverlay('Loading geometry…', { loading: true });
    await loadModelFile(DEFAULT_MODEL.url, null, DEFAULT_MODEL.label);

    setViewerOverlay('Loading environment map…', { loading: true });
    await loadEnvmapFile(DEFAULT_ENVMAP.url, null, DEFAULT_ENVMAP.label);

    viewerState = 'running';
    renderer.startRendering();
    setViewerOverlay('', { visible: false });
    setToggleButton('Stop viewer', { running: true });
    showStatus('Ready. Drag to orbit, scroll to zoom.', 'success');
  } catch (e) {
    console.error('Initialization failed:', e);
    if (renderer) renderer.dispose();
    renderer = null;
    ui = null;
    currentBRDF = null;
    viewerState = 'stopped';
    setControlsIdle('The viewer failed to start. Try again or check the browser console.');
    setViewerOverlay('Error: ' + e.message);
    setToggleButton('Start viewer');
    showStatus('Failed to initialize: ' + e.message, 'error');
  }
}

function stopViewer() {
  if (viewerState !== 'running') return;

  viewerState = 'stopped';
  orbitState.dragging = false;
  if (renderer) renderer.dispose();
  renderer = null;
  ui = null;
  currentBRDF = null;

  setControlsIdle();
  setViewerOverlay('Viewer stopped. Start it to load the interactive demo.');
  setToggleButton('Start viewer');
}

function main() {
  const canvas = document.getElementById('brdf-canvas');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  setupOrbitControls(canvas);
  setupKeyboardShortcuts();

  const toggle = document.getElementById('viewer-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (viewerState === 'running') stopViewer();
      else startViewer();
    });
  }

  window.addEventListener('pagehide', () => {
    if (viewerState === 'running') {
      stopViewer();
    } else if (renderer) {
      renderer.dispose();
      renderer = null;
      ui = null;
      viewerState = 'stopped';
    }
  }, { once: true });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
