// PDF -> text lines, entirely in the browser. Falls back to OCR for scanned PDFs.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { toLines } from './lines.js'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
const vendor = new URL(`${import.meta.env.BASE_URL}vendor/`, location.href).href
const MAX_BYTES = 20 * 1024 * 1024

/** @returns {Promise<{text: string, size: number, page: number}[]>} */
export async function readPdf(file, onStatus = () => {}) {
  if (file.size > MAX_BYTES) throw new Error('This PDF is larger than 20 MB.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('This file is not a PDF.')

  onStatus('Reading PDF…')
  const task = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    wasmUrl: `${vendor}pdfjs/wasm/`,
    cMapUrl: `${vendor}pdfjs/cmaps/`,
    standardFontDataUrl: `${vendor}pdfjs/standard_fonts/`,
    iccUrl: `${vendor}pdfjs/iccs/`,
  })
  try {
    const pdf = await task.promise
    const lines = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      lines.push(...toLines((await page.getTextContent()).items, p))
    }
    const chars = lines.reduce((n, l) => n + l.text.length, 0)
    if (chars >= 50 * pdf.numPages) return lines
    return await ocr(pdf, onStatus) // scanned: pages are images
  } finally {
    task.destroy()
  }
}

async function ocr(pdf, onStatus) {
  onStatus('No text layer found — running OCR in your browser (first time downloads ~8 MB)…')
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['eng', 'por'], 1, {
    workerPath: `${vendor}tesseract/worker.min.js`,
    corePath: `${vendor}tesseract/`,
    langPath: `${vendor}tesseract`,
    workerBlobURL: false,
  })
  try {
    const lines = []
    for (let p = 1; p <= pdf.numPages; p++) {
      onStatus(`OCR: page ${p} of ${pdf.numPages}…`)
      const page = await pdf.getPage(p)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, viewport }).promise
      const { data } = await worker.recognize(canvas, {}, { blocks: true })
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            const text = line.text.trim()
            if (text) lines.push({ text, size: line.bbox.y1 - line.bbox.y0, page: p })
          }
        }
      }
    }
    return lines
  } finally {
    await worker.terminate()
  }
}
