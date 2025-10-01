import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './landing',      // Vite root is landing folder
  build: {
    outDir: '../dist',    // Output goes to dist folder
    emptyOutDir: true,
  },
});
