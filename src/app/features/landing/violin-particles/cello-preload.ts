import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export const CELLO_MODEL_URL = '/models/cello.glb';
const DRACO_PATH = '/draco/';

let loader: GLTFLoader | null = null;
let preloadPromise: Promise<GLTF> | null = null;

function getLoader(): GLTFLoader {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);
  draco.setWorkerLimit(1);
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

/** Arranca descarga + decode Draco lo antes posible. */
export function preloadCelloModel(): Promise<GLTF> {
  if (!preloadPromise) {
    preloadPromise = getLoader()
      .loadAsync(CELLO_MODEL_URL)
      .catch((err) => {
        preloadPromise = null;
        throw err;
      });
  }
  return preloadPromise;
}

/**
 * Devuelve el GLTF precargado.
 * Si el scene ya está en uso/dispuesto, vuelve a pedirlo (HTTP cache ≈ instantáneo).
 */
export async function loadCelloScene(): Promise<GLTF> {
  const cached = await preloadCelloModel();
  if (cached.scene.parent) {
    preloadPromise = null;
    return preloadCelloModel();
  }
  return cached;
}
