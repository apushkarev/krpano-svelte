import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { buildAppXml } from './server_lib/bundler.js'

// dev: rebuild krpano sources (app.xml) on the ?build query, no separate server
const krpanoDevAPI = () => ({

  name: 'krpano-dev-api',

  configureServer(server) {

    server.middlewares.use('/api/build', async (req, res) => {

      const t0 = performance.now()

      await buildAppXml()

      console.log(chalk.greenBright(`app.xml built in ${Math.round(performance.now() - t0)}ms`))

      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true }))
    })
  }
})

const prodIndexHtml = () => {

  const t = Date.now().toString(36)

  return `<html>
  <head>

    <title>KRPano + Svelte</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
    <meta http-equiv="x-ua-compatible" content="IE=edge" />

    <style>
      html { height:100%; }
      body { height:100%; overflow:hidden; margin:0; padding:0; background-color: #000; }
      #pano { width:100%; height:100%; }
    </style>

    <script type="text/javascript" src="k_app/js/tour_loader.js?t=${t}"></script>
    <script type="text/javascript" src="js/bundler/xml2json.min.js"></script>
    <script type="text/javascript" src="js/bundler/vkbeautify.js"></script>
    <link rel="stylesheet" href="fonts.css?t=${t}" />
  </head>
  <body>

    <!-- krpano-first: the Svelte bundle is embedded inside k_app/app.xml and is
         executed by krpano's __init. No app code is served in the clear here. -->
    <div id="pano"></div>

    <script>
      document.addEventListener('DOMContentLoaded', () => loadTour());
    </script>

  </body>
</html>`
}

// build: after Vite emits the Svelte bundle, embed it into dist/k_app/app.xml,
// drop the standalone bundle files, and write a krpano-first index.html.
const krpanoEmbedBuild = () => ({

  name: 'krpano-embed-build',
  apply: 'build',
  enforce: 'post',

  async closeBundle() {

    const outDir = 'dist'

    const svelteJsPath = path.join(outDir, 'assets', 'index.js')
    const svelteCssPath = path.join(outDir, 'assets', 'index.css')

    fs.mkdirSync(path.join(outDir, 'k_app'), { recursive: true })

    const result = await buildAppXml({
      svelteJsPath,
      svelteCssPath,
      outPath: path.join(outDir, 'k_app', 'app.xml')
    })

    if (fs.existsSync(svelteJsPath)) fs.rmSync(svelteJsPath)
    if (fs.existsSync(svelteCssPath)) fs.rmSync(svelteCssPath)

    fs.writeFileSync(path.join(outDir, 'index.html'), prodIndexHtml())

    console.log(chalk.greenBright('embedded Svelte bundle into dist/k_app/app.xml'), result.sizes)
  }
})

// https://vite.dev/config/
export default defineConfig({

  plugins: [svelte(), krpanoDevAPI(), krpanoEmbedBuild()],

  base: '',

  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },

  server: {
    watch: { ignored: ['**/k_app/**'] }
  },

  publicDir: 'public'
})
