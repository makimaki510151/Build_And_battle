import * as esbuild from 'esbuild'
import { mkdirSync, cpSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const watch = process.argv.includes('--watch')

mkdirSync(join(root, 'app'), { recursive: true })

/** Bundle the whole game (React + Trystero included) so GitHub Pages needs no npm build. */
const buildOptions = {
  entryPoints: [join(root, 'src/main.tsx')],
  bundle: true,
  format: 'esm',
  outfile: join(root, 'app/main.js'),
  jsx: 'automatic',
  // Pages にそのまま載せるので minify。マップはリポジトリ肥大化を避けるため出さない
  minify: !watch,
  sourcemap: watch,
  target: ['es2022'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  loader: {
    '.css': 'css',
    '.svg': 'dataurl',
    '.png': 'dataurl',
  },
  logLevel: 'info',
}

function copyAssets() {
  const favicon = join(root, 'public/favicon.svg')
  if (existsSync(favicon)) {
    cpSync(favicon, join(root, 'favicon.svg'))
  }
  // Ensure CSS imported from JS is emitted alongside — esbuild puts it in app/main.css
}

async function run() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions)
    await ctx.watch()
    copyAssets()
    console.log('[static] watching — open index.html via any static server')
  } else {
    await esbuild.build(buildOptions)
    copyAssets()
    // esbuild writes app/main.css when CSS is imported from JS
    const cssPath = join(root, 'app/main.css')
    if (existsSync(cssPath)) {
      // already good
    }
    console.log('[static] wrote app/main.js (+ css if any)')
  }
}

await run()
