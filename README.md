# Preliminary Roof Estimate Report MVP

A small web app that turns a property address into a transparent budgetary roof-area estimate, quote-ready line items, a PDF report, and a shareable report page.

## Live demo

https://roof-measure-report.fly.dev

Use this link for judging/demo access. Generated report pages and PDFs are shareable from the app.

## Quick start locally

```bash
npm install
npm start
```

Open: http://localhost:3030

## Generate sample submission artifacts

```bash
npm run samples
```

This writes sample PDFs and a summary to `sample-output/`.

## Public/share URL

If running behind ngrok or a hosted URL, set `PUBLIC_BASE_URL` so PDFs include the correct link:

```bash
PUBLIC_BASE_URL=https://your-ngrok-or-hosted-url npm start
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for ngrok, Render, and Docker options.

## What it does

- Accepts a property address
- Infers a baseline footprint/pitch from regional residential priors, or accepts a known building footprint override
- Calculates roof area as `footprint × pitch multiplier × complexity factor`
- Adds waste and rounds to roofing squares
- Produces a line-item estimate
- Generates:
  - share page: `/r/:id`
  - PDF: `/reports/:id.pdf`
  - JSON: `/api/reports/:id`

## Important limitation

This MVP is honest and deterministic, but it does **not** trace aerial imagery yet. Treat it as a preliminary budgetary estimate, not a commercial roof measurement report.

For competition-grade accuracy, replace `src/estimator.js` footprint inference with one of:

1. Manual roof polygon tracing over map imagery
2. Google/Mapbox/Mapillary imagery + computer vision segmentation
3. Parcel/building footprint API + pitch inference
4. Roof-plane inputs: plane polygon + pitch per plane, then sum `plan area × pitch multiplier`

## Submission help

See [`SUBMISSION_CHECKLIST.md`](./SUBMISSION_CHECKLIST.md).

## Files

- `server.js` — Express app, validation, and report routes
- `src/estimator.js` — measurement + estimate logic
- `src/reportPdf.js` — PDF generation
- `public/style.css` — UI styles
- `data/reports.json` — generated local report metadata
- `reports/*.pdf` — generated local PDFs
- `sample-output/` — optional generated artifacts for submission/demo
