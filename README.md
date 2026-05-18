# simonives.com

Personal website of **Simon Ives, FCPHR, MBA** — practitioner-writer at the intersection of workforce strategy, AI governance, and organisational design.

Live at [simonives.com](https://www.simonives.com) · Published via GitHub Pages

---

## Purpose

This site is the professional credibility hub for Simon Ives. It sits alongside [Phronesis](https://enterprisephronesis.substack.com) — a Substack publication on practical wisdom for enterprise transformation — and LinkedIn as the third leg of a deliberate platform architecture.

The site is intentionally static: no CMS, no server-side processing, no dependency bloat. Every design and editorial decision serves a single audience — senior enterprise leaders and conference organisers arriving with a specific problem to solve.

---

## Stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | CSS3 — custom properties, no framework |
| Scripting | Vanilla JavaScript |
| Hosting | GitHub Pages — custom domain via `CNAME` |
| Contact form | [Web3Forms](https://web3forms.com) |
| Display typeface | Cormorant Garamond (Google Fonts) |
| Body typeface | Inter (Google Fonts) |

---

## Pages

| File | Display name | Role |
|---|---|---|
| `index.html` | Home | Hero, positioning, primary CTAs |
| `doctrine.html` | Approach | The three foundational practices |
| `portfolio.html` | Track Record | Career case studies and credentials |
| `briefing.html` | Submit a Briefing | Web3Forms contact form |
| `governance.html` | Privacy Policy | Data governance and privacy statement |
| `insights.html` | Phronesis ↗ | Redirects to the Phronesis Substack publication |

---

## Stylesheets

The site uses two CSS files loaded in sequence:

- `style.css` — base layer: CSS custom properties, layout primitives, dark-background defaults
- `style-v2.css` — UI uplift layer: typography, light/dark theming, component refinements

`style-v2.css` takes precedence where properties overlap. The cascade is intentional.

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

## Contact form

The briefing form on `briefing.html` is processed by [Web3Forms](https://web3forms.com). Submissions are routed to the configured email address without any server-side code on this repository. The Web3Forms access key is embedded in the form HTML — this is by design; Web3Forms keys are client-side credentials intended to be public.

The `form-backend.gs` file in this repository is a legacy Google Apps Script from an earlier implementation. It is retained for reference but is not active.

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
