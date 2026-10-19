# Libre CV

Free, open-source CV editor at **[libre-cv.org](https://libre-cv.org)**.

Import your CV from a PDF, fix it up in a form, and export a clean PDF in a classic single-column template.
No account, no upload, no tracking: **everything runs in your browser** and your CV never leaves your device.

## How it works

- **Import (PDF only)** — [pdf.js](https://mozilla.github.io/pdf.js/) extracts the text. If the PDF is a scan
  (no text layer), [tesseract.js](https://tesseract.projectnaptha.com/) runs OCR locally (English + Portuguese).
- **Columns** — `src/lines.js` rebuilds reading order, including two-column / sidebar layouts such as LinkedIn's
  PDF export (each column is read whole; "title | dates" rows and Europass date columns are left intact).
- **Parse** — `src/parse.js` turns text lines into a [JSON Resume](https://jsonresume.org) object using section
  headings (English, Portuguese, French, Spanish), date ranges and contact patterns. No AI. Anything it can't place
  is shown to you instead of being dropped.
- **Edit** — form on the left, live preview on the right. Autosaved to `localStorage`.
  *Save JSON* / *Open JSON* to back up or move between devices.
- **Export** — *Download PDF* uses the browser's print dialog ("Save as PDF"). The result is real, selectable text
  that ATS / AI screeners read reliably — and that Libre CV itself re-imports exactly.

## Privacy

No backend, no database, no cookies, no analytics. All fonts, workers, WASM and OCR language data are self-hosted
(`scripts/copy-assets.js` copies them from `node_modules` into `public/vendor`), and a strict
Content-Security-Policy (`public/_headers`) stops the page from contacting any other server. See `public/privacy.html` (served at `/privacy`).

## Development

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # parser tests
npm run build   # runs the tests, then builds the static site in dist/
```

The project is a plain static site: `dist/` can be hosted anywhere.

## Deployment (Cloudflare Workers)

The site is deployed as a static-assets-only Worker (`wrangler.jsonc`): no server code runs, Cloudflare just serves
`dist/` with the headers from `public/_headers`.

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository → `guipguia/libre-cv`.
2. Deploy command `npx wrangler deploy` (the default). Wrangler runs `npm run build` itself, which runs the
   parser tests first, so a change that breaks them fails the deploy instead of going live.
3. Settings → Domains & Routes → add custom domain `libre-cv.org`. For `www.libre-cv.org`, add it too and create a
   redirect rule (Rules → Redirect Rules → "Redirect from WWW to root").
4. Keep Web Analytics and Workers Logs **off**.

Pushes to `main` deploy to production.

## Contributing

The parser is where help matters most. If a CV imports badly, add a text fixture to `src/parse.test.js`
(anonymised!) and make it pass.

## License

MIT
