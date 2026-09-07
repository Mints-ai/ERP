# ISO 27001:2022 to SOC 2 Trust Services Criteria Crosswalk

> **Document Reference:** SOC2-ISO-001  
> **Classification:** Compliance Mapping / Audit Evidence  
> **Prepared for:** SOC 2 Type I / Type II Independent Assessor  

This crosswalk establishes the mapping between Mints Global's existing ISO 27001:2022 Information Security Management System (ISMS) and the AICPA SOC 2 2017 Trust Services Criteria (Security & Confidentiality).

---

## 1. Mapping Matrix

| SOC 2 TSC | Principle / Requirement | Corresponding ISO 27001:2022 Control | ERP Technical / Organizational Implementation |
| :--- | :--- | :--- | :--- |
| **CC6.1** | Logical Access Controls & Privilege Management | A.5.15, A.5.18, A.8.2 | RBAC in `firestore.rules`, removal of public admin emails (`VULN-020`), Quarterly Access Reviews (`ACCESS_REVIEW_PROCEDURE.md`). |
| **CC6.2** | User Registration, Modification & De-provisioning | A.5.16, A.5.17 | Automated HR status transitions, instant session deactivation on offboarding (`ONBOARDING_OFFBOARDING_CONTROLS.md`). |
| **CC6.3** | Authentication & Brute-force Prevention | A.8.5 | Cryptographically secure Firebase session cookies (`VULN-004`), progressive lockout backoff (`VULN-018`). |
| **CC6.6** | Boundary Protection & Network Security | A.8.20, A.8.22 | Strict API authentication across all `/api/*` endpoints (`VULN-001`, `002`, `003`, `005`), SSRF URL allowlisting (`VULN-019`). |
| **CC6.7** | Data Transmission, XSS & Upload Validation | A.8.24, A.8.28 | CSP & security headers (`VULN-013`), HTML sanitization with DOMParser (`VULN-008`), storage MIME type enforcement (`VULN-011`), CSV injection sanitization (`VULN-017`). |
| **CC7.1** | Vulnerability Management | A.8.8 | Automated dependency security scanning (`npm audit`) and CI build verification in GitHub Actions. |
| **CC7.2** | System Monitoring, Rate Limiting & Alerting | A.8.15, A.8.16 | Sliding-window API rate limiter (`VULN-014`), real-time Discord telemetry, Security Audit Console (`/dashboard/security`). |
| **CC7.3 / CC7.4** | Incident Response & Testing | A.5.24, A.5.25, A.5.28 | Documented Incident Response Plan with annual tabletop simulation (`IRP_TABLETOP_EXERCISE.md`). |
| **CC8.1** | Change Management & Secure SDLC | A.8.25, A.8.32 | GitHub Actions CI gate requiring passing tests, ESLint, TypeScript check, and Next.js build before merge. |
| **Confidentiality** | Confidential Data Protection (Payroll & PII) | A.5.12, A.8.11 | WPS SIF export restricted to authorized finance roles with immutable audit logging (`VULN-001`). |
