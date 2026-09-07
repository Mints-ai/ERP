# Employee Onboarding & Offboarding Access Controls (SOC 2 CC6.2)

> **Document Reference:** SOC2-HR-001  
> **Control Objective:** CC6.2 — System access is provisioned, modified, and revoked in a timely manner based on employment status transitions.  
> **Target Audience:** Human Resources, Department Leads, System Administrators  

---

## 1. Onboarding Workflow (Access Provisioning)

1. **HR Creation:**
   - HR creates the new employee record in **Dashboard > HR > New Employee**.
   - The system generates a cryptographically random temporary password via `generateSecureTemporaryPassword()` (`crypto.getRandomValues()`).
   - Role and department assignments are validated against the standard RBAC profile.

2. **Audit Trail Generation:**
   - Creation of the profile automatically triggers an immutable audit log entry in `auditLog` with the creator's UID, timestamp, and initial role configuration.
   - A Discord telemetry announcement is dispatched notifying administrators of the new team member.

3. **First-Time Login:**
   - Upon initial login, Firebase Auth creates an authenticated session. The user must authenticate via corporate Google SSO or secure temporary credentials.

---

## 2. Offboarding & Separation Workflow (Access Deprovisioning)

1. **Deactivation Trigger:**
   - Upon employee resignation or termination, an authorized HR Manager or System Admin opens the employee's profile in **Dashboard > HR > [UID]** and toggles **Account Status** to `Deactivated` (`isActive = false`).

2. **Immediate Session Termination:**
   - All active session cookies and tokens are invalidated.
   - Any subsequent HTTP request to `/dashboard/*` or any `/api/*` endpoint is immediately rejected with `401 Unauthorized`.

3. **Audit & Compliance Logging:**
   - An immutable audit log entry (`DEACTIVATE_ACCOUNT`) is generated recording the exact second access was revoked, the acting admin, and the affected employee ID.
   - Any attempt by the separated employee to sign in is blocked and captured as `BLOCKED_LOGIN` in `loginActivity` and `securityEvents`.
