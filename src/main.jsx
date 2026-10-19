import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Editor from './Editor.jsx'
import Resume from './Resume.jsx'
import { LABELS, empty, parse } from './parse.js'
import example from './example.json'
import './style.css'

const KEY = 'libre-cv'

// Accept any object shaped roughly like JSON Resume; fill in what's missing.
function normalize(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('This is not a CV file.')
  const base = empty()
  const out = { ...base }
  for (const k of Object.keys(base)) if (Array.isArray(base[k]) && Array.isArray(data[k])) out[k] = data[k]
  out.meta = { ...data.meta, language: LABELS[data.meta?.language] ? data.meta.language : 'en' }
  out.basics = { ...base.basics, ...data.basics, location: { ...base.basics.location, ...data.basics?.location } }
  if (!Array.isArray(out.basics.profiles)) out.basics.profiles = []
  return out
}

function load() {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? normalize(JSON.parse(saved)) : empty()
  } catch {
    return empty()
  }
}

function checks(r, pages) {
  const b = r.basics
  const words = (b.summary || '').trim().split(/\s+/).filter(Boolean).length
  return [
    !b.name && 'Add your full name.',
    !b.email && 'Add an email address.',
    !b.phone && 'Add a phone number.',
    !r.work.length && !r.education.length && 'Add at least one experience or education entry.',
    r.work.some((w) => !w.startDate) && 'Every experience entry should have a start date.',
    r.work.some((w) => !w.position) && 'Every experience entry should have a position.',
    words > 80 && `Summary is ${words} words — aim for under 80.`,
    !r.skills.length && 'Add a skills section; screeners match it against the job ad.',
    pages > 2 && `Your CV is about ${pages} pages — aim for 1–2.`,
  ].filter(Boolean)
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

const slug = (s) => s.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
const isEmpty = (r) => JSON.stringify(r) === JSON.stringify(empty())

function App() {
  const [resume, setResume] = useState(load)
  const [status, setStatus] = useState('')
  const [unparsed, setUnparsed] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState({ height: 0, count: 1 }) // A4 page height in preview pixels
  const preview = useRef(null)

  // Preview width maps to 210 mm, so one A4 page is width × 297/210 pixels tall.
  useEffect(() => {
    const cv = preview.current.firstElementChild
    const measure = () => {
      const height = (cv.offsetWidth * 297) / 210
      cv.style.setProperty('--page', `${height}px`)
      setPage({ height, count: Math.max(1, Math.ceil(cv.scrollHeight / height - 0.01)) })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(resume)) } catch { /* private mode: still works, just not saved */ }
  }, [resume])

  const replace = (next) => isEmpty(resume) || confirm('Replace the CV you are editing?') ? (setResume(next), true) : false

  async function importPdf(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { readPdf } = await import('./importPdf.js')
      const lines = await readPdf(file, setStatus)
      if (!lines.length) { setStatus('No text could be found in this PDF. Please fill in the form manually.'); return }
      const result = parse(lines)
      if (replace(result.resume)) {
        setUnparsed(result.unparsed)
        setStatus('Imported. Automatic reading is never perfect — please review every field.')
      } else setStatus('')
    } catch (err) {
      setStatus(`Could not read this PDF: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function openJson(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      if (replace(normalize(JSON.parse(await file.text())))) { setUnparsed(''); setStatus('CV loaded.') }
    } catch (err) {
      setStatus(`Could not open this file: ${err.message}`)
    }
  }

  function print() {
    const title = document.title
    document.title = `${slug(resume.basics.name) || 'My'}-CV` // becomes the suggested PDF file name
    window.print()
    document.title = title
  }

  function clear() {
    if (!confirm('Delete your CV from this browser? Download a JSON backup first if you want to keep it.')) return
    setResume(empty())
    setUnparsed('')
    setStatus('Cleared.')
  }

  const warnings = checks(resume, page.count)
  const language = resume.meta?.language ?? 'en'
  return (
    <>
      <header className="toolbar">
        <h1>Libre CV</h1>
        <label className="button">
          {busy ? 'Reading…' : 'Import PDF'}
          <input type="file" accept="application/pdf,.pdf" onChange={importPdf} disabled={busy} hidden />
        </label>
        <label className="button">
          Open JSON
          <input type="file" accept="application/json,.json" onChange={openJson} hidden />
        </label>
        <button type="button" onClick={() => download(`${slug(resume.basics.name) || 'cv'}.json`, JSON.stringify(resume, null, 2), 'application/json')}>
          Save JSON
        </button>
        {isEmpty(resume) && <button type="button" onClick={() => setResume(normalize(example))}>Load example</button>}
        <label className="button">
          CV language{' '}
          <select value={language} onChange={(e) => setResume({ ...resume, meta: { ...resume.meta, language: e.target.value } })}>
            {Object.entries(LABELS).map(([code, l]) => <option key={code} value={code}>{l.name}</option>)}
          </select>
        </label>
        <button type="button" className="primary" onClick={print}>Download PDF</button>
        <button type="button" onClick={clear}>Clear</button>
      </header>
      {status && <p className="status" role="status">{status}</p>}
      <main>
        <div className="side">
          {unparsed && (
            <details open className="panel">
              <summary>Text we couldn't place ({unparsed.split('\n').length} lines)</summary>
              <p>Copy anything useful into the form, then dismiss.</p>
              <textarea readOnly rows={8} value={unparsed} />
              <button type="button" onClick={() => setUnparsed('')}>Dismiss</button>
            </details>
          )}
          <details className="panel" open={warnings.length > 0}>
            <summary>CV check: {warnings.length ? `${warnings.length} suggestion${warnings.length > 1 ? 's' : ''}` : 'looks good'}</summary>
            <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </details>
          <details className="panel">
            <summary>Tips: getting past ATS and AI screeners</summary>
            <ul>
              <li>This template is already machine-friendly: one column, real text, standard headings.</li>
              <li>Use the job ad's own words for your skills and titles.</li>
              <li>Start achievements with a verb and a number: "Cut costs by 30%".</li>
              <li>Keep it to 1–2 pages. Older roles can be one line.</li>
              <li>Don't hide keywords in white text — AI screeners flag it.</li>
              <li>Export with "Download PDF" (choose "Save as PDF") — never send a scan or a photo.</li>
              <li>If the PDF shows a date or web address at the page edges, untick "Headers and footers" in the print dialog.</li>
            </ul>
          </details>
          <Editor resume={resume} onChange={setResume} />
        </div>
        <div className="preview">
          <p className="pages">≈ {page.count} {page.count === 1 ? 'page' : 'pages'} (A4) · red lines show page breaks</p>
          <div ref={preview}><Resume resume={resume} /></div>
        </div>
      </main>
      <footer>
        Your CV stays in this browser — nothing is uploaded. Free and open source (MIT) ·{' '}
        <a href="https://github.com/guipguia/libre-cv">GitHub</a> · <a href="/privacy">Privacy</a>
      </footer>
    </>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
