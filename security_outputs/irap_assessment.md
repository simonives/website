# IRAP-Aligned Security Self-Assessment: simonives.com

**Date:** 29 September 2026
**Assessor:** Self-conducted (Claude Code, reviewed and approved by Simon Ives)
**Target system:** simonives.com (static website)
**Hosting environment:** GitHub Pages, fronted by Cloudflare (DNS, CDN, edge security)
**Status:** Self-assessment against relevant ISM principles. Not a formal IRAP assessment.

## 1. Executive Summary

This document is a preliminary, self-conducted alignment review mapping simonives.com's architecture to relevant principles in the Australian Government Information Security Manual (ISM). It is published as a demonstration of security-conscious practice for a personal site, not as a formal audit.

A formal IRAP (Information Security Registered Assessors Program) assessment is an exhaustive, independent audit conducted by an ASD-endorsed assessor, used to authorise systems handling classified government data. This site processes no personal, sensitive, or classified data of any kind (see the companion DPIA), so a formal IRAP assessment would be disproportionate to its actual risk profile. This document instead honestly maps what a static personal site's architecture does and does not need to address.

## 2. System Description

**Architecture:**
- **Frontend**: static HTML5, CSS3, and vanilla JavaScript. No framework, no build step, no client-side application state beyond a single `localStorage` theme preference.
- **Hosting**: GitHub Pages (Microsoft), acting as origin web server. Custom domain via `CNAME`.
- **Edge / CDN**: Cloudflare, proxying all DNS records (`A` records to GitHub Pages' standard IP range, `www` `CNAME` to `simonives.github.io`), providing TLS termination, DDoS mitigation, and response header injection.
- **Analytics**: none. Cloudflare Web Analytics is provisioned on the account but disabled (`auto_install: false`); no client-side beacon fires.
- **Forms / data intake**: none. No contact form exists on the current site.
- **Version control**: Git via GitHub, public repository (`simonives/website`), `dev` branch for active work, `main` for production, changes always go through a pull request.
- **Email**: this domain also hosts Google Workspace mailboxes (unrelated to the website itself, not evaluated here as they sit outside the website's own architecture and data flows).

## 3. ISM Control Alignment

Only categories genuinely applicable to a static, serverless site are assessed. Categories that assume a running server, a database, or user authentication (patch management of an OS, server hardening, database access control) are marked not applicable, since no such component exists.

### 3.1 Data in transit
- **Control**: TLS/HTTPS enforced for all traffic.
- **Status**: Cloudflare's "Always Use HTTPS" is enabled, redirecting all HTTP traffic to HTTPS. SSL mode is set to Full. Minimum TLS version is 1.2. HSTS is enabled (`max_age` 180 days).
- **Finding, remediated 29 September 2026**: the zone's minimum TLS version was found set to 1.0 during this assessment. Since all major browsers have dropped support for TLS 1.0/1.1, it was raised to 1.2 the same day, a zero-cost change on Cloudflare's free tier.

### 3.2 Access control
- **Control**: who can change the live site.
- **Status**: publishing requires push access to the `simonives/website` GitHub repository and its `main` branch, gated through the `dev` → pull request → `main` workflow. Cloudflare zone and DNS configuration requires the Cloudflare account owner's credentials. No shared credentials, no service accounts with standing write access beyond these two systems.

### 3.3 Data security and minimisation
- **Control**: what data the system holds and how it is protected.
- **Status**: the site holds no personal data, no credentials, no secrets, and no database (see the companion DPIA for the full data-flow assessment). There is accordingly no data-at-rest to protect beyond the static site files themselves, which are public by design (the site's entire purpose is public-facing content).

### 3.4 Application-layer security
- **Control**: browser-enforced protections against common web attack classes.
- **Status**: as of this assessment, Cloudflare Transform Rules inject a Content-Security-Policy, Referrer-Policy (`strict-origin-when-cross-origin`), and `X-Frame-Options: DENY` on every response. The CSP permits `'unsafe-inline'` for scripts and styles, a deliberate, documented trade-off: the site's mobile navigation, theme toggle, and scroll-based header state rely on small inline `<script>` blocks, and a static GitHub Pages site with no build step cannot practically generate per-request nonces. This is the accepted residual risk of that trade-off, not an oversight.

### 3.5 Change management
- **Control**: how changes reach production.
- **Status**: all changes go through a pull request from `dev` into `main`; `main` is the only branch GitHub Pages deploys from. This gives every production change a reviewable diff and a timestamp, even for a single-maintainer site.

### 3.6 Logging and monitoring
- **Control**: visibility into traffic and anomalies.
- **Status**: Cloudflare provides zone-level traffic analytics and edge logs. GitHub Pages provides no separate access logging of its own; Cloudflare's edge sits in front of every request and is the practical monitoring point.

### 3.7 Vulnerability disclosure
- **Control**: a channel for reporting security issues.
- **Status**: a `security.txt` file (RFC 9116) is published at `/.well-known/security.txt`, pointing to a dedicated `security@simonives.com` address.

### 3.8 Not applicable
Server/OS patch management, database access control, container or workload isolation, server-side input validation, and server-side secrets management do not apply: there is no server, no database, and no backend process for any of these controls to govern.

## 4. Limitations of This Self-Assessment

This is a self-conducted review by the site's own owner (assisted by Claude Code), not an independent audit. It has not been reviewed by an ASD-endorsed assessor, and does not authorise this system to handle any data more sensitive than what it already handles today (public, non-personal, non-classified content). Its value is transparency and demonstrated practice, not certification.

## 5. Conclusion

As at 29 September 2026, simonives.com's architecture is proportionate to its actual risk profile: a static, data-minimal personal site with TLS 1.2+ enforced, baseline security headers applied, a reviewable change-management workflow, and a published vulnerability-disclosure channel. The one hardening opportunity this assessment found (a minimum TLS version of 1.0) was remediated the same day. This assessment should be revisited whenever the site's architecture changes materially, for example if a server-side component, database, or user authentication is ever introduced.

---

*This is a self-conducted assessment published to demonstrate security-conscious practice. It is not a formal IRAP assessment and carries no ASD or government endorsement.*
