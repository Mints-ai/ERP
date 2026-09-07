# Subprocessor Registry & Vendor Management (SOC 2 CC6.7)

> **Document Reference:** SOC2-VEND-001  
> **Classification:** Confidential / Internal  
> **Review Cycle:** Annual or upon vendor onboarding  
> **Last Updated:** September 2026  

This registry catalogs all third-party sub-processors and cloud service providers that store, process, or transmit company, employee, customer, or financial data on behalf of Mints Global ERP.

---

## 1. Approved Subprocessor Inventory

| Vendor Name | Service Provided | Location / Cloud Region | Data Types Processed | SOC 2 / ISO Certification | DPA in Place |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Cloud / Firebase** | Database (Firestore), Authentication, Cloud Storage, Hosting | `europe-west1` / Global CDN | Employee records, authentication tokens, payslips, uploaded documents, audit logs | SOC 1/2/3, ISO 27001, ISO 27017, ISO 27018 | Yes (Google Cloud DPA) |
| **Vercel Inc.** | Edge compute, Next.js serverless hosting, edge proxy | Global (Anycast Edge) | Request metadata, session tokens, dynamic API route handling | SOC 2 Type II, ISO 27001 | Yes (Vercel DPA) |
| **OpenAI LLC** | Receipt & Invoice OCR Vision API (`gpt-4o-mini`) | US Multi-Region | Ephemeral receipt/invoice image data for text parsing (zero-day data retention) | SOC 2 Type II | Yes (OpenAI Business Terms & DPA) |
| **Discord Inc.** | Operational Telemetry & Alert Webhooks | US / Global | Non-PII security telemetry, task assignment notifications, system event broadcasts | ISO 27001 aligned | Standard API Terms (No PII routed) |

---

## 2. Vendor Due Diligence Policy

1. **Pre-Onboarding Assessment:**
   - Any new third-party vendor handling company or customer data must provide a valid SOC 2 Type II report, ISO 27001 certification, or undergo a third-party security questionnaire.
   - A Data Processing Addendum (DPA) containing standard contractual clauses (SCCs) must be executed before granting production access.

2. **Annual Review Requirement:**
   - Security leadership must verify that each vendor's SOC 2 / ISO certifications remain current and active.
   - Any subprocessor security incidents or bridge letters must be reviewed by the CISO / System Admin.

3. **Data Minimization & Egress:**
   - Outbound API calls to third-party endpoints (such as OpenAI and Discord) must enforce strict payload whitelisting, size limiting, and URL pattern validation to prevent SSRF and inadvertent PII exfiltration.
