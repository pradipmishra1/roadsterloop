# Roadster Loop

Static site: no build step. Upload the whole folder to any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages, or your own server).

Files: index.html, style.css, game.js, privacy.html, ads.txt, robots.txt

Before launch:
1. Put your real ad-network line in ads.txt (must be served at /ads.txt on your domain root).
2. Add your contact email in privacy.html.
3. Test locally with `python -m http.server 8000`.

Unofficial fan game, not affiliated with Tesla. All car design and branding is original.
