import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const frontendDir = fileURLToPath(new URL('.', import.meta.url))
// shared/ is the single source of truth for sample data, schemas and thresholds.
// The console reads it in place; there is no copy inside frontend/.
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url))

// Without shared/ the build would "succeed" with no sessions in it. Fail loudly instead.
if (!existsSync(`${sharedDir}/sample_data/scored`) || !existsSync(`${sharedDir}/config/thresholds.json`)) {
  throw new Error(
    `Can't find ${sharedDir}. The console reads its sample data and thresholds from shared/, next to frontend/. ` +
      'On Vercel: Settings → Build and Deployment → Root Directory, turn on "Include files outside the root directory ' +
      'in the Build Step" (or set Root Directory to the repo root), then redeploy.',
  )
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  // One .env for the whole repo, at the root (see ../.env.example).
  // Only VITE_* variables ever reach the browser.
  envDir: '..',
  server: {
    // Let the dev server read ../shared, and nothing else outside frontend/
    // (in particular, never ../data).
    fs: { allow: [frontendDir, sharedDir] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          zod: ['zod'],
        },
      },
      onwarn(warning, warn) {
        // Comment-placement notices from inside dependencies are harmless noise.
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) return
        warn(warning)
      },
    },
  },
})
