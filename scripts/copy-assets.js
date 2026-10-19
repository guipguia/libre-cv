// Copies pdf.js and tesseract.js runtime files into public/vendor so the site
// never loads anything from a third-party CDN (privacy: no visitor IP leaks).
import { cpSync, rmSync } from 'node:fs'

const out = 'public/vendor'
rmSync(out, { recursive: true, force: true })
const copy = (from, to) => cpSync(`node_modules/${from}`, `${out}/${to}`, { recursive: true })

for (const dir of ['wasm', 'cmaps', 'standard_fonts', 'iccs']) copy(`pdfjs-dist/${dir}`, `pdfjs/${dir}`)
copy('tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js')
for (const v of ['', '-simd', '-relaxedsimd']) {
  copy(`tesseract.js-core/tesseract-core${v}-lstm.wasm.js`, `tesseract/tesseract-core${v}-lstm.wasm.js`)
}
// Apache-2.0 requires shipping the license with redistributed files.
copy('pdfjs-dist/LICENSE', 'pdfjs/LICENSE')
copy('tesseract.js/dist/worker.min.js.LICENSE.txt', 'tesseract/worker.min.js.LICENSE.txt')
copy('tesseract.js-core/LICENSE', 'tesseract/LICENSE-tesseract.js-core')
for (const lang of ['eng', 'por']) {
  copy(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, `tesseract/${lang}.traineddata.gz`)
}
