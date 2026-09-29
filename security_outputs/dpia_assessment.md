# Data Privacy Impact Assessment (DPIA)

**Date of assessment:** 29 September 2026
**System / asset:** simonives.com
**Data controller:** Simon Ives, resident and publishing from Australia
**Assessor:** Self-conducted (Claude Code, reviewed and approved by Simon Ives)
**Status:** Self-assessment. Not an independent or regulator-reviewed DPIA. Published as a demonstration of practice, not as a compliance certification.

---

## 1. Executive Summary

simonives.com is a static personal website (professional credibility hub) hosted on GitHub Pages behind Cloudflare, with no server-side application, no database, and no user accounts. As at this assessment date, the site collects no personal data from visitors: there is no contact form, and Cloudflare Web Analytics has been disabled at the source (`auto_install: false` on the Web Analytics site configuration, confirmed live by the absence of any `beacon.min.js` or `cdn-cgi/rum` request in page loads).

The only client-side storage the site uses is a single `localStorage` key (`theme`) holding a light/dark display preference, which never leaves the visitor's device and carries no personal or identifying information.

Because Simon resides in and publishes from Australia, the **Privacy Act 1988 (Cth)** is the governing legal framework for this assessment. Voluntary alignment with the GDPR and CCPA is also assessed and called out explicitly below, since the site is publicly reachable from the EU and California, even though neither regime has primary jurisdiction here.

## 2. Data Processing Activities and Flow

| Activity | Status |
|---|---|
| Contact/enquiry form | None exists. Previously present (Web3Forms), removed. |
| Client-side analytics | Disabled. Cloudflare Web Analytics `auto_install` set to `false`; no beacon script, no `/cdn-cgi/rum` beacon request fires on page load. |
| Cookies | None set by the site. |
| `localStorage` | One key, `theme` (`"light"` or `"dark"`), written by inline JavaScript on every page. Functional only, never transmitted to any server, not personal data. |
| Third-party embeds, trackers, or pixels | None. |
| User accounts, logins, or sessions | None. The site has no authentication of any kind. |
| Fonts | Self-hosted (`fonts/` directory), not loaded from Google Fonts or any third-party font CDN, so no font-request data is shared with a third party. |

### Infrastructure-level processing (outside the site's own control)

Two infrastructure providers see standard web-server access data as an unavoidable consequence of serving any website over HTTPS:

- **GitHub Pages (Microsoft)**, the origin host, sees standard HTTP request metadata (IP address, user agent, requested path, timestamp) for each request it serves.
- **Cloudflare**, the CDN/edge proxy in front of GitHub Pages, sees the same class of request metadata, and additionally provides the security headers (CSP, Referrer-Policy, X-Frame-Options) applied at the edge.

Neither of these is a data flow this site's own code initiates or controls, both are the ordinary, unavoidable consequence of any HTTPS request reaching any website through any CDN. Their respective privacy practices are governed by their own published policies (GitHub's and Cloudflare's), not by this site.

## 3. Legal Basis and Compliance Mapping

### Australian Privacy Act 1988 (Cth), primary framework

Given the absence of any personal data collection (no form, no analytics, no cookies), the Australian Privacy Principles (APPs) have very little to attach to. There is no collection of personal information under APP 3, no use or disclosure under APP 6, and no cross-border disclosure under APP 8. The site's data-minimisation posture (no collection by design) is itself the compliance mechanism, rather than a consent or notice mechanism layered on top of active collection.

### GDPR (EU) and CCPA (California), voluntary alignment

Neither regulation has primary jurisdiction over an Australian-resident, Australian-published site, but both are assessed here because the site is publicly reachable from the EU and California:

- **GDPR**: with no personal data processed, there is no "processing" for Article 4 purposes, no lawful basis to establish under Article 6, and no data subject rights (access, erasure, portability) to operationalise, because there is nothing held to access, erase, or port.
- **CCPA**: the site does not "sell" or "share" personal information as defined under the CCPA/CPRA, because it does not collect any. No "Do Not Sell or Share My Personal Information" mechanism is required.

## 4. Data Subject Rights

Not applicable in the conventional sense: with no personal data collected or retained, there is nothing for a visitor to request access to, correct, or have erased. `governance.html` (the site's published privacy policy) states this plainly and gives Simon's LinkedIn as a contact channel for any privacy question a visitor might still have.

## 5. Residual Risk Assessment

| Risk | Likelihood | Residual exposure |
|---|---|---|
| GitHub or Cloudflare infrastructure logs are compromised or subpoenaed | Low | Limited to standard HTTP request metadata (IP, user agent, path, timestamp); neither provider holds any personal data this site itself collects, because it collects none. |
| A future code change reintroduces a form, analytics beacon, or third-party embed without updating this assessment | Medium | This is the main reason this document should be revisited whenever the site's data-handling architecture changes materially (see review trigger below), rather than treated as a one-time artefact. |
| `localStorage` theme preference is read by a malicious third-party script | Very low | No third-party scripts are loaded on the site at all (see Section 2); the risk only exists if that changes. |

## 6. Conclusion

As at 29 September 2026, simonives.com collects no personal data from visitors, and the Australian Privacy Act 1988 (Cth), GDPR, and CCPA are each satisfied by the absence of any collection to regulate. This assessment should be revisited whenever the site adds a form, re-enables analytics, adds a third-party embed, or otherwise changes what data it touches, whichever comes first. It was last reviewed 29 September 2026, following the removal of a prior, now-inaccurate version of this document (see the site's public repository history for context) and the removal of both the contact form and the analytics beacon.

---

*This is a self-conducted assessment published to demonstrate privacy-by-design practice. It is not an independent audit and carries no regulatory or legal certification.*
