import {
  BRDF_GROUPS,
  BRDF_PRESETS,
  DEFAULT_BRDF,
  DEFAULT_ENVMAP,
  DEFAULT_MODEL,
  ENVMAP_PRESETS,
  MODEL_PRESETS,
} from './assets.js';

// UI Controls for BRDF Viewer

export class UIControls {
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.options = options;
    this.paramSliders = {};
    this.onBRDFChange = options.onBRDFChange || null;
    this.onEnvmapChange = options.onEnvmapChange || null;
    this.onModelChange = options.onModelChange || null;
  }

  init() {
    this._buildUI();
  }

  _createCollapsibleSection(title, expanded = true) {
    const section = document.createElement('div');
    section.className = 'control-section' + (expanded ? '' : ' collapsed');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'section-toggle';
    header.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    const heading = document.createElement('h4');
    heading.className = 'section-title';
    heading.textContent = title;
    header.appendChild(heading);

    const chevron = document.createElement('span');
    chevron.className = 'section-chevron';
    chevron.textContent = '▾';
    header.appendChild(chevron);

    const body = document.createElement('div');
    body.className = 'control-section-body';

    header.addEventListener('click', () => {
      const nextExpanded = section.classList.contains('collapsed');
      section.classList.toggle('collapsed', !nextExpanded);
      header.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    });

    section.appendChild(header);
    section.appendChild(body);

    return { section, body };
  }

  _buildUI() {
    const panel = document.getElementById('controls-panel');
    if (!panel) return;

    panel.innerHTML = '';

    // Dataset shader selector
    this._buildSection(panel, 'Dataset Choice', (section) => {
      const row = this._row();
      const datasetLabel = document.createElement('label');
      datasetLabel.className = 'control-label';
      datasetLabel.htmlFor = 'brdf-dataset-select';
      datasetLabel.textContent = 'Dataset:';
      row.appendChild(datasetLabel);

      const datasetSel = document.createElement('select');
      datasetSel.className = 'select-input';
      datasetSel.id = 'brdf-dataset-select';

      BRDF_GROUPS.forEach((group) => {
        const opt = document.createElement('option');
        opt.value = group.label;
        opt.textContent = group.label;
        datasetSel.appendChild(opt);
      });

      row.appendChild(datasetSel);

      const materialRow = this._row();
      const shaderLabel = document.createElement('label');
      shaderLabel.className = 'control-label';
      shaderLabel.htmlFor = 'brdf-select';
      shaderLabel.textContent = 'Shader:';
      materialRow.appendChild(shaderLabel);

      const sel = document.createElement('select');
      sel.className = 'select-input';
      sel.id = 'brdf-select';

      const populateBrdfOptions = (groupLabel, preferredUrl) => {
        const group = BRDF_GROUPS.find((entry) => entry.label === groupLabel) || BRDF_GROUPS[0];
        sel.innerHTML = '';

        group.presets.forEach((preset) => {
          const opt = document.createElement('option');
          opt.value = preset.url;
          opt.textContent = preset.label;
          sel.appendChild(opt);
        });

        const nextValue = group.presets.some((preset) => preset.url === preferredUrl)
          ? preferredUrl
          : group.presets[0]?.url;

        if (nextValue) {
          sel.value = nextValue;
        }
      };

      const defaultGroup = BRDF_GROUPS.find((group) =>
        group.presets.some((preset) => preset.url === DEFAULT_BRDF.url),
      ) || BRDF_GROUPS[0];

      datasetSel.value = defaultGroup.label;
      populateBrdfOptions(defaultGroup.label, DEFAULT_BRDF.url);

      datasetSel.addEventListener('change', () => {
        populateBrdfOptions(datasetSel.value);
        const preset = BRDF_PRESETS.find((item) => item.url === sel.value);
        if (preset && this.onBRDFChange) {
          this.onBRDFChange(sel.value, null, preset.label);
        }
      });

      sel.addEventListener('change', () => {
        const preset = BRDF_PRESETS.find((item) => item.url === sel.value);
        if (this.onBRDFChange) {
          this.onBRDFChange(sel.value, null, preset ? preset.label : undefined);
        }
      });
      materialRow.appendChild(sel);

      // File upload
      const uploadLabel = document.createElement('label');
      uploadLabel.className = 'file-upload-btn';
      uploadLabel.textContent = 'Load .brdf';
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = '.brdf';
      uploadInput.style.display = 'none';
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (this.onBRDFChange) this.onBRDFChange(null, ev.target.result, file.name);
        };
        reader.readAsText(file);
      });
      uploadLabel.appendChild(uploadInput);
      materialRow.appendChild(uploadLabel);
      section.appendChild(row);
      section.appendChild(materialRow);
    });

    // Geometry selector
    this._buildSection(panel, 'Geometry', (section) => {
      const row = this._row();
      const geometryLabel = document.createElement('span');
      geometryLabel.textContent = 'Model:';
      geometryLabel.className = 'control-label';
      row.appendChild(geometryLabel);

      const sel = document.createElement('select');
      sel.className = 'select-input';
      sel.id = 'model-select';
      MODEL_PRESETS.forEach((preset) => {
        const opt = document.createElement('option');
        opt.value = preset.url;
        opt.textContent = preset.label;
        sel.appendChild(opt);
      });
      sel.value = DEFAULT_MODEL.url;
      sel.addEventListener('change', () => {
        const preset = MODEL_PRESETS.find((item) => item.url === sel.value);
        if (this.onModelChange) {
          this.onModelChange(sel.value, null, preset ? preset.label : undefined);
        }
      });
      row.appendChild(sel);

      const uploadLabel = document.createElement('label');
      uploadLabel.className = 'file-upload-btn';
      uploadLabel.textContent = 'Load .obj';
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = '.obj';
      uploadInput.style.display = 'none';
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (this.onModelChange) this.onModelChange(null, ev.target.result, file.name);
        };
        reader.readAsText(file);
      });
      uploadLabel.appendChild(uploadInput);
      row.appendChild(uploadLabel);
      section.appendChild(row);
    });

    // BRDF parameters (will be populated by updateBRDFParams)
    const { section: paramSection, body: paramBody } = this._createCollapsibleSection('BRDF Parameters');
    paramSection.id = 'brdf-params-section';
    const resetParamBtn = document.createElement('button');
    resetParamBtn.type = 'button';
    resetParamBtn.className = 'reset-btn';
    resetParamBtn.textContent = 'Reset Parameters';
    resetParamBtn.addEventListener('click', () => {
      this.renderer.resetParameters();
      this.updateBRDFParams(this.renderer.brdfData?.parameters || [], this.renderer.brdfParams);
    });
    paramBody.appendChild(resetParamBtn);
    const paramContainer = document.createElement('div');
    paramContainer.id = 'brdf-params';
    paramBody.appendChild(paramContainer);
    panel.appendChild(paramSection);

    // Lighting
    this._buildSection(panel, 'Lighting', (section) => {
      // Mode toggle
      const modeRow = this._row();
      const modeLabel = document.createElement('span');
      modeLabel.textContent = 'Mode:';
      modeLabel.className = 'control-label';
      modeRow.appendChild(modeLabel);

      ['Point Light', 'Environment Map'].forEach((label, i) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = 'mode-btn' + (i === this.renderer.lightMode ? ' active' : '');
        btn.id = 'mode-btn-' + i;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderer.setMode(i === 0 ? 'point' : 'envmap');
          this._updateLightingControls(i);
        });
        modeRow.appendChild(btn);
      });
      section.appendChild(modeRow);

      // Point light controls
      const pointControls = document.createElement('div');
      pointControls.id = 'point-light-controls';
      pointControls.style.display = this.renderer.lightMode === 0 ? '' : 'none';
      this._addSlider(pointControls, 'Light Theta', 'light-theta', 0, Math.PI, 1.0, (v) => {
        this.renderer.setLightDir(v, this._getLightPhi());
      });
      this._addSlider(pointControls, 'Light Phi', 'light-phi', 0, Math.PI * 2, 1.0, (v) => {
        this.renderer.setLightDir(this._getLightTheta(), v);
      });
      section.appendChild(pointControls);

      // Envmap controls
      const envControls = document.createElement('div');
      envControls.id = 'envmap-controls';
      envControls.style.display = this.renderer.lightMode === 1 ? '' : 'none';

      const envRow = this._row();
      const envLabel = document.createElement('span');
      envLabel.textContent = 'Environment:';
      envLabel.className = 'control-label';
      envRow.appendChild(envLabel);

      const envSel = document.createElement('select');
      envSel.className = 'select-input';
      envSel.id = 'envmap-select';
      ENVMAP_PRESETS.forEach((preset) => {
        const opt = document.createElement('option');
        opt.value = preset.url;
        opt.textContent = preset.label;
        envSel.appendChild(opt);
      });
      envSel.value = DEFAULT_ENVMAP.url;
      envSel.addEventListener('change', () => {
        const preset = ENVMAP_PRESETS.find((item) => item.url === envSel.value);
        if (this.onEnvmapChange) {
          this.onEnvmapChange(envSel.value, null, preset ? preset.label : undefined);
        }
      });
      envRow.appendChild(envSel);

      // Envmap file upload
      const envUpLabel = document.createElement('label');
      envUpLabel.className = 'file-upload-btn';
      envUpLabel.textContent = 'Load .exr';
      const envUpInput = document.createElement('input');
      envUpInput.type = 'file';
      envUpInput.accept = '.exr';
      envUpInput.style.display = 'none';
      envUpInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (this.onEnvmapChange) this.onEnvmapChange(null, ev.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
      });
      envUpLabel.appendChild(envUpInput);
      envRow.appendChild(envUpLabel);
      envControls.appendChild(envRow);

      this._addSlider(envControls, 'Envmap Rotation', 'envmap-rotation', 0, Math.PI * 2, 0, (v) => {
        this.renderer.setEnvmapRotation(v);
      });
      section.appendChild(envControls);
    });

    // Display settings
    this._buildSection(panel, 'Display', (section) => {
      this._addSlider(section, 'Exposure', 'exposure', -4, 4, 0, (v) => {
        this.renderer.setExposure(Math.pow(2, v));
      }, true, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} EV`);
    });

    // Rendering info
    this._buildSection(panel, 'Rendering', (section) => {
      const row = this._row();
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      const sampleDisplay = document.createElement('span');
      sampleDisplay.id = 'sample-count';
      sampleDisplay.className = 'sample-count';
      sampleDisplay.textContent = '0 samples';
      row.appendChild(sampleDisplay);

      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';
      resetBtn.className = 'reset-btn';
      resetBtn.addEventListener('click', () => {
        this.renderer.resetAccumulation();
      });
      row.appendChild(resetBtn);
      section.appendChild(row);

      const hint = document.createElement('p');
      hint.className = 'hint-text';
      hint.textContent = 'Drag to orbit • Scroll to zoom • R to reset • P to toggle mode';
      section.appendChild(hint);

      const sampleLimitRow = this._row();
      const sampleLimitLabel = document.createElement('label');
      sampleLimitLabel.className = 'control-label';
      sampleLimitLabel.htmlFor = 'max-samples';
      sampleLimitLabel.textContent = 'Max Samples:';
      sampleLimitRow.appendChild(sampleLimitLabel);

      const sampleLimitInput = document.createElement('input');
      sampleLimitInput.type = 'number';
      sampleLimitInput.id = 'max-samples';
      sampleLimitInput.className = 'select-input';
      sampleLimitInput.min = '0';
      sampleLimitInput.step = '1';
      sampleLimitInput.value = String(this.renderer.maxSamples);
      sampleLimitInput.title = '0 disables the cap';
      sampleLimitInput.addEventListener('change', () => {
        const parsed = Number.parseInt(sampleLimitInput.value, 10);
        this.renderer.setMaxSamples(Number.isFinite(parsed) ? parsed : 0);
        sampleLimitInput.value = String(this.renderer.maxSamples);
      });
      sampleLimitRow.appendChild(sampleLimitInput);
      section.appendChild(sampleLimitRow);
    });
  }

  _buildSection(parent, title, builder) {
    const { section, body } = this._createCollapsibleSection(title);
    builder(body);
    parent.appendChild(section);
  }

  _row() {
    const d = document.createElement('div');
    d.className = 'control-row';
    return d;
  }

  _addSlider(parent, label, id, min, max, defaultVal, onChange, isExp, formatFn) {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.className = 'slider-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.className = 'slider';
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) / 500;
    slider.value = defaultVal;

    const valDisplay = document.createElement('span');
    valDisplay.className = 'slider-value';
    valDisplay.textContent = formatFn ? formatFn(defaultVal) : defaultVal.toFixed(3);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valDisplay.textContent = formatFn ? formatFn(v) : v.toFixed(3);
      onChange(v);
    });

    row.appendChild(slider);
    row.appendChild(valDisplay);
    parent.appendChild(row);
    return slider;
  }

  _getLightTheta() {
    const el = document.getElementById('light-theta');
    return el ? parseFloat(el.value) : 1.0;
  }

  _getLightPhi() {
    const el = document.getElementById('light-phi');
    return el ? parseFloat(el.value) : 1.0;
  }

  _updateLightingControls(modeIndex) {
    const pointControls = document.getElementById('point-light-controls');
    const envControls = document.getElementById('envmap-controls');
    if (pointControls) pointControls.style.display = modeIndex === 0 ? '' : 'none';
    if (envControls) envControls.style.display = modeIndex === 1 ? '' : 'none';
  }

  updateBRDFParams(parameters, currentValues) {
    const container = document.getElementById('brdf-params');
    if (!container) return;
    container.innerHTML = '';
    this.paramSliders = {};
    const visibleParameters = (parameters || []).filter((param) => !this._isHiddenParam(param.name));

    if (visibleParameters.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'hint-text';
      msg.textContent = 'No parameters';
      container.appendChild(msg);
      return;
    }

    for (const param of visibleParameters) {
      const val = currentValues && currentValues[param.name] !== undefined
        ? currentValues[param.name]
        : param.default;

      if (param.type === 'bool') {
        const row = document.createElement('div');
        row.className = 'checkbox-row';

        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = val;
        cb.addEventListener('change', () => {
          this.renderer.setParameter(param.name, cb.checked);
        });

        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + this._formatParamName(param.name)));
        row.appendChild(label);
        container.appendChild(row);
        this.paramSliders[param.name] = cb;

      } else if (param.type === 'float' || param.type === 'int') {
        const row = document.createElement('div');
        row.className = 'slider-row';

        const lbl = document.createElement('label');
        lbl.className = 'slider-label';
        lbl.textContent = this._formatParamName(param.name);
        row.appendChild(lbl);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'slider';
        slider.min = param.min;
        slider.max = param.max;
        slider.step = param.type === 'int' ? 1 : (param.max - param.min) / 500;
        slider.value = val;

        const valDisplay = document.createElement('span');
        valDisplay.className = 'slider-value';
        valDisplay.textContent = param.type === 'int' ? String(Math.round(val)) : val.toFixed(3);

        slider.addEventListener('input', () => {
          const v = parseFloat(slider.value);
          valDisplay.textContent = param.type === 'int' ? String(Math.round(v)) : v.toFixed(3);
          this.renderer.setParameter(param.name, param.type === 'int' ? Math.round(v) : v);
        });

        row.appendChild(slider);
        row.appendChild(valDisplay);
        container.appendChild(row);
        this.paramSliders[param.name] = slider;
      }
    }
  }

  updateSampleCount(count) {
    const el = document.getElementById('sample-count');
    if (!el) return;

    if (this.renderer.maxSamples > 0) {
      el.textContent = `${count} / ${this.renderer.maxSamples} samples`;
      return;
    }

    el.textContent = `${count} samples`;
  }

  _formatParamName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _isHiddenParam(name) {
    return /^latent_\d+$/i.test(name);
  }
}
