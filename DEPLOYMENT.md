# Deployment / Shareable Link

## Fastest live demo option: local + ngrok

1. Start the app:

```bash
npm install
npm start
```

2. In another terminal, expose it:

```bash
ngrok http 3030
```

3. Restart with the public URL so generated PDFs include the right share link:

```bash
PUBLIC_BASE_URL=https://YOUR-NGROK-URL.ngrok-free.app npm start
```

Use the ngrok URL as the shareable app link.

## Hosted option: Render

This repo includes `render.yaml`.

1. Push the repo to GitHub.
2. Create a new Render Blueprint/Web Service from the repo.
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. After deploy, set:

```bash
PUBLIC_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

Then redeploy once.

## Docker option

```bash
docker build -t roof-estimate-report .
docker run --rm -p 3030:3030 roof-estimate-report
```

Open http://localhost:3030

## Notes

- Generated reports are stored in `data/` and `reports/` on local disk.
- On free ephemeral hosting, reports may disappear after redeploy/restart unless persistent disk is configured.
- For a hackathon demo, that is usually fine; generate the reports right before submission or include `sample-output/` artifacts in the repo.
