# Dispenza — client preview

Static preview of the Dispenza dispensary-marketing site. **27 pages**, dark theme,
no build step — open `index.html` or browse the live preview.

**Live:** https://carlcelinodspnza.github.io/dispenza/
**Page index:** https://carlcelinodspnza.github.io/dispenza/_contents.html

## Status

This is a **preview for client review**, not a production site. Every page carries
`noindex, nofollow` so it cannot be picked up by search engines while it is under review.

Known open items at the time of publishing:

- `performance-marketing` carries 2 real photographs against an internal floor of 3.
- Its BOOK DEMO button appears once where the source copy has it twice — a pending
  content decision, not an omission.
- Two source-copy contradictions are carried **unrepaired and on purpose**, because the
  client has not yet chosen between them: "thousands" vs "over 6,000" clients, and two
  different named acquirers on the nuleafnv case study.
- Deliberate typos in the source copy ("tour" for "your", a comma splice) are reproduced
  as written rather than silently corrected.

## Layout

```
index.html          the home page
_contents.html      a browsable index of all 27 pages
*.html              the remaining pages, flat at the root
_design/            tokens, chrome, structural CSS + the motion engines
assets/             photography, logos, generated imagery
```

`.nojekyll` is required: without it GitHub Pages drops every `_`-prefixed path, which
would remove the whole `_design` tree and the page index.

## Motion

Reveals, counters and parallax are in `_design/page-effects.js`. The drifting smoke fields
run on `_design/smoke-engine.js` with per-section emitters; the hero's plume is anchored to
`.mc-hero__content`, so it sits behind the headline. The hero once carried a 3D `model-viewer`
coin — it was 86% of the page weight and has been removed along with its runtime, Draco decoder
and HDR. Everything honours `prefers-reduced-motion`, and the
reveal layer fails open — with scripting off, nothing is hidden.
