// The classic single-column template. Kept deliberately plain so ATS / AI parsers read it reliably:
// real text, standard headings, contacts in the body, one date format.
import { LABELS } from './parse.js'

function fmt(date, l) {
  const m = /^(\d{4})-(\d{2})/.exec(date || '')
  return m ? `${l.months[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : date || ''
}
const range = (start, end, l) => (start ? `${fmt(start, l)} – ${end ? fmt(end, l) : l.present}` : fmt(end, l))
const join = (sep, ...parts) => parts.filter(Boolean).join(sep)
const has = (list) => list?.length > 0

function Section({ title, show, children }) {
  return show ? <section><h2>{title}</h2>{children}</section> : null
}

function Entry({ title, date, subtitle, summary, highlights }) {
  return (
    <div className="entry">
      <div className="row"><strong>{title}</strong><span>{date}</span></div>
      {subtitle && <div className="row">{subtitle}</div>}
      {summary && <p>{summary}</p>}
      {/* "•" is real text: list markers aren't in the PDF text layer, and parsers rely on it. */}
      {highlights?.some(Boolean) && <ul>{highlights.filter(Boolean).map((h, i) => <li key={i}>• {h}</li>)}</ul>}
    </div>
  )
}

export default function Resume({ resume }) {
  const { basics: b, work, education, skills, languages, certificates } = resume
  const lang = LABELS[resume.meta?.language] ? resume.meta.language : 'en'
  const l = LABELS[lang]
  const contact = [b.email, b.phone, join(', ', b.location?.city, b.location?.region), ...(b.profiles ?? []).map((p) => p.url), b.url]
  return (
    <article className="cv" lang={lang}>
      <header>
        <h1>{b.name || 'Your Name'}</h1>
        {b.label && <p className="label">{b.label}</p>}
        <p>{join(' · ', ...contact)}</p>
      </header>
      <Section title={l.summary} show={b.summary}><p>{b.summary}</p></Section>
      <Section title={l.work} show={has(work)}>
        {work.map((w, i) => (
          <Entry key={i} title={w.position || w.name} date={range(w.startDate, w.endDate, l)}
            subtitle={w.position ? join(' — ', w.name, w.location) : w.location} summary={w.summary} highlights={w.highlights} />
        ))}
      </Section>
      <Section title={l.education} show={has(education)}>
        {education.map((e, i) => (
          <Entry key={i} title={e.institution} date={range(e.startDate, e.endDate, l)}
            subtitle={join(' — ', e.studyType, e.area)} summary={e.summary} highlights={e.highlights} />
        ))}
      </Section>
      <Section title={l.skills} show={has(skills)}>
        {skills.map((s, i) => {
          const list = (s.keywords ?? []).filter(Boolean).join(', ')
          return <p key={i}>{s.name ? <><strong>{s.name}:</strong> {list}</> : list}</p>
        })}
      </Section>
      <Section title={l.languages} show={has(languages)}>
        <p>{languages.map((l) => (l.fluency ? `${l.language} (${l.fluency})` : l.language)).join(' · ')}</p>
      </Section>
      <Section title={l.certificates} show={has(certificates)}>
        {certificates.map((c, i) => (
          <p key={i}>{join(' — ', c.name, c.issuer)}{c.date && ` (${fmt(c.date, l)})`}</p>
        ))}
      </Section>
    </article>
  )
}
