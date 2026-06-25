const shaderPaths = [
  'shaders/MERL/Ours_ld4_32x2_alum-bronze.brdf',
  'shaders/MERL/Ours_ld4_32x2_alumina-oxide.brdf',
  'shaders/MERL/Ours_ld4_32x2_aluminium.brdf',
  'shaders/MERL/Ours_ld4_32x2_aventurnine.brdf',
  'shaders/MERL/Ours_ld4_32x2_beige-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_black-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_black-obsidian.brdf',
  'shaders/MERL/Ours_ld4_32x2_black-oxidized-steel.brdf',
  'shaders/MERL/Ours_ld4_32x2_black-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_black-soft-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_blue-acrylic.brdf',
  'shaders/MERL/Ours_ld4_32x2_blue-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_blue-metallic-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_blue-metallic-paint2.brdf',
  'shaders/MERL/Ours_ld4_32x2_blue-rubber.brdf',
  'shaders/MERL/Ours_ld4_32x2_brass.brdf',
  'shaders/MERL/Ours_ld4_32x2_cherry-235.brdf',
  'shaders/MERL/Ours_ld4_32x2_chrome-steel.brdf',
  'shaders/MERL/Ours_ld4_32x2_chrome.brdf',
  'shaders/MERL/Ours_ld4_32x2_colonial-maple-223.brdf',
  'shaders/MERL/Ours_ld4_32x2_color-changing-paint1.brdf',
  'shaders/MERL/Ours_ld4_32x2_color-changing-paint2.brdf',
  'shaders/MERL/Ours_ld4_32x2_color-changing-paint3.brdf',
  'shaders/MERL/Ours_ld4_32x2_dark-blue-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_dark-red-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_dark-specular-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_delrin.brdf',
  'shaders/MERL/Ours_ld4_32x2_fruitwood-241.brdf',
  'shaders/MERL/Ours_ld4_32x2_gold-metallic-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_gold-metallic-paint2.brdf',
  'shaders/MERL/Ours_ld4_32x2_gold-metallic-paint3.brdf',
  'shaders/MERL/Ours_ld4_32x2_gold-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_gray-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_grease-covered-steel.brdf',
  'shaders/MERL/Ours_ld4_32x2_green-acrylic.brdf',
  'shaders/MERL/Ours_ld4_32x2_green-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_green-latex.brdf',
  'shaders/MERL/Ours_ld4_32x2_green-metallic-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_green-metallic-paint2.brdf',
  'shaders/MERL/Ours_ld4_32x2_green-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_hematite.brdf',
  'shaders/MERL/Ours_ld4_32x2_ipswich-pine-221.brdf',
  'shaders/MERL/Ours_ld4_32x2_light-brown-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_light-red-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_maroon-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_natural-209.brdf',
  'shaders/MERL/Ours_ld4_32x2_neoprene-rubber.brdf',
  'shaders/MERL/Ours_ld4_32x2_nickel.brdf',
  'shaders/MERL/Ours_ld4_32x2_nylon.brdf',
  'shaders/MERL/Ours_ld4_32x2_orange-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_pearl-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_pickled-oak-260.brdf',
  'shaders/MERL/Ours_ld4_32x2_pink-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_pink-fabric2.brdf',
  'shaders/MERL/Ours_ld4_32x2_pink-felt.brdf',
  'shaders/MERL/Ours_ld4_32x2_pink-jasper.brdf',
  'shaders/MERL/Ours_ld4_32x2_pink-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_polyethylene.brdf',
  'shaders/MERL/Ours_ld4_32x2_polyurethane-foam.brdf',
  'shaders/MERL/Ours_ld4_32x2_pure-rubber.brdf',
  'shaders/MERL/Ours_ld4_32x2_purple-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_pvc.brdf',
  'shaders/MERL/Ours_ld4_32x2_red-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_red-fabric2.brdf',
  'shaders/MERL/Ours_ld4_32x2_red-metallic-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_red-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_red-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_red-specular-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_silicon-nitrade.brdf',
  'shaders/MERL/Ours_ld4_32x2_silver-metallic-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_silver-metallic-paint2.brdf',
  'shaders/MERL/Ours_ld4_32x2_silver-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_special-walnut-224.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-black-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-blue-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-green-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-maroon-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-orange-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-red-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-violet-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-white-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_specular-yellow-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_ss440.brdf',
  'shaders/MERL/Ours_ld4_32x2_steel.brdf',
  'shaders/MERL/Ours_ld4_32x2_teflon.brdf',
  'shaders/MERL/Ours_ld4_32x2_tungsten-carbide.brdf',
  'shaders/MERL/Ours_ld4_32x2_two-layer-gold.brdf',
  'shaders/MERL/Ours_ld4_32x2_two-layer-silver.brdf',
  'shaders/MERL/Ours_ld4_32x2_violet-acrylic.brdf',
  'shaders/MERL/Ours_ld4_32x2_violet-rubber.brdf',
  'shaders/MERL/Ours_ld4_32x2_white-acrylic.brdf',
  'shaders/MERL/Ours_ld4_32x2_white-diffuse-bball.brdf',
  'shaders/MERL/Ours_ld4_32x2_white-fabric.brdf',
  'shaders/MERL/Ours_ld4_32x2_white-fabric2.brdf',
  'shaders/MERL/Ours_ld4_32x2_white-marble.brdf',
  'shaders/MERL/Ours_ld4_32x2_white-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_yellow-matte-plastic.brdf',
  'shaders/MERL/Ours_ld4_32x2_yellow-paint.brdf',
  'shaders/MERL/Ours_ld4_32x2_yellow-phenolic.brdf',
  'shaders/MERL/Ours_ld4_32x2_yellow-plastic.brdf',
  'shaders/RGL/Ours_ld4_32x2_acrylic_felt_green_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_acrylic_felt_orange_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_acrylic_felt_pink_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_acrylic_felt_purple_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_acrylic_felt_white_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_acrylic_felt_yellow_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_brushed_aluminium_1_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_copper_sheet_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_green_pvc_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_metallic_paper_copper_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_metallic_paper_gold_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_miro_7_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_morpho_melenaus_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aniso_sari_silk_2color_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_aurora_white_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cardboard_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cc_amber_citrine_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cc_blue_agat_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cc_green_malachite_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cc_ibiza_sunset_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cc_iris_purple_gem_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cc_nothern_aurora_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cg_sunflower_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_chm_light_blue_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_chm_mint_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_chm_orange_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cm_military_green_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cm_toxic_green_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_cm_white_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_colodur_azure_4e_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_colodur_connemara_4c_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_colodur_kalahari_2a_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_colodur_napoli_4f_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_aniso_darth_vader_pants_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_aniso_tarkin_tunic_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_l3_37_dark_green_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_l3_37_matte_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_l3_37_metallic_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_solo_m_68_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_ilm_solo_millennium_falcon_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_irid_flake_paint1_fine_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_irid_flake_paint1_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_irid_flake_paint2_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_laika_ceiling_paint_18_gray_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_leaf_maple_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_paper_blue_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_paper_green_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_paper_red_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_paper_white_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_paper_yellow_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_satin_blue_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_satin_gold_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_satin_purple_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_satin_rosaline_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_satin_white_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_spectralon_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_vch_dragon_eye_red_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_vch_frozen_amethyst_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_vch_golden_yellow_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_vch_silk_blue_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_vch_ultra_pink_rgb.brdf',
  'shaders/RGL/Ours_ld4_32x2_weta_brushed_steel_satin_pink_rgb.brdf',
];

const modelPaths = [
  'models/bunny.obj',
  'models/dragon.obj',
  'models/suzanne.obj',
];

const entryScript = document.querySelector?.('script[type="module"][src]');
const assetRootUrl = entryScript?.src
  ? new URL('../', entryScript.src)
  : new URL('.', document.baseURI);

function assetUrl(path) {
  return new URL(path, assetRootUrl).href;
}

const furnaceEnvUrl = assetUrl('envmaps/furnace.exr');
const galileoEnvUrl = assetUrl('envmaps/galileo.exr');
const graceEnvUrl = assetUrl('envmaps/grace.exr');
const museumEnvUrl = assetUrl('envmaps/museum.exr');
const stPeterEnvUrl = assetUrl('envmaps/st_peter.exr');
const uffiziEnvUrl = assetUrl('envmaps/uffizi.exr');

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
  const relativePath = path.replace(/^shaders\//, '');
  const segments = relativePath.split('/');
  const fileName = segments[segments.length - 1].replace(/\.brdf$/, '');
  const dataset = segments[0];

  return {
    dataset,
    label: formatShaderLabel(fileName),
    url,
  };
}

const learnedPresets = shaderPaths
  .map((path) => createShaderPreset(path, assetUrl(path)))
  .sort((a, b) => {
    if (a.dataset !== b.dataset) return a.dataset.localeCompare(b.dataset);
    return a.label.localeCompare(b.label);
  });

const modelPresets = modelPaths
  .map((path) => ({
    label: formatModelLabel(path),
    url: assetUrl(path),
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
