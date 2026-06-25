import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const pagesPath = process.env.CI_PAGES_URL
  ? new URL(process.env.CI_PAGES_URL).pathname
  : '/';

const staticAssetDirs = ['envmaps', 'models', 'shaders'];

function copyStaticAssetDirs() {
  return {
    name: 'copy-static-asset-dirs',
    apply: 'build',
    closeBundle() {
      for (const dir of staticAssetDirs) {
        cpSync(resolve(dir), resolve('dist', dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: pagesPath.endsWith('/') ? pagesPath : `${pagesPath}/`,
  plugins: [copyStaticAssetDirs()],
});
