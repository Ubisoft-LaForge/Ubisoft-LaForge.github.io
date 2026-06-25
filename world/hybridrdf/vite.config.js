import { defineConfig } from 'vite';

const pagesPath = process.env.CI_PAGES_URL
  ? new URL(process.env.CI_PAGES_URL).pathname
  : '/';

export default defineConfig({
  base: pagesPath.endsWith('/') ? pagesPath : `${pagesPath}/`,
});
