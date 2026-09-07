# Incident Response Plan (IRP) Tabletop Exercise (SOC 2 CC7.3 / CC7.4)

> **Document Reference:** SOC2-IRP-001  
> **Control Objective:** CC7.3 / CC7.4 — Incident management policies and procedures are tested annually through simulation scenarios.  
> **Target Audience:** Engineering, IT & Cyber Security Team, Founders  
> **Exercise Cadence:** Annual  

---

## 1. Scenario: Compromised Privileged Account & Data Exfiltration Attempt

### Scenario Background
- **Event Trigger:** An alert is triggered in Discord telemetry showing 15 rapid failed login attempts against a manager-level account (`manager@mintsglobal.ae`) followed by a successful sign-in from an anomalous geographic IP range.
- **Observed Action:** The authenticated session attempts to execute a batch export on `/api/payroll/wps`.

### Simulation Execution & Response Actions

1. **Detection & Triage (T + 5 min):**
   - Security team receives the Discord telemetry alert and logs into **Dashboard > Security Console**.
   - Admin inspects **Logins Monitor** and confirms anomalous IP, user agent, and platform.

2. **Containment (T + 10 min):**
   - Admin navigates to **Security Console > Sessions** tab.
   - Forcibly revokes the active session token (`REVOKE_SESSION` logged to `auditLog`).
   - Admin immediately locks or deactivates the compromised employee profile (`DEACTIVATE_ACCOUNT`).

3. **Investigation & Impact Assessment (T + 25 min):**
   - Review immutable `auditLog` stream to verify whether any data was successfully accessed or downloaded.
   - Verify that rate limiting and role-based checks prevented unauthorized extraction.

4. **Eradication & Recovery (T + 45 min):**
   - Issue mandatory password reset and revoke all active refresh tokens for the account.
   - Re-enable the account after identity verification with the employee.

5. **Post-Incident Review & Lessons Learned (T + 24 hr):**
   - Document root cause analysis (RCA).
   - Evaluate whether additional IP restriction or alert rules are needed.

---

## 2. Tabletop Exercise Sign-off Record

| Field | Details |
| :--- | :--- |
| **Exercise Date:** | September 2026 |
| **Facilitator:** | Director IT & Cyber Security |
| **Participants:** | System Administrator, Lead Engineer, Operations Manager |
| **Outcome:** | PASS — Containment executed under 10 minutes; immutable audit logging verified. |
| **Action Items:** | Enhance Discord alert webhooks for repeated failed login anomalies. |
| **Sign-off:** | *Signed by System Admin & Founder* |
