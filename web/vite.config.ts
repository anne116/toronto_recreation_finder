import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import type { OutputAsset } from 'rollup'

const INTER_FONT_WEIGHTS = ['400', '500', '600', '700']

function preloadInterFonts(): Plugin {
  return {
    name: 'preload-inter-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        if (!bundle) return []

        return INTER_FONT_WEIGHTS.flatMap((weight) => {
          const asset = Object.values(bundle).find(
            (output): output is OutputAsset =>
              output.type === 'asset' &&
              output.fileName.includes(`inter-latin-${weight}-normal`) &&
              output.fileName.endsWith('.woff2')
          )

          if (!asset) {
            console.warn(`[preload-inter-fonts] Could not find latin ${weight} woff2 in build output`)
            return []
          }

          return [{
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'font',
              type: 'font/woff2',
              href: `/${asset.fileName}`,
              crossorigin: '',
            },
            injectTo: 'head-prepend' as const,
          }]
        })
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadInterFonts()],
  root: 'web',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        toronto: fileURLToPath(new URL('./toronto.html', import.meta.url)),
      },
    },
  }
})
