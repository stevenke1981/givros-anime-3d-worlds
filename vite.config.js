import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    license: { fileName: 'THIRD-PARTY-NOTICES.md' },
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'three-core', test: /three[\\/]build[\\/]three\.core\.js$/ },
            { name: 'three-renderer', test: /three[\\/]build[\\/]three\.module\.js$/ },
          ],
        },
      },
    },
  },
});
