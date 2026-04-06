import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    viteCompression({
      filter: /\.(js|mjs|json|css|html|csv)$/i,
      algorithm: 'gzip'
    })
  ],
  base: '/sonora-delictiva/',
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('plotly') || id.includes('react-plotly')) return 'plotly';
          if (id.includes('node_modules/d3')) return 'd3';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
        }
      }
    }
  }
})


