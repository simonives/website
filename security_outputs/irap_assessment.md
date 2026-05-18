# IRAP-Aligned Security Assessment: simonives.com

**Date:** 18 May 2026
**Assessor:** Simulated Gemini CLI Security Analyst
**Target System:** simonives.com (Static Website)
**Hosting Environment:** GitHub Pages

---

## 1. Executive Summary

This document provides a preliminary, simulated Information Security Registered Assessors Program (IRAP) alignment assessment for the web asset **simonives.com**. 

It is important to note that a formal IRAP assessment is an exhaustive, independent audit conducted by an ASD-endorsed assessor against the Australian Government Information Security Manual (ISM) to authorise systems to handle classified data (e.g., PROTECTED). 

This document serves as an internal strategic artifact, demonstrating how the architectural decisions of this static site map to key ISM principles. The system currently processes low-sensitivity, public, and unclassified strategic briefing information.

## 2. System Description

**simonives.com** is a professional practitioner website serving as a primary point of contact and repository of strategic methodology for Simon Ives.

**Architecture:**
*   **Frontend:** Static HTML, CSS (Custom & Google Fonts), and minimal JavaScript (Theme toggling, GA4).
*   **Hosting & Delivery:** GitHub Pages (acting as OS, Web Server, and CDN).
*   **Form Processing:** Web3Forms API (Third-party SaaS for handling `briefing.html` submissions).
*   **Analytics:** Google Analytics 4 (Client-side execution, gated by user consent).
*   **Version Control:** Git via GitHub.

## 3. ISM Control Alignment (Key Principles)

The following sections map the site's architecture against broad control categories within the Australian Government Information Security Manual (ISM).

### 3.1 Cyber Security Roles & Incidents
*   **Incident Response:** Reliance on GitHub's internal incident response team for infrastructure availability. For data exposure (e.g., Web3Forms token misuse), the system owner (Simon Ives) acts as the incident manager. 
*   **Alignment:** Adequate for the system's threat profile.

### 3.2 Physical and Personnel Security
*   **Physical:** Inherited from GitHub (Microsoft) and Web3Forms data centers. Both providers maintain compliance with global physical security standards (e.g., ISO 27001, SOC 2).
*   **Personnel:** System access is restricted solely to the system owner.
*   **Alignment:** High. Outsourcing infrastructure removes the burden of managing physical access controls.

### 3.3 Communications and Infrastructure Security
*   **Cryptography (In Transit):** GitHub Pages enforces HTTPS, securing data between the user's browser and the edge node. Form data submitted to Web3Forms is transmitted via `POST` over HTTPS.
*   **Network Security:** GitHub's edge network provides built-in DDoS protection. 
*   **Alignment:** Strong. Traffic interception (MITM) risks are mitigated by enforced TLS.

### 3.4 Software Security
*   **Application Architecture:** A static site architecture fundamentally mitigates SQL Injection, Server-Side Request Forgery (SSRF), and remote code execution vulnerabilities on the host server.
*   **Vulnerability Management:** Vulnerabilities are limited to client-side logic (JavaScript) and third-party dependencies.
*   **Web Application Security:** 
    *   *XSS (Cross-Site Scripting):* Risk is low due to static nature, but currently lacks a Content Security Policy (CSP) header/meta tag to enforce script origin restrictions.
    *   *Form Security:* Uses a honeypot field. Relies on Web3Forms' backend sanitisation.
*   **Alignment:** Very High (inherent to static architecture), with minor improvements required (CSP).

### 3.5 Data Security
*   **Data at Rest:** Source code is stored on GitHub. Form submission data is routed through Web3Forms to an email endpoint. The site itself does not store persistent user data at rest.
*   **Data Sovereignty & Privacy:** Addressed via the public `governance.html` policy, establishing clear data collection and erasure parameters.
*   **Alignment:** Appropriate for the classification of data handled (Unclassified/Public).

## 4. Threat Model & Residual Risk

*   **Threat:** Website Defacement.
    *   **Vector:** Compromise of GitHub account credentials.
    *   **Mitigation:** Enforce MFA on the GitHub account. Require signed commits.
    *   **Residual Risk:** Low.
*   **Threat:** Spam/Resource Exhaustion via Briefing Form.
    *   **Vector:** Automated bot submissions bypassing the honeypot.
    *   **Mitigation:** Web3Forms internal throttling and spam filtering.
    *   **Residual Risk:** Low.
*   **Threat:** Supply Chain Attack.
    *   **Vector:** Compromise of external assets (Google Fonts, GA4).
    *   **Mitigation:** Currently lacking Subresource Integrity (SRI) hashes and a strict CSP.
    *   **Residual Risk:** Medium.

## 5. Strategic Recommendations for Hardening

To align more closely with "Best Practice" ISM guidelines for public-facing assets:

1.  **Implement Content Security Policy (CSP):** Add a restrictive `<meta>` CSP tag to all HTML templates to prevent execution of unauthorised scripts.
2.  **Subresource Integrity (SRI):** Apply cryptographic hashes to `<link>` tags calling external stylesheets (e.g., Google Fonts) to ensure integrity if the external host is compromised.
3.  **Repository Security Posture:** Verify that Multi-Factor Authentication (MFA) is strictly enforced on the controlling GitHub account and consider implementing Branch Protection rules on the `main` branch.
4.  **Legacy Code Removal:** Remove `form-backend.gs` from the repository to reduce the visible footprint of legacy implementations.

## 6. Conclusion

The architecture of **simonives.com** provides a highly robust, low-attack-surface environment. By leveraging a static site generator/hosting model (GitHub Pages) and outsourcing dynamic processing (Web3Forms), the system inherently neutralises the vast majority of traditional web application vulnerabilities. Implementing the recommended hardening measures (CSP, SRI) will elevate the system to an exemplary security posture for its class.
