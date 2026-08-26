import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@graphql': path.resolve(__dirname, './src/graphql'),
      '@apolloConfig': path.resolve(__dirname, './src/apollo'),
      '@theme': path.resolve(__dirname, './src/theme'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true, // Required for Docker volume mounts
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // Externalize @fullcalendar/core until it is added as a direct dep (Phase 6)
      external: ['@fullcalendar/core/index.js'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          apollo: ['@apollo/client', 'graphql'],
          charts: ['recharts'],
        },
        // P1-03 — a stable, glob-able name for the true entry chunk only.
        // Vite's default entryFileNames would otherwise name this
        // "index-<hash>.js", identical in shape to every one of the ~90
        // lazy route chunks that also happen to come from an index.jsx
        // file — .size-limit.json's own glob for "the initial bundle"
        // needs to match this one chunk, not every lazy route that shares
        // its prefix.
        entryFileNames: 'assets/entry-[name]-[hash].js',
      },
    },
  },
})
