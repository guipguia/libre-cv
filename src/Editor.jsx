// Form editor. "lines" fields edit string arrays one item per line (round-trips exactly while typing).
const SECTIONS = [
  ['work', 'Experience', [['position', 'Position'], ['name', 'Company'], ['location', 'Location'], ['startDate', 'Start (YYYY-MM)'],
    ['endDate', 'End (YYYY-MM, empty = Present)'], ['summary', 'Description', 'textarea'], ['highlights', 'Achievements (one per line)', 'lines']]],
  ['education', 'Education', [['institution', 'School / University'], ['studyType', 'Degree'], ['area', 'Field of study'],
    ['startDate', 'Start (YYYY-MM)'], ['endDate', 'End (YYYY-MM)'], ['summary', 'Notes', 'textarea']]],
  ['skills', 'Skills', [['name', 'Group (optional, e.g. "Languages")'], ['keywords', 'Skills (one per line)', 'lines']]],
  ['languages', 'Languages', [['language', 'Language'], ['fluency', 'Level (e.g. Native, C1)']]],
  ['certificates', 'Certifications', [['name', 'Name'], ['issuer', 'Issuer'], ['date', 'Date (YYYY-MM)'], ['url', 'Link']]],
]

function Field({ label, type, value, onChange }) {
  const props = { value: type === 'lines' ? (value ?? []).join('\n') : value ?? '' }
  const set = (e) => onChange(type === 'lines' ? e.target.value.split('\n') : e.target.value)
  return (
    <label>
      {label}
      {type ? <textarea rows={type === 'lines' ? 4 : 3} {...props} onChange={set} /> : <input {...props} onChange={set} />}
    </label>
  )
}

function List({ title, items, fields, onChange }) {
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i, d) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <fieldset>
      <legend>{title}</legend>
      {items.map((item, i) => (
        <div className="item" key={i}>
          {fields.map(([key, label, type]) => (
            <Field key={key} label={label} type={type} value={item[key]} onChange={(v) => update(i, { [key]: v })} />
          ))}
          <div className="item-actions">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, {}])}>+ Add</button>
    </fieldset>
  )
}

export default function Editor({ resume, onChange }) {
  const b = resume.basics
  const setBasics = (patch) => onChange({ ...resume, basics: { ...b, ...patch } })
  const basic = (key, label, type) => <Field label={label} type={type} value={b[key]} onChange={(v) => setBasics({ [key]: v })} />
  return (
    <form className="editor" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>Personal details</legend>
        {basic('name', 'Full name')}
        {basic('label', 'Headline (e.g. Senior Software Engineer)')}
        {basic('email', 'Email')}
        {basic('phone', 'Phone')}
        <Field label="City" value={b.location?.city} onChange={(city) => setBasics({ location: { ...b.location, city } })} />
        <Field label="Country / Region" value={b.location?.region} onChange={(region) => setBasics({ location: { ...b.location, region } })} />
        {basic('url', 'Website')}
        {basic('summary', 'Summary (2–4 sentences)', 'textarea')}
      </fieldset>
      <List title="Profiles (LinkedIn, GitHub…)" items={b.profiles ?? []} fields={[['network', 'Network'], ['url', 'Link']]}
        onChange={(profiles) => setBasics({ profiles })} />
      {SECTIONS.map(([key, title, fields]) => (
        <List key={key} title={title} items={resume[key] ?? []} fields={fields} onChange={(v) => onChange({ ...resume, [key]: v })} />
      ))}
    </form>
  )
}
