# Data Privacy Impact Assessment (DPIA)

**Date of Assessment:** 18 May 2026
**System / Asset:** simonives.com
**Data Controller:** Simon Ives
**Assessor:** Simulated Gemini CLI Privacy Analyst

---

## 1. Executive Summary

This Data Privacy Impact Assessment (DPIA) evaluates the personal data processing activities associated with the **simonives.com** web property. As a practitioner-led professional site, data collection is deliberately minimized, aligning with principles of data sovereignty and "privacy by design."

The primary vectors for data collection are:
1.  **Strategic Briefing Form:** Facilitated via Web3Forms API.
2.  **Web Analytics:** Facilitated via Google Analytics 4 (GA4).
3.  **Infrastructure Logs:** Maintained by GitHub Pages (Microsoft).

This assessment confirms that the current data processing activities are proportionate, necessary, and effectively mitigated against reasonable privacy risks, complying broadly with the Australian Privacy Act 1988, GDPR, and CCPA frameworks.

---

## 2. Data Processing Activities & Flow

### 2.1 The "Briefing" Form (Web3Forms)
*   **Data Collected:** Executive Sponsor Name, Corporate Email, Enterprise Headcount (categorical), Core Technology Ecosystem (text), Strategic Challenge (free-text).
*   **Lawful Basis for Processing:** Legitimate Interests / Steps taken prior to entering into a contract (evaluating potential advisory engagements).
*   **Data Flow:**
    1.  User enters data into the HTML form (`briefing.html`).
    2.  Data is transmitted securely (HTTPS/TLS) via a POST request to `api.web3forms.com`.
    3.  Web3Forms processes the payload and forwards it to the designated administrative email inbox.
*   **Retention:** Data is held in the inbox until evaluated. Per `governance.html`, if no engagement proceeds, data is scheduled for erasure. Web3Forms transiently processes the data but does not act as a long-term CRM.

### 2.2 Web Analytics (Google Analytics 4)
*   **Data Collected:** IP address (anonymized by default in GA4), browser metadata, geolocation (city/region), interaction events (page views, clicks).
*   **Lawful Basis for Processing:** Explicit Consent.
*   **Data Flow:**
    1.  User visits the site. Script execution is blocked.
    2.  User actively clicks "Accept analytics" on the cookie banner.
    3.  A flag (`cookie-consent: accepted`) is written to `localStorage`.
    4.  GA4 scripts are injected into the DOM, and tracking beacons are sent to Google servers.
*   **Retention:** GA4 data retention is subject to the configuration in the Google Analytics portal (typically 2 or 14 months).

### 2.3 Infrastructure Logs (GitHub Pages)
*   **Data Collected:** Standard server access logs (IP address, user agent, timestamp, requested URL).
*   **Lawful Basis for Processing:** Legitimate Interests (Security, fraud prevention, and operational integrity).
*   **Data Flow:** Processed entirely at the edge by GitHub (Microsoft) infrastructure.

---

## 3. Necessity and Proportionality

*   **Briefing Form:** The collection of specific enterprise metrics (headcount, core tech) is strictly necessary to filter and qualify leads, aligning with the stated goal that "Advisory availability is limited to complex, large-scale enterprise transformations." It prevents time-wasting for both parties.
*   **Analytics:** The use of GA4 is proportionate to the need to understand content reach (e.g., *Phronesis* readership origin) and is strictly consent-gated, avoiding invasive "tracking by default."
*   **Avoidance of Cookies:** By leveraging `localStorage` for theme preference and consent state, the site avoids dropping non-essential cookies, reducing regulatory friction.

---

## 4. Privacy Risks and Mitigations

| Identified Risk | Impact Level | Likelihood | Mitigation Strategy | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Unauthorized access to briefing submissions in transit.** | High (Confidential corporate strategy) | Low | Form posts directly to Web3Forms over enforced HTTPS/TLS. No intermediary databases on the static site. | **Low** |
| **Spam / Malicious Payload Injection via Form.** | Medium | Medium | Implementation of a CSS-hidden "honeypot" field (`botcheck`). Web3Forms native sanitization. | **Low** |
| **Tracking users without explicit consent.** | High (Regulatory penalty) | Low | Analytics script injection is strictly gated behind an affirmative `localStorage` check. "Decline" prevents loading. | **Low** |
| **Third-Party Data Breach (Web3Forms / Google).** | High | Low | Reliance on enterprise-grade processors with their own SOC 2 / ISO 27001 attestations. Minimization of data retained. | **Low** |

---

## 5. Information Governance Policy Alignment

The public-facing `governance.html` policy accurately reflects the technical reality of the site:
*   **Transparency:** It explicitly states what is collected and why ("evaluating the nature of your challenge").
*   **No Monetization:** It explicitly rejects the data broker model ("I do not monetise, sell, lease, or distribute...").
*   **User Rights:** It formally offers the right to audit or immediate erasure.

---

## 6. Strategic Recommendations

To maintain this exemplary privacy posture, the following continuous improvement actions are recommended:

1.  **Web3Forms Configuration Audit:** Ensure that the Web3Forms dashboard is configured to *not* save submissions permanently if such a feature exists, relying solely on email forwarding to maintain strict control over the data lifecycle.
2.  **GA4 Configuration Check:** Verify in the Google Analytics admin panel that "Data Retention" is set to the minimum viable period (e.g., 2 months) and that "Granular Location and Device Data" collection aligns strictly with actual reporting needs.
3.  **Regular Policy Review:** Set a calendar reminder (bi-annually) to review `governance.html` against emerging changes in the Australian Privacy Act or international equivalents, given the global nature of the audience.

## 7. Conclusion

The data privacy architecture of **simonives.com** represents "Best Practice." The decision to build a static site, outsource form handling to an API, and strictly gate analytics behind explicit consent results in a highly secure, privacy-respecting environment that matches the high-trust requirements of an enterprise practitioner.