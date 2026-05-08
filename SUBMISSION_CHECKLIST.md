# Submission Checklist

Before submitting:

- [ ] App runs with `npm start`
- [ ] Smoke check passes with `npm run smoke`
- [ ] Generate sample artifacts with `npm run samples`
- [ ] Public/share URL works
- [ ] PDF download works from a generated report page
- [ ] README clearly explains the method and limitations
- [ ] Repo is public for judges
- [ ] Submission includes:
  - [ ] Team name + members
  - [ ] Approach summary
  - [ ] Public GitHub repo link
  - [ ] Shareable app/demo link
  - [ ] Sample output PDFs or hosted report URLs
  - [ ] Total sqft values for each required address

## Suggested approach summary

This prototype generates a preliminary roof estimate from an address using transparent assumptions: regional footprint priors, pitch multipliers, roof complexity, waste, and roofing-square pricing. It produces a shareable report page and PDF with line-item costs and audit notes. The current MVP is honest about uncertainty and is designed to be upgraded with traced roof-plane polygons or building-footprint data for higher measurement accuracy.

## Suggested demo flow

1. Open the app.
2. Enter one property address.
3. Show the generated report metrics.
4. Download the PDF.
5. Explain the upgrade path: trace/import roof planes, calculate each plane by pitch, then reduce uncertainty.
