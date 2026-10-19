// Turns text lines extracted from a PDF into a JSON Resume object (https://jsonresume.org).
// Rule-based on purpose: no AI, no server. It suggests; the user reviews everything in the editor.
// Two-column layouts are untangled before this, in lines.js.

// Template labels per CV language. Every heading here must also be in HEADINGS so exports re-import.
export const LABELS = {
  en: { name: 'English', summary: 'Summary', work: 'Experience', education: 'Education', skills: 'Skills', languages: 'Languages',
    certificates: 'Certifications', present: 'Present', months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
  pt: { name: 'Português', summary: 'Resumo', work: 'Experiência', education: 'Formação', skills: 'Competências', languages: 'Idiomas',
    certificates: 'Certificações', present: 'Atual', months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] },
  fr: { name: 'Français', summary: 'Profil', work: 'Expérience', education: 'Formation', skills: 'Compétences', languages: 'Langues',
    certificates: 'Certifications', present: 'Présent', months: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'] },
  es: { name: 'Español', summary: 'Resumen', work: 'Experiencia', education: 'Educación', skills: 'Habilidades', languages: 'Idiomas',
    certificates: 'Certificaciones', present: 'Actualidad', months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] },
}

export const empty = () => ({
  meta: { language: 'en' },
  basics: { name: '', label: '', email: '', phone: '', url: '', summary: '', location: { city: '', region: '' }, profiles: [] },
  work: [],
  education: [],
  skills: [],
  languages: [],
  certificates: [],
})

const HEADINGS = {
  contact: ['contact', 'contacts', 'contact info', 'contact information', 'contact details', 'personal details', 'personal information',
    'details', 'contacto', 'contactos', 'contato', 'contatos', 'dados pessoais', 'informações pessoais', 'coordonnées', 'datos personales'],
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'about', 'about me', 'objective', 'career objective',
    'resumo', 'resumo profissional', 'perfil', 'perfil profissional', 'sobre mim', 'objetivo', 'profil', 'resumen', 'sobre mí'],
  work: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history',
    'experiência', 'experiência profissional', 'histórico profissional', 'expérience', 'expérience professionnelle', 'expériences professionnelles',
    'experiencia', 'experiencia laboral', 'experiencia profesional'],
  education: ['education', 'education and training', 'academic background', 'qualifications', 'formação', 'formação académica',
    'formação acadêmica', 'educação', 'escolaridade', 'formation', 'formations', 'educación', 'formación', 'formación académica'],
  skills: ['skills', 'technical skills', 'key skills', 'core competencies', 'competencies', 'top skills', 'competências',
    'competências técnicas', 'habilidades', 'aptidões', 'compétences', 'compétences techniques', 'habilidades técnicas', 'conocimientos'],
  languages: ['languages', 'idiomas', 'línguas', 'langues', 'lenguas'],
  certificates: ['certifications', 'certificates', 'licenses & certifications', 'licenses and certifications', 'certificações',
    'certificados', 'certificats', 'certificaciones'],
}
const HEADING_OF = new Map(Object.entries(HEADINGS).flatMap(([key, names]) => names.map((n) => [n, key])))

const MONTHS = [
  ['january', 'jan', 'janv', 'janeiro', 'janvier', 'enero', 'ene'], ['february', 'feb', 'fev', 'févr', 'fevereiro', 'février', 'fév', 'febrero'],
  ['march', 'mar', 'março', 'mars', 'marzo'], ['april', 'apr', 'abr', 'abril', 'avr', 'avril'], ['may', 'mai', 'maio', 'mayo'],
  ['june', 'jun', 'junho', 'juin', 'junio'], ['july', 'jul', 'julho', 'juil', 'juillet', 'julio'], ['august', 'aug', 'ago', 'agosto', 'août', 'aoû'],
  ['september', 'sep', 'sept', 'set', 'setembro', 'septembre', 'septiembre'], ['october', 'oct', 'out', 'outubro', 'octobre', 'octubre'],
  ['november', 'nov', 'novembro', 'novembre', 'noviembre'], ['december', 'dec', 'dez', 'dezembro', 'décembre', 'déc', 'dic', 'diciembre'],
]
const MONTH_RE = `(?<![\\wà-ÿ])(?:${MONTHS.flat().sort((a, b) => b.length - a.length).join('|')})\\.?`
const DATE_RE = `(?:${MONTH_RE}\\s+(?:de\\s+)?\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4}[-/.]\\d{1,2}(?!\\d)|(?:19|20)\\d{2})`
const PRESENT_RE = "(?:present|présent|current|now|today|ongoing|atual|actual|atualmente|presente|hoje|aujourd'hui|en cours|actualidad)"
const RANGE = new RegExp(`(${DATE_RE})\\s*(?:-|–|—|to|até|a|à|au|hasta)\\s*(${DATE_RE}|${PRESENT_RE})`, 'i')
const SINGLE_DATE = new RegExp(DATE_RE, 'i')
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const URLISH = /^(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?$/i
const PROFILE_SITES = { 'linkedin.com': 'LinkedIn', 'github.com': 'GitHub', 'gitlab.com': 'GitLab' }
const BULLET = /^\s*[•●◦▪▫■□‣∙·*–«»-]\s*/ // « » : common OCR misreads of •
const LOCATION = /^[^\d,]{2,40}(?:,\s*[^\d,]{2,40}){1,2}$/ // "Lisbon, Portugal" | "Lisbon, Lisbon, Portugal"
const INSTITUTION = /univ|college|school|institut|escola|faculdade|faculdad|academ|politécnic|polytechn|lyc[ée]e|liceu|colégio|colegio/i

const norm = (s) => s.toLowerCase().replace(/[:：]$/, '').replace(/\s+/g, ' ').trim()
const isBullet = (s) => BULLET.test(s) && !RANGE.test(s.slice(0, 12))
const unbullet = (s) => s.replace(BULLET, '').trim()
// OCR often reads "·" as "-", so contact lines (with an email/phone) also split on " - ".
const splitPieces = (s) => s.split(EMAIL.test(s) || /\d{3}\s?\d{3}/.test(s) ? /\s+[|•·–-]\s+|\s{3,}/ : /\s+[|•·]\s+|\s{3,}/)
  .map((p) => p.trim()).filter(Boolean)
const digits = (s) => (s.match(/\d/g) || []).length

function monthNumber(word) {
  const w = word.toLowerCase().replace('.', '')
  const i = MONTHS.findIndex((names) => names.includes(w))
  return i < 0 ? null : String(i + 1).padStart(2, '0')
}

// "Mar 2020" | "03/2020" | "2020-03" | "2020" -> "2020-03" | "2020"; present -> ""
export function toIso(text) {
  const t = text.trim()
  let m
  if ((m = t.match(/^([a-zà-ÿ]+)\.?\s+(?:de\s+)?(\d{4})$/i))) {
    const mm = monthNumber(m[1])
    return mm ? `${m[2]}-${mm}` : m[2]
  }
  if ((m = t.match(/^(\d{1,2})[/.](\d{4})$/))) return `${m[2]}-${m[1].padStart(2, '0')}`
  if ((m = t.match(/^(\d{4})[-/.](\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, '0')}`
  if (/^\d{4}$/.test(t)) return t
  return ''
}

function headingOf(line, bodySize) {
  const n = norm(line.text)
  if (HEADING_OF.has(n)) return HEADING_OF.get(n)
  // Unknown heading (Projects, Interests, ...): short, no digits, and ALL CAPS or larger than body text.
  const words = n.split(' ').length
  const caps = line.text === line.text.toUpperCase() && /[A-Z]/.test(line.text)
  if (words <= 4 && !/\d/.test(n) && !EMAIL.test(n) && (caps || line.size > bodySize * 1.15) && line.text.length < 40) return 'other'
  return null
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

function parseHeader(lines, out, unparsed) {
  if (!lines.length) return
  const first = lines.filter((l) => l.page === lines[0].page)
  const nameLine = first.reduce((best, l) => (l.size > best.size + 0.5 ? l : best), first[0])
  out.basics.name = nameLine.text.trim()
  parseContacts(lines.filter((l) => l !== nameLine), out, unparsed, true)
}

// Contact pieces: "a@b.com | +351 912 | Lisbon, Portugal | linkedin.com/in/x". The headline is only taken from the header.
function parseContacts(lines, out, unparsed, allowLabel) {
  const b = out.basics
  for (const line of lines) {
    for (const piece of splitPieces(line.text)) {
      const email = piece.match(EMAIL)
      const bare = piece.replace(/^[a-z ]{2,10}:\s*/i, '').replace(/\s*\([^)]*\)$/, '') // "Tel: x", "x (Mobile)", "url (LinkedIn)"
      if (/^\([^)]*\)$/.test(piece)) continue // "(LinkedIn)" wrapped onto its own line
      if (email && !b.email) b.email = email[0]
      else if (digits(bare) >= 7 && /^[+\d\s().-]+$/.test(bare)) b.phone ||= bare
      else if (URLISH.test(bare) && !/\s/.test(bare)) addUrl(b, bare)
      else if (LOCATION.test(piece) && !b.location.city) {
        const parts = piece.split(',').map((s) => s.trim())
        b.location = { city: parts[0], region: parts[parts.length - 1] }
      } else if (allowLabel && !b.label && piece.length < 80 && !piece.endsWith('.')) b.label = piece
      else if (allowLabel && (piece.length >= 80 || piece.endsWith('.'))) b.summary = [b.summary, piece].filter(Boolean).join(' ')
      else unparsed.push(piece)
    }
  }
}

function addUrl(basics, url) {
  const host = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase()
  const network = PROFILE_SITES[host]
  if (network) basics.profiles.push({ network, url })
  else if (!basics.url) basics.url = url
}

// Split a section into entries anchored on date lines.
function parseEntries(lines, isEducation) {
  const anchorRe = isEducation ? new RegExp(`${RANGE.source}|${DATE_RE}`, 'i') : RANGE
  const anchors = lines.map((l, i) => (!isBullet(l.text) && anchorRe.test(l.text) ? i : -1)).filter((i) => i >= 0)
  if (!anchors.length) return { entries: [], rest: lines.map((l) => l.text) }

  const isHead = (l) => l && !isBullet(l.text) && l.text.length < 80 && !/[.;]$/.test(l.text.trim())
  const dated = anchors.map((a) => {
    const text = lines[a].text
    const range = text.match(RANGE)
    const dateText = range ? range[0] : text.match(SINGLE_DATE)[0]
    const remainder = text.replace(dateText, '').replace(/\([^)]*\d[^)]*\)|\(\s*\)/g, '').replace(/^[\s,|·•–—-]+|[\s,|·•–—-]+$/g, '').trim()
    return { range, dateText, remainder }
  })
  // Title lines sit above a bare date line (LinkedIn style); a "Title   date" work line starts its own entry
  // (looking back there would steal the previous entry's wrapped bullet lines).
  let prevEnd = 0
  const starts = anchors.map((a, k) => {
    let s = a
    if (isEducation || !dated[k].remainder) while (s - 1 >= prevEnd && a - (s - 1) <= 2 && isHead(lines[s - 1])) s--
    prevEnd = a + 1
    return s
  })
  const rest = lines.slice(0, starts[0]).map((l) => l.text)

  const entries = anchors.map((a, k) => {
    const { range, dateText, remainder } = dated[k]
    const end = k + 1 < anchors.length ? starts[k + 1] : lines.length
    const head = lines.slice(starts[k], a).map((l) => l.text.trim())
    const body = lines.slice(a + 1, end).map((l) => l.text)
    if (remainder) {
      head.push(remainder)
      // "Position   Jan 2020 – Present" then "Company — City" on the next line.
      if (body.length && isHead(lines[a + 1])) head.push(body.shift().trim())
    }
    const startDate = range ? toIso(range[1]) : ''
    const endDate = range ? toIso(range[2]) : toIso(dateText)
    return { head, body, startDate, endDate, fromAnchor: Boolean(remainder) }
  })
  return { entries, rest }
}

function splitBody(body) {
  const highlights = []
  const summary = []
  let lastWasBullet = false
  for (const raw of body) {
    const t = raw.trim()
    if (!t) continue
    if (isBullet(t)) { highlights.push(unbullet(t)); lastWasBullet = true }
    else if (lastWasBullet) highlights[highlights.length - 1] += ' ' + t // wrapped bullet
    else summary.push(t)
  }
  return { highlights, summary: summary.join(' ') }
}

const dash = (s) => s.split(/\s+[—–|]\s+|\s+-\s+/).map((p) => p.trim()).filter(Boolean)

function parseWork(lines) {
  const { entries, rest } = parseEntries(lines, false)
  const work = entries.map(({ head, body, startDate, endDate, fromAnchor }) => {
    let position = '', name = '', location = ''
    const at = head.length === 1 && head[0].match(/^(.+?)\s+(?:at|@|na|no|chez|en)\s+(.+)$/i)
    if (at) [, position, name] = at
    else if (head.length === 1 && dash(head[0]).length > 1) [position, name, location = ''] = dash(head[0])
    else if (fromAnchor) { position = head[0]; [name = '', location = ''] = head[1] ? dash(head[1]) : [] }
    else { name = head[0] ?? ''; position = head.slice(1).join(' ') } // LinkedIn: Company / Title / dates
    if (!location && body.length && LOCATION.test(body[0].trim())) location = body.shift().trim()
    const { highlights, summary } = splitBody(body)
    return { name, position, location, startDate, endDate, summary, highlights }
  })
  return { work, rest }
}

function parseEducation(lines) {
  const { entries, rest } = parseEntries(lines, true)
  const education = entries.map(({ head, body, startDate, endDate }) => {
    const pieces = head.flatMap(dash)
    const i = Math.max(0, pieces.findIndex((p) => INSTITUTION.test(p)))
    const institution = pieces[i] ?? ''
    let others = pieces.filter((_, j) => j !== i)
    if (others.length === 1) others = others[0].split(/,\s+/) // "Mestrado, Engenharia Informática"
    const [studyType = '', area = ''] = others
    const { highlights, summary } = splitBody(body)
    return { institution, studyType, area, startDate, endDate, score: '', courses: [], summary, highlights }
  })
  return { education, rest }
}

const listItems = (lines) => lines.flatMap((l) => unbullet(l.text).replace(/\)\s+[-–—]\s+/g, '), ').split(/\s*[,;•·|]\s*/)).map((s) => s.trim()).filter(Boolean)

function parseSkills(lines) {
  const loose = []
  const skills = []
  for (const l of lines) {
    const m = unbullet(l.text).match(/^([^:]{2,40}):\s*(.+)$/)
    if (m) skills.push({ name: m[1].trim(), level: '', keywords: listItems([{ text: m[2] }]) })
    else loose.push(l)
  }
  if (loose.length) skills.push({ name: '', level: '', keywords: listItems(loose) })
  return skills
}

function parseLanguages(lines) {
  return listItems(lines).map((item) => {
    const m = item.match(/^(.+?)\s*(?:\(|:|\s[-–—]\s)\s*(.+?)\)?$/)
    return m ? { language: m[1].trim(), fluency: m[2].trim() } : { language: item, fluency: '' }
  })
}

function parseCertificates(lines) {
  return lines.map((l) => {
    let t = unbullet(l.text)
    const d = t.match(SINGLE_DATE)
    const date = d ? toIso(d[0]) : ''
    if (d) t = t.replace(d[0], '').replace(/\(\s*\)/, '').replace(/[\s,–—-]+$/, '').trim()
    const [name, issuer = ''] = dash(t)
    return { name: name ?? t, issuer, date, url: '' }
  }).filter((c) => c.name)
}

// The language whose template headings best match the CV's own section titles.
function detectLanguage(titles) {
  const words = titles.flatMap((t) => t.split(' '))
  let best = 'en', bestHits = 0
  for (const [lang, l] of Object.entries(LABELS)) {
    const vocab = [l.summary, l.work, l.education, l.skills, l.languages, l.certificates].map(norm)
    const hits = words.filter((w) => vocab.includes(w)).length
    if (hits > bestHits) [best, bestHits] = [lang, hits]
  }
  return best
}

/** @param {{text: string, size: number, page: number}[]} lines */
export function parse(lines) {
  const out = empty()
  const unparsed = []
  lines = lines.filter((l) => l.text.trim())
  const bodySize = median(lines.map((l) => l.size))

  const sections = [{ key: 'header', title: '', lines: [] }]
  for (const line of lines) {
    const key = headingOf(line, bodySize)
    if (key === 'other' && sections.length === 1) sections[0].lines.push(line) // caps name/title in the header
    else if (key) sections.push({ key, title: line.text.trim(), lines: [] })
    else sections[sections.length - 1].lines.push(line)
  }

  for (const { key, title, lines: ls } of sections) {
    const text = () => ls.map((l) => l.text.trim()).join(' ')
    if (key === 'header') parseHeader(ls, out, unparsed)
    else if (key === 'contact') parseContacts(ls, out, unparsed, false)
    else if (key === 'summary') out.basics.summary = [out.basics.summary, text()].filter(Boolean).join(' ')
    else if (key === 'work') { const r = parseWork(ls); out.work.push(...r.work); if (r.rest.length) unparsed.push(title, ...r.rest) }
    else if (key === 'education') { const r = parseEducation(ls); out.education.push(...r.education); if (r.rest.length) unparsed.push(title, ...r.rest) }
    else if (key === 'skills') out.skills.push(...parseSkills(ls))
    else if (key === 'languages') out.languages.push(...parseLanguages(ls))
    else if (key === 'certificates') out.certificates.push(...parseCertificates(ls))
    else if (ls.length) unparsed.push('', title, ...ls.map((l) => l.text))
  }

  out.meta.language = detectLanguage(sections.slice(1).map((s) => norm(s.title)))

  // Contacts are sometimes in a footer or sidebar instead of the header.
  const all = lines.map((l) => l.text).join('\n')
  if (!out.basics.email) out.basics.email = all.match(EMAIL)?.[0] ?? ''

  return { resume: out, unparsed: unparsed.join('\n').trim() }
}
