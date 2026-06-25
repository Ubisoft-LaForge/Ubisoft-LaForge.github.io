import furnaceEnvUrl from '../envmaps/furnace.exr?url';
import galileoEnvUrl from '../envmaps/galileo.exr?url';
import graceEnvUrl from '../envmaps/grace.exr?url';
import museumEnvUrl from '../envmaps/museum.exr?url';
import stPeterEnvUrl from '../envmaps/st_peter.exr?url';
import uffiziEnvUrl from '../envmaps/uffizi.exr?url';

const shaderUrls = import.meta.glob('../shaders/*/*.brdf', {
  eager: true,
  import: 'default',
  query: '?url',
});

const modelUrls = import.meta.glob('../models/*.obj', {
  eager: true,
  import: 'default',
  query: '?url',
});

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatShaderLabel(fileName) {
  return titleCase(
    fileName
      .replace(/^Ours_ld\d+_\d+x\d+_/, '')
      .replace(/_rgb$/, '')
      .replace(/[_-]+/g, ' '),
  );
}

function formatDatasetLabel(dataset) {
  return dataset.toUpperCase();
}

function formatModelLabel(path) {
  const fileName = path.split('/').pop().replace(/\.obj$/i, '');
  return titleCase(fileName.replace(/[_-]+/g, ' '));
}

function createShaderPreset(path, url) {
  const relativePath = path.replace('../shaders/', '');
  const segments = relativePath.split('/');
  const fileName = segments[segments.length - 1].replace(/\.brdf$/, '');
  const dataset = segments[0];

  return {
    dataset,
    label: formatShaderLabel(fileName),
    url,
  };
}

const learnedPresets = Object.entries(shaderUrls)
  .map(([path, url]) => createShaderPreset(path, url))
  .sort((a, b) => {
    if (a.dataset !== b.dataset) return a.dataset.localeCompare(b.dataset);
    return a.label.localeCompare(b.label);
  });

const modelPresets = Object.entries(modelUrls)
  .map(([path, url]) => ({
    label: formatModelLabel(path),
    url,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const BRDF_PRESETS = learnedPresets;

export const MODEL_PRESETS = [
  { label: 'Analytic Sphere', url: '' },
  ...modelPresets,
];

export const BRDF_GROUPS = [
  ...Array.from(
    learnedPresets.reduce((groups, preset) => {
      if (!groups.has(preset.dataset)) groups.set(preset.dataset, []);
      groups.get(preset.dataset).push(preset);
      return groups;
    }, new Map()),
    ([dataset, presets]) => ({
      label: formatDatasetLabel(dataset),
      presets,
    }),
  ),
];

export const ENVMAP_PRESETS = [
  { label: 'Procedural Sky', url: '' },
  { label: 'Furnace Test', url: furnaceEnvUrl },
  { label: 'Galileo', url: galileoEnvUrl },
  { label: 'Grace Cathedral', url: graceEnvUrl },
  { label: 'Museum', url: museumEnvUrl },
  { label: "St. Peter's", url: stPeterEnvUrl },
  { label: 'Uffizi Gallery', url: uffiziEnvUrl },
];

export const DEFAULT_BRDF = BRDF_PRESETS[0];
export const DEFAULT_ENVMAP = ENVMAP_PRESETS.find((preset) => preset.url === stPeterEnvUrl) || ENVMAP_PRESETS[0];
export const DEFAULT_MODEL = MODEL_PRESETS[0];
