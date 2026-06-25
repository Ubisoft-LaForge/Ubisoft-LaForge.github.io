import { FloatType } from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

const loader = new EXRLoader().setDataType(FloatType);

function normalizeBuffer(input) {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  throw new Error('Unsupported EXR input type');
}

function rgbaToRgb(data, width, height) {
  const rgb = new Float32Array(width * height * 3);

  for (let src = 0, dst = 0; src < data.length; src += 4, dst += 3) {
    rgb[dst] = data[src];
    rgb[dst + 1] = data[src + 1];
    rgb[dst + 2] = data[src + 2];
  }

  return rgb;
}

function flipRows(data, width, height, channels) {
  const flipped = new Float32Array(data.length);
  const rowSize = width * channels;

  for (let y = 0; y < height; y++) {
    const srcOffset = y * rowSize;
    const dstOffset = (height - 1 - y) * rowSize;
    flipped.set(data.subarray(srcOffset, srcOffset + rowSize), dstOffset);
  }

  return flipped;
}

export async function loadEXR(input) {
  let source = input;

  if (typeof source === 'string') {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch EXR: ${response.status}`);
    }
    source = await response.arrayBuffer();
  }

  const { data, width, height } = loader.parse(normalizeBuffer(source));

  if (!data || !width || !height) {
    throw new Error('EXR decode returned no texture data');
  }

  return {
    width,
    height,
    data: flipRows(rgbaToRgb(data, width, height), width, height, 3),
  };
}
