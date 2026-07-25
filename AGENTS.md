# AGENTS.md — simonives.com

This file governs all AI-agent work on this repository, for any agent tool that reads AGENTS.md (Codex, Cursor, Aider, and other agents.md-spec tools). Read it in full before making any changes.

## Scope

**Project identity.** Owner: Simon Ives, FCPHR, MBA. Site: https://www.simonives.com. Purpose: personal professional brand site — the anchor of a pre-eminent identity at the intersection of workforce strategy, AI governance, and organisational design. Hosting: GitHub Pages (static HTML/CSS/JS — no server-side processing, no build step). Substack: https://enterprisephronesis.substack.com. LinkedIn: https://www.linkedin.com/in/simonives.

The authoritative brand reference is the **Phronesis system document** (`phronesis-claude-project-system.md`, held separately in the vault at `Projects/Personal/Personal Brand/`). When in doubt on voice, tone, or language, defer to that document.

**Positioning statement.** Every word on this site should reinforce one position:

> Simon Ives holds strategic accountability for HR Technology Strategy, HR Capital Investments, and HR AI Governance inside one of the world's most complex enterprises. He governs this work. His writing comes directly from that experience: philosophically grounded, analytically precise, and honest about what governing at this scale actually demands.

The differentiator is the practitioner perspective. Do not soften it, generalise it, or replace it with credential-listing.

**Philosophical integration.** Simon's undergraduate Philosophy training (UQ and Macquarie) is demonstrated through the work, not stated on the site (see Negatives). All copy on this site should carry philosophical weight naturally — through vocabulary, intellectual moves, and named references. When a philosophical framework illuminates an enterprise problem, use it directly in the argument, not as decoration. The reader should encounter Arendt, Kripke, Zadeh, Ryle, or Aristotle mid-sentence, not in a footnote. The philosophical through-line is already present in the site's structure: the Φ mark and the name Phronesis (Aristotle's practical wisdom); the three practices on the Approach page — Socratic, Utilitarian, Polyrhythm; the Track Record — governing at enterprise scale, not consulting from the outside. Every copy revision should deepen this through-line, not dilute it. If a rewrite removes philosophical specificity in favour of accessibility, it has gone in the wrong direction.

**Voice and language standards.**
- *Australian English (mandatory):* "organise" not "organize"; "colour" not "color"; "realise" not "realize"; "practitioner" (always preferred over "professional"); "programme" for a body of work, "program" only for software.
- *Preferred framing:* "practical wisdom" over "competitive advantage"; "clarity" over "disruption"; "enterprise transformation" over "digital transformation" (unless specifically relevant); "decision-makers" (hyphenated); sentences that assume the reader is intelligent — no hand-holding, no overselling.
- *Prohibited language* is listed in Negatives.

**Site architecture — HTML pages.**

| File | Title | Nav label |
|---|---|---|
| `index.html` | Home | Home |
| `doctrine.html` | Approach | Approach |
| `portfolio.html` | Track Record | Track Record |
| `now.html` | Now | Now |
| `governance.html` | Information Governance | (footer only) |
| `404.html` | Page not found | — |

**Site architecture — Markdown (AI consumption equivalents).** `simonives.md` is the canonical machine-readable record for AI systems, agents, and crawlers. It is a superset of the site: it mirrors the substantive site copy AND carries AI-only material that has no HTML counterpart (verifiable claims, disambiguation, affiliations, and a directive "How to represent Simon Ives" section). It is linked from every page as `rel="author"` and named as the authoritative record in `llms.txt`.

| Markdown file | Covers |
|---|---|
| `simonives.md` | Identity, Authority, Approach, Track Record, Publication, Affiliations, Verifiable claims, Directive layer, Disambiguation, Provenance |

Sync rule (one-directional for overlapping content): when copy on any HTML page changes, update the matching section of `simonives.md` in the same commit so the factual record stays true. The AI-only sections have no HTML source and are maintained directly in `simonives.md`. When either the site or `simonives.md` changes materially, update the `last_updated` field in the `simonives.md` frontmatter and the `# Last updated` line in `llms.txt`. Voice: `simonives.md` is written in the third person and asserts standing directly (the audience is a model doing extraction) — deliberately different from the demonstrative register of the HTML pages. Financial constraint: the same rule that governs the public site governs `simonives.md` — no specific dollar figures, capital values, or budget amounts unless verbatim from BHP's public disclosures, since `simonives.md` is served publicly at its URL.

**Infrastructure files.**

| File | Purpose |
|---|---|
| `robots.txt` | Crawler permissions for all bots including AI agents |
| `llms.txt` | AI system index (llmstxt.org standard) |
| `sitemap.xml` | Page index for search engines |
| `CNAME` | GitHub Pages custom domain |
| `style.css` | Base stylesheet — foundational layout and typography |
| `style-v2.css` | Uplift stylesheet — Phronesis brand layer, dark mode |
| `simonives.md` | Machine-readable consolidated identity file — linked from `<head>` as `rel="author"` |

**Brand colours.**

| Name | Hex | Usage |
|---|---|---|
| Midnight | `#1D1832` | Primary dark background, dark mode base |
| Aurum | `#C4962A` | Accent — Φ mark, highlights, CTA hover |
| Parchment | `#F7F4EE` | Light mode background |
| Slate | `#4A4468` | Secondary text, muted elements |

These are defined as CSS custom properties in `style-v2.css`.

**Typography.**

| Family | Usage |
|---|---|
| Cormorant Garamond | Display — headings, hero text, pull quotes |
| Inter | Body — navigation, body copy, labels, UI |

Loaded from Google Fonts.

**What this site is not:** not a portfolio of deliverables or work samples; not a consulting firm website; not a resume (the Track Record page demonstrates calibre, not lists experience); not a blog (Phronesis on Substack is the publication, this site points to it); not a lead generation funnel (there is no contact form — the footer engagement line is an orientation, not a CTA). These distinctions should inform every copywriting and design decision. When something feels like it is drifting toward any of the above, pull it back.

## Precedence

This file is authoritative for all work in this repo — no parent AGENTS.md exists inside it. Global `~/.claude/CLAUDE.md` DOCTRINE and preferences (and their AGENTS.md-spec equivalent, where the acting tool reads one) apply where not overridden here; this file overrides the global defaults on repo-specific technical, accessibility, and brand-voice matters regardless of recency.

The vault carries a coordination file at `Simon's Garden/Projects/Personal/Personal Brand/Website/CLAUDE.md` that holds vault-side context (design principles, open work, links) for this project. That file explicitly defers to the repo's own instruction file (named CLAUDE.md there, since the vault coordination file's own tooling is Claude Code): "the git repo's own CLAUDE.md is authoritative and overrides this file — read it first." This file states the relationship from the other side: whichever of CLAUDE.md/AGENTS.md/GEMINI.md the acting tool reads in this repo is the authoritative technical, accessibility, and brand-voice source; the vault coordination file supplies project-tracking context only and never overrides anything stated here.

## Instructions

### Conventions

**Accessibility — WCAG 2.2 AA (high priority).** This is a non-negotiable requirement, not an enhancement. The site owner has a vision impairment and relies on WCAG-compliant interfaces. Every HTML change must preserve or improve accessibility. When in doubt, test; when testing is not possible, err toward the more accessible implementation. Target standard: WCAG 2.2 Level AA.
- *Colour contrast:* normal text (under 18pt / 14pt bold) needs a minimum contrast ratio of 4.5:1 against its background; large text (18pt+ / 14pt bold+) and UI components need a minimum of 3:1. The site palette (Midnight `#1D1832`, Aurum `#C4962A`, Parchment `#F7F4EE`, Slate `#4A4468`) must be used in combinations that meet these ratios — verify new combinations with a tool such as the WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/) before introducing them.
- *Text and typography:* body text minimum 16px (1rem); line height minimum 1.5 for body text.
- *Semantic HTML:* correct heading hierarchy on every page — one `<h1>`, followed by `<h2>`, then `<h3>`, adjusting CSS rather than skipping levels for visual effect. Landmark elements (`<header>`, `<nav>`, `<main>`, `<footer>`) are already in place — preserve them. Use `<ul>`/`<ol>` for lists, not `<div>` or `<p>` with manual bullets. Use `<button>` for interactive controls and `<a>` for navigation, not `<div>`/`<span>` as click targets.
- *Interactive elements and keyboard navigation:* all interactive elements (links, buttons, form fields, the theme toggle) must be operable by keyboard alone. The theme toggle (`◐`) and menu toggle (hamburger) must be keyboard accessible and have descriptive `aria-label` attributes — they already do; preserve this. Tab order should follow the visual reading order of the page.
- *Images and icons:* all `<img>` elements need an `alt` attribute — decorative images use `alt=""`, informative images use descriptive alt text. All SVG icons used as links (LinkedIn, Substack, GitHub) need `aria-label` on their parent `<a>` — they already do; preserve this. SVG icons that are purely decorative should have `aria-hidden="true"`.
- *Forms:* every form input needs an associated `<label>` element linked via `for`/`id`. Error messages must be programmatically associated with their field (`aria-describedby`). Required fields must be indicated via the `required` attribute.
- *Dark mode:* the dark mode implementation uses the `html.dark` class exclusively. Dark mode colours are defined in `style-v2.css` under `html.dark` selectors. Verify that any new colours introduced in dark mode also meet the 4.5:1 contrast requirement — dark backgrounds often make low-contrast text invisible.
- *Testing:* when making visual changes, verify accessibility using at minimum browser DevTools (Accessibility panel in Chrome/Edge, Accessibility Inspector in Firefox/Safari) for landmark structure and role checking; the WebAIM Contrast Checker for any new colour combinations; and keyboard-only navigation (tab through the page to confirm all interactive elements are reachable and visually indicated).

**File update rules — when adding or modifying a page:**
1. Update `sitemap.xml` — add the new page or update the `<lastmod>` date for any modified page. All URLs must be absolute (`https://www.simonives.com/...`). Use ISO 8601 date format (YYYY-MM-DD).
2. Update `llms.txt` — add a description of any new page, update the `# Last updated` date, and link any new markdown equivalent.
3. Check `robots.txt` — no changes are expected in normal operation, but verify it is present and correct after any infrastructure change.
4. Sync the markdown equivalent — if the HTML page has a `.md` counterpart, update it to reflect any copy changes.

**File update rules — when adding a new substantive page:** all of the above, plus create the `.md` equivalent immediately, add Open Graph tags (see SEO below), add a canonical URL tag, and add JSON-LD structured data if it is a new primary identity page.

**SEO requirements — mandatory on all pages.** Every HTML page must contain the following in `<head>`; none of this is optional.

Open Graph tags:
```html
<meta property="og:title" content="[Page-specific title] — Simon Ives">
<meta property="og:description" content="[150–160 character description specific to this page]">
<meta property="og:url" content="https://www.simonives.com/[page].html">
<meta property="og:type" content="website">
<meta property="og:image" content="https://www.simonives.com/og-image.png">
<meta property="og:site_name" content="Simon Ives">
```
The `og:image` file (`og-image.png`) is a 1200×630px social card that must exist in the repository root — without it, LinkedIn link previews are broken.

Canonical URL tag:
```html
<link rel="canonical" href="https://www.simonives.com/[page].html">
```
Use the full absolute URL. For `index.html`, use `https://www.simonives.com/` (no filename).

Standard meta description:
```html
<meta name="description" content="[150–160 character description — must match og:description]">
```

JSON-LD structured data — the Person schema block must be present on all pages, using the standard template:
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Simon Ives",
  "jobTitle": "Principal, HR Technology Strategy — BHP",
  "description": "Simon Ives, FCPHR, MBA — practitioner and writer. Holds strategic accountability for HR Technology Strategy, HR Capital Investments, and HR AI Governance at BHP. Publishes Phronesis on Substack.",
  "url": "https://www.simonives.com",
  "sameAs": [
    "https://www.linkedin.com/in/simonives",
    "https://enterprisephronesis.substack.com"
  ],
  "knowsAbout": ["HR Technology Strategy", "AI Governance", "HR Capital Investments", "Enterprise Transformation", "Workforce Strategy", "Organisational Design"],
  "worksFor": {
    "@type": "Organization",
    "name": "BHP"
  }
}
```

**AI discoverability files.**
- *robots.txt:* must permit all crawlers. Standard content:
  ```
  User-agent: *
  Allow: /

  Sitemap: https://www.simonives.com/sitemap.xml
  ```
  The only files that should not be crawled are those that don't exist in the public-facing site, and they aren't served by GitHub Pages anyway.
- *llms.txt:* follows the llmstxt.org standard — a structured briefing for language models. It must open with a 3–5 sentence practitioner bio, list all substantive pages with one-line descriptions, link to markdown equivalents of copy pages, link to the Phronesis Substack, and include a `# Last updated` line. Update it every time a page is added, a markdown equivalent is created or updated, or a new Phronesis article is published — it should reflect the current state of the site and publication.
- *sitemap.xml:* standard XML sitemap listing all live HTML pages. Required fields per entry: `<loc>` (absolute URL), `<lastmod>` (ISO 8601 date of last meaningful content change), `<changefreq>` (`monthly` for stable pages, `weekly` for active pages), `<priority>` (`1.0` for homepage, `0.8` for primary pages, `0.5` for utility pages).

**Dark mode implementation.** Dark mode is controlled exclusively via the `html.dark` CSS class.

Required in `<head>` of every HTML file (before stylesheets):
```html
<script>
(function () {
    var s = localStorage.getItem('theme');
    if (s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
})();
</script>
```
This runs synchronously before the page renders to prevent flash of wrong theme. It respects the user's system preference on first visit and their saved preference (`localStorage`) thereafter.

Required before `</body>` of every HTML file:
```javascript
(function () {
    var header = document.querySelector('.site-header');
    if (header) {
        function updateScrolled() {
            header.classList.toggle('scrolled', window.scrollY > 10);
        }
        window.addEventListener('scroll', updateScrolled, { passive: true });
        updateScrolled();
    }

    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            var isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
})();
```

**Navigation — standard template.** All pages use the same nav. The active page should have `class="active"` on its `<a>` tag or the containing `<li>`. Copy this template exactly:
```html
<header class="site-header">
    <nav class="container">
        <a href="index.html" class="logo">Simon Ives <span class="phi-mark">Φ</span></a>

        <button class="menu-toggle" aria-label="Toggle Menu" aria-expanded="false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
        </button>

        <div class="nav-container">
            <ul class="nav-links">
                <li><a href="index.html">Home</a></li>
                <li><a href="doctrine.html">Approach</a></li>
                <li><a href="portfolio.html">Track Record</a></li>
                <li><a href="now.html">Now</a></li>
                <li><a href="https://enterprisephronesis.substack.com" target="_blank" rel="noopener noreferrer" class="phronesis-link">Phronesis ↗</a></li>
            </ul>
            <button id="theme-toggle" aria-label="Toggle colour theme">◐</button>
            <div class="header-social">
                <a href="https://www.linkedin.com/in/simonives" target="_blank" rel="noopener" aria-label="LinkedIn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://enterprisephronesis.substack.com" target="_blank" rel="noopener" aria-label="Substack">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.534 8.285H1.466V0h21.068v8.285zM1.466 10.812V24L12 18.11 22.534 24V10.812H1.466z"/></svg>
                </a>
            </div>
        </div>
    </nav>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const menuToggle = document.querySelector('.menu-toggle');
            const navContainer = document.querySelector('.nav-container');
            menuToggle.addEventListener('click', () => {
                const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
                menuToggle.setAttribute('aria-expanded', !expanded);
                navContainer.classList.toggle('is-active');
                document.body.classList.toggle('no-scroll');
            });
        });
    </script>
</header>
```

**Footer — standard template.**
```html
<footer class="site-footer on-midnight">
    <div class="container footer-band">
        <p class="footer-tagline">Practical wisdom for enterprise transformation.</p>
        <p class="footer-orient">
            <a href="https://enterprisephronesis.substack.com" target="_blank" rel="noopener noreferrer">Read Phronesis ↗</a>
            <span aria-hidden="true"> · </span>
            <a href="https://www.linkedin.com/in/simonives" target="_blank" rel="noopener noreferrer">Connect on LinkedIn ↗</a>
        </p>
        <hr class="footer-rule">
        <div class="footer-content">
            <div class="footer-copy">
                <p>&copy; 2026 Simon Ives. All rights reserved.</p>
                <p><a href="governance.html">Information Governance</a></p>
            </div>
            <div class="social-links">
                <a href="https://www.linkedin.com/in/simonives" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
                <a href="https://enterprisephronesis.substack.com" target="_blank" rel="noopener noreferrer" aria-label="Substack"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.534 8.285H1.466V0h21.068v8.285zM1.466 10.812V24L12 18.11 22.534 24V10.812H1.466z"/></svg></a>
            </div>
        </div>
    </div>
</footer>
```
The footer uses the `.on-midnight` fixed brand surface (Midnight fill, Aurum hairlines). The orientation line above the rule is in Cormorant Garamond, centred — this is orientation, not a call to action. No "get in touch" or "for speaking enquiries" language.

### Commands

**GitHub workflow — branch strategy.** `main` is the production branch, served by GitHub Pages, and is protected (no direct pushes). `dev` is the working branch — all changes go here first.

**GitHub workflow — standard sequence:**
1. Make changes on `dev`.
2. Push `dev` to GitHub.
3. Open a Pull Request from `dev` → `main` on GitHub web.
4. Review the diff, then merge.
5. GitHub Pages deploys automatically from `main`.

**GitHub workflow — issue hygiene.** All known bugs and planned changes should have a GitHub Issue. Commit messages that close an issue should include `Closes #[n]` or `Fixes #[n]` (example: `Add robots.txt and sitemap.xml — Closes #12`).

**Superpowers — mandatory development methodology.** The `superpowers@claude-plugins-official` plugin is installed in Simon's Claude Code environment and its methodology is mandatory for all work on this project (exceptions in Negatives). The named slash commands below (`/brainstorming` etc.) are Claude Code mechanics; an agent working through AGENTS.md in a different tool without that plugin should still honour the same sequence as a manual discipline — design proposed and approved before implementation, a written plan before changes begin, an explicit verification pass before pushing, and a deliberate finish-the-branch step before a PR. Required workflow for any new page, feature, significant design change, or copy overhaul:
1. `/brainstorming` — before any implementation. No markup, CSS, or copy changes until a design is presented and approved. Applies to new pages, structural redesigns, and any change that touches multiple files.
2. `/writing-plans` — immediately after brainstorming approval. Implementation plan committed before changes begin.
3. `/verification-before-completion` — before pushing to `dev`: accessibility check (contrast, keyboard navigation, semantic HTML), visual check across light and dark mode, and sync of any updated `.md` equivalents.
4. `/finishing-a-development-branch` — before raising a PR from `dev` → `main`.

## Negatives

**Accessibility (WCAG 2.2 AA) is non-negotiable — the strongest boundary in this file.** Principle: every HTML/CSS change must preserve or improve accessibility for a site owner with a vision impairment. Exceptions: none. Specific instances of this principle:
- Never convey information through colour alone (e.g. a red error state must also have a text label or icon).
- Never set body copy below 16px, and never use justified text alignment (it creates uneven word spacing that impairs readability for low-vision and dyslexic users).
- Never use text overlaid on images without a sufficient contrast overlay.
- Never skip heading levels for visual effect — adjust CSS instead.
- Never remove the browser's default `:focus` outline without replacing it with an equally visible custom focus indicator.
- Never rely solely on placeholder text to label a form field — use explicit labels above each input.

**Brand voice — the philosophy background is demonstrated, never disclosed.** Principle: Simon's undergraduate Philosophy training must never be stated on the site. Exception: none — it is always shown through vocabulary and intellectual moves, never named.

**Prohibited language — legacy terms from an earlier brand era.** Principle: none of these terms, or their derivatives, may appear anywhere on the site; their presence is an error. Exception: none. The list: Monopoly Engine / monopoly; Unyielding operational moats / moats; Systemic dominance / dominance; Structural intervention; Unapologetic / unapologetically; Maximize / maximise aggregate workforce utility; Winning productivity uplift; Chief Architectural Officer of the Human Asset; Weaponise / weaponize; any military or combat metaphor applied to business.

**Dark mode — one mechanism only.** Principle: dark mode is controlled exclusively via the `html.dark` class and the two required script blocks (see Instructions). Exceptions: none — do not use `@media (prefers-color-scheme: dark)` anywhere in any stylesheet (removed deliberately to give the JS toggle control over the theme), and do not add any additional theme logic or re-check `localStorage` beyond what's already specified.

**Typography and colour — the defined set only.** Principle: use the four brand colours via CSS custom properties (`var(--color-midnight)` etc.) rather than hard-coded hex values in new CSS, and use only Cormorant Garamond and Inter. Exception: none — do not substitute or add additional typefaces.

**robots.txt — never restrict AI crawlers.** Principle: never block AI agents or add `Disallow` rules for public pages — this is a reputational liability for someone positioned as an AI governance expert. Exception: none.

**Superpowers hard gates — do not skip without explicit instruction from Simon.** Principle: the four-step workflow (`/brainstorming` → `/writing-plans` → `/verification-before-completion` → `/finishing-a-development-branch`) applies to any new page, feature, significant design change, or copy overhaul. Exception: minor copy fixes and single-element corrections (a typo, an `alt` attribute, a `<lastmod>` date) are exempt from the brainstorming gate — apply judgement; if a change touches layout, structure, or more than two files, run brainstorming anyway.

**Infrastructure files.** Principle: `CNAME` (the GitHub Pages custom domain record) is not modified. Exception: none, absent an explicit infrastructure change directed by Simon.

**Private files — never committed.** Principle: the following are gitignored and must never be committed: `PROJECT_PLAN.md` (private strategic planning document), `backend_payload.txt` (development artefact), `.env` and any secret files. Exception: none.

## Expiry

- Site pages, infrastructure files, and markdown equivalents listed under Scope. Owner: Simon, last-verified: 2026-07-25, refresh interval: whenever a page is added, removed, or its markdown equivalent relationship changes.
- Brand colours and typography (Midnight `#1D1832`, Aurum `#C4962A`, Parchment `#F7F4EE`, Slate `#4A4468`; Cormorant Garamond + Inter). Owner: Simon, last-verified: 2026-07-25, refresh interval: whenever the brand palette or type system is revised.
- Superpowers plugin dependency (`superpowers@claude-plugins-official`) and its mandatory workflow. Owner: Simon, last-verified: 2026-07-25, refresh interval: re-verify if the plugin is updated, replaced, or the workflow steps change.
- Footer copyright year (currently "&copy; 2026 Simon Ives"). Owner: Simon, last-verified: 2026-07-25, refresh interval: update at the start of each calendar year.
- GitHub Issue numbers referenced in commit-message examples are illustrative, not live state. Owner: Simon, last-verified: 2026-07-25, refresh interval: none needed — treat as example only, not a tracker of open issues.
