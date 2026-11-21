import { defineConfig } from 'vite';
import { discoverProjects } from './src/projects.js';

export default defineConfig({
  plugins: [{
    name: 'portfolio-catalog',
    apply: 'build',
    async generateBundle() {
      try {
        const projects = await discoverProjects();
        this.emitFile({ type: 'asset', fileName: 'projects.json', source: JSON.stringify(projects) });
      } catch (error) {
        this.warn(`Could not generate the catalog from GitHub: ${error.message}. The site will query GitHub at runtime.`);
      }
    },
  }],
});
