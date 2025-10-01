import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './landing', // Set the root to the 'landing' folder
  build: {
    outDir: '../dist', // Output the build to the 'dist' folder
    emptyOutDir: true, // Clean the output directory before each build
  },
});
