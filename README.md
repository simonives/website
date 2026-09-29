# simonives.com

Personal website of **Simon Ives, FCPHR, MBA** — practitioner-writer at the intersection of workforce strategy, AI governance, and organisational design.

Live at [simonives.com](https://simonives.com) · Published via GitHub Pages

---

## Purpose

This site is the professional credibility hub for Simon Ives. It sits alongside [Phronesis](https://enterprisephronesis.substack.com) — a Substack publication on practical wisdom for enterprise transformation — and LinkedIn as the third leg of a deliberate platform architecture.

The site is intentionally static: no CMS, no server-side processing, no dependency bloat. Every design and editorial decision serves a single audience — senior enterprise leaders and conference organisers arriving with a specific problem to solve.

---

## Stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | CSS3, custom properties, no framework |
| Scripting | Vanilla JavaScript |
| Hosting | GitHub Pages, custom domain via `CNAME` |
| Analytics | Cloudflare Web Analytics |
| Display typeface | Cormorant Garamond (self-hosted) |
| Body typeface | Inter (self-hosted) |

---

## Pages

| File | Display name | Role |
|---|---|---|
| `index.html` | Home | Hero, positioning, primary CTAs |
| `doctrine.html` | Approach | The three foundational practices |
| `portfolio.html` | Track Record | Career case studies and credentials |
| `now.html` | Now | Current focus and activity |
| `governance.html` | Privacy Policy | Data governance and privacy statement |
| `404.html` | Not Found | Custom 404 page |

---

## Stylesheets

The site loads three CSS files in sequence:

- `fonts.css`, self-hosted `@font-face` declarations for Cormorant Garamond and Inter
- `tokens.css`, design tokens: colour palette, spacing scale, elevation, shape
- `components.css`, layout primitives and component styling, built on the tokens above

---

## Deployment

The `main` branch deploys automatically to GitHub Pages. No build step is required — files are served as-is.

The custom domain `simonives.com` is configured via the `CNAME` file in the repository root. DNS is managed externally.

**Branch strategy:**

| Branch | Purpose |
|---|---|
| `main` | Production — live at simonives.com |
| `dev` | Active development — raise a pull request to `main` when ready |

Changes should always go through `dev` before merging to `main`. This prevents accidental deployment of incomplete work to the live site.

---

## Brand reference

Full brand, voice, and content standards are maintained in the Phronesis Claude Project system document. All content decisions on this site are governed by those standards.

### Colour palette

| Token | Hex | Usage |
|---|---|---|
| Midnight | `#1D1832` | Primary dark background |
| Aurum | `#C4962A` | Accent — headings, CTAs, Φ mark |
| Parchment | `#F7F4EE` | Light section backgrounds |
| Slate | `#4A4468` | Secondary text, dividers |

### Typography

| Role | Typeface |
|---|---|
| H1, H2 (display) | Cormorant Garamond — serif |
| Body, UI | Inter — system sans-serif |
| Labels, metadata | Inter — uppercase, tracked |

### Voice

Precise, authoritative, practitioner-led. Australian English throughout — organisation, labour, programme, colour, centre, authorise. Active voice as default. Average sentence length ≤ 25 words.

---

## Security headers

All response headers below are set at the Cloudflare edge (zone `simonives.com`), not in this repository's code. They're documented here so the repo stays the source of truth for what's configured, even though the config itself lives in Cloudflare.

| Header | Value | Configured via |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'sha256-SxngmtwIFkM1er6fAlc6RCB8lSGI1V1xQuppqyQzU5Y='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` | Response Header Transform Rule |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Response Header Transform Rule |
| `X-Frame-Options` | `DENY` | Response Header Transform Rule |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()` | Response Header Transform Rule |
| `Strict-Transport-Security` | `max-age=15552000` (180 days), no `includeSubDomains`, no `preload` | Zone SSL/TLS settings |

Notes:
- `script-src` uses a sha256 hash rather than `'unsafe-inline'`, generated from the single shared inline theme script (`scripts/csp-hashes.sh`, checked in CI). The mobile nav, header scroll, theme toggle, and reveal-on-scroll logic all live in `site.js`, loaded with `defer`, and don't need a hash since they're not inline.
- `style-src` still permits `'unsafe-inline'`: one inline `style=` attribute exists (`now.html`) and removing it isn't worth the churn for a static site with no user input.
- HSTS `includeSubDomains` is deliberately left off. It has no effect on the domain's MX records (HSTS only governs HTTPS browser behaviour, never mail delivery), but there's currently no subdomain besides `www` (which redirects to the apex), so there's nothing to gain from it yet and no reason to pre-commit every future subdomain to HTTPS-only before it exists.

---

## Maintenance notes

- Edit the corresponding `.html` file to update any page's content
- Australian English is non-negotiable throughout
- Page titles follow the format: `[Page name] — Simon Ives`
- The `lang` attribute should remain `en-AU`
- Do not commit sensitive credentials, environment files, test payloads, or form artefacts
- Run changes through `dev` before merging to `main`

---

## Related platforms

| Platform | URL | Purpose |
|---|---|---|
| Phronesis (Substack) | [enterprisephronesis.substack.com](https://enterprisephronesis.substack.com) | Primary publication |
| LinkedIn | [linkedin.com/in/simonives](https://www.linkedin.com/in/simonives) | Professional network |

---

*© 2026 Simon Ives. All rights reserved. See [LICENSE](LICENSE) for terms.*
