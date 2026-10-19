import { expect, test } from 'vitest'
import { parse, toIso } from './parse.js'

// Fixture: first line is the name (big font), everything else body size.
const lines = (text) => text.trim().split('\n').map((t, i) => ({ text: t, size: i === 0 ? 20 : 10, page: 1 }))

test('dates', () => {
  expect(toIso('Mar 2020')).toBe('2020-03')
  expect(toIso('março de 2019')).toBe('2019-03')
  expect(toIso('03/2019')).toBe('2019-03')
  expect(toIso('2018')).toBe('2018')
  expect(toIso('Present')).toBe('')
  expect(toIso('Févr. 2020')).toBe('2020-02')
  expect(toIso('Juil. 2021')).toBe('2021-07')
})

test('classic Word-style CV (and our own export layout)', () => {
  const { resume, unparsed } = parse(lines(`
Jane Doe
Senior Software Engineer
jane@example.com · +351 912 345 678 · Lisbon, Portugal · linkedin.com/in/janedoe · janedoe.dev
Summary
Engineer with 10 years of experience building web apps.
Experience
Senior Engineer Mar 2020 – Present
Acme Corp — Lisbon
Leads the payments team.
• Built the billing system
• Cut cloud costs by 30% across all
services and environments
Developer Jan 2015 - Feb 2020
Beta Ltd
• Wrote things
Education
University of Lisbon 2010 – 2014
BSc — Computer Science
Skills
Languages: JavaScript, Python
Docker, Kubernetes
Languages
English (Native) · Portuguese (Fluent)
Certifications
AWS Solutions Architect — Amazon (Jun 2021)
PROJECTS
Libre CV, an open-source CV editor
`))
  expect(resume.basics).toMatchObject({
    name: 'Jane Doe', label: 'Senior Software Engineer', email: 'jane@example.com', phone: '+351 912 345 678',
    url: 'janedoe.dev', location: { city: 'Lisbon', region: 'Portugal' },
    profiles: [{ network: 'LinkedIn', url: 'linkedin.com/in/janedoe' }],
    summary: 'Engineer with 10 years of experience building web apps.',
  })
  expect(resume.work).toEqual([
    { position: 'Senior Engineer', name: 'Acme Corp', location: 'Lisbon', startDate: '2020-03', endDate: '',
      summary: 'Leads the payments team.', highlights: ['Built the billing system', 'Cut cloud costs by 30% across all services and environments'] },
    { position: 'Developer', name: 'Beta Ltd', location: '', startDate: '2015-01', endDate: '2020-02', summary: '', highlights: ['Wrote things'] },
  ])
  expect(resume.education[0]).toMatchObject({ institution: 'University of Lisbon', studyType: 'BSc', area: 'Computer Science', startDate: '2010', endDate: '2014' })
  expect(resume.skills).toEqual([
    { name: 'Languages', level: '', keywords: ['JavaScript', 'Python'] },
    { name: '', level: '', keywords: ['Docker', 'Kubernetes'] },
  ])
  expect(resume.languages).toEqual([{ language: 'English', fluency: 'Native' }, { language: 'Portuguese', fluency: 'Fluent' }])
  expect(resume.certificates).toEqual([{ name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2021-06', url: '' }])
  expect(unparsed).toBe('PROJECTS\nLibre CV, an open-source CV editor') // unknown sections are kept, never dropped
})

test('LinkedIn "Save to PDF" layout', () => {
  const { resume } = parse(lines(`
John Smith
Product Manager at Globex
Experience
Globex
Product Manager
January 2021 - Present (3 years 10 months)
Porto, Portugal
Owns the mobile roadmap.
Initech
Analyst
June 2018 - December 2020 (2 years 7 months)
Education
Universidade do Porto
Mestrado, Engenharia Informática · (2016 - 2018)
`))
  expect(resume.basics.label).toBe('Product Manager at Globex')
  expect(resume.work).toMatchObject([
    { name: 'Globex', position: 'Product Manager', startDate: '2021-01', endDate: '', location: 'Porto, Portugal', summary: 'Owns the mobile roadmap.' },
    { name: 'Initech', position: 'Analyst', startDate: '2018-06', endDate: '2020-12' },
  ])
  expect(resume.education[0]).toMatchObject({ institution: 'Universidade do Porto', startDate: '2016', endDate: '2018' })
})

test('OCR quirks: "·" read as "-", "•" read as "«"', () => {
  const { resume } = parse(lines(`
Jane Doe
jane@example.com - +351 912 345 678 - Lisbon, Portugal - linkedin.com/in/janedoe
Experience
Senior Engineer Mar 2020 — Present
Acme Corp — Lisbon
« Built the billing system
Languages
English (Native) - Portuguese (Fluent)
`))
  expect(resume.basics).toMatchObject({ phone: '+351 912 345 678', location: { city: 'Lisbon', region: 'Portugal' } })
  expect(resume.basics.profiles).toHaveLength(1)
  expect(resume.work[0].highlights).toEqual(['Built the billing system'])
  expect(resume.languages).toEqual([{ language: 'English', fluency: 'Native' }, { language: 'Portuguese', fluency: 'Fluent' }])
})

test('Portuguese CV', () => {
  const { resume } = parse(lines(`
Ana Costa
ana.costa@mail.pt | 912 345 678
Experiência Profissional
Engenheira de Dados 03/2019 - atual
Banco XPTO
Formação Académica
Instituto Superior Técnico 2013 - 2018
Mestrado — Engenharia Informática
Idiomas
Inglês - C1, Espanhol - B2
`))
  expect(resume.basics).toMatchObject({ name: 'Ana Costa', email: 'ana.costa@mail.pt', phone: '912 345 678' })
  expect(resume.work[0]).toMatchObject({ position: 'Engenheira de Dados', name: 'Banco XPTO', startDate: '2019-03', endDate: '' })
  expect(resume.education[0]).toMatchObject({ institution: 'Instituto Superior Técnico', studyType: 'Mestrado', area: 'Engenharia Informática' })
  expect(resume.languages).toEqual([{ language: 'Inglês', fluency: 'C1' }, { language: 'Espanhol', fluency: 'B2' }])
  expect(resume.meta.language).toBe('pt')
})

test('French export layout re-imports, including localised dates', () => {
  const { resume } = parse(lines(`
Marie Curie
EXPÉRIENCE
Chercheuse   Févr. 2020 – Présent
Institut Pasteur — Paris
FORMATION
Université de Paris   2014 – 2019
Doctorat — Physique
`))
  expect(resume.meta.language).toBe('fr')
  expect(resume.work[0]).toMatchObject({ position: 'Chercheuse', name: 'Institut Pasteur', location: 'Paris', startDate: '2020-02', endDate: '' })
  expect(resume.education[0]).toMatchObject({ institution: 'Université de Paris', studyType: 'Doctorat', area: 'Physique' })
})
