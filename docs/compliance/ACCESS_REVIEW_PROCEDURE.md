# Quarterly User Access Review Procedure (SOC 2 CC6.1)

> **Document Reference:** SOC2-AC-001  
> **Control Objective:** CC6.1 — Logical access to system resources and data is granted based on the principle of least privilege and reviewed quarterly.  
> **Target Audience:** Founders, System Administrators, Security Officers  
> **Frequency:** Quarterly (Q1, Q2, Q3, Q4)  

---

## 1. Scope

This procedure covers all privileged and administrative roles within Mints Global ERP:
- `founder`: Apex ownership and unrestricted ERP operations.
- `system_admin`: Full system configuration, RBAC matrix, and audit inspection.
- `c_suite`: Executive oversight, financial and HR reporting.
- `manager`: Departmental approval, task routing, and team management.
- `client`: Client portal access restricted to dedicated company project data.

---

## 2. Review Protocol

1. **Extraction:**
   - On the final week of each calendar quarter, an authorized System Administrator navigates to **Dashboard > Security Console > Access Review**.
   - Click **Export Access Review (CSV)** to generate a snapshot of all active users, their assigned roles, departments, account status, and last login timestamps.

2. **Validation Criteria:**
   - **Need to Know / Principle of Least Privilege:** Does the individual still require this role for their active job responsibilities?
   - **Employment Status:** Are any deactivated or separated employees still holding active role allocations?
   - **Delegation Expiry:** Have temporary authority delegations expired and been removed?
   - **Anomaly Check:** Are there any unexpected role escalations?

3. **Sign-off & Evidence Logging:**
   - The reviewing Founder or System Admin clicks **Record Quarterly Sign-off** within the Security Console.
   - This writes an immutable audit event (`QUARTERLY_ACCESS_REVIEW_COMPLETED`) directly to Firestore `auditLog` with the reviewer's UID, timestamp, and review summary.
   - The signed CSV export is archived in the compliance vault for auditor inspection.

---

## 3. Quarterly Review Schedule & Sign-off Log

| Quarter | Target Date | Reviewer | Status | Evidence Record ID |
| :--- | :--- | :--- | :--- | :--- |
| **2026 Q1** | Mar 31, 2026 | System Admin / Founder | Completed | `auditLog/rev_2026_q1` |
| **2026 Q2** | Jun 30, 2026 | System Admin / Founder | Completed | `auditLog/rev_2026_q2` |
| **2026 Q3** | Sep 30, 2026 | System Admin / Founder | Scheduled | Pending |
| **2026 Q4** | Dec 31, 2026 | System Admin / Founder | Scheduled | Pending |
