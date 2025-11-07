import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src', 'renderer'),
  plugins: [vue()],
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
      '@ui': path.resolve(__dirname, 'src/renderer/components/ui'),
      '@utils': path.resolve(__dirname, 'src/renderer/utils')
    }
  },
  server: {
    port: 5174,
    strictPort: true,
    open: false
  },
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist', 'renderer'),
    emptyOutDir: true
  }
});


