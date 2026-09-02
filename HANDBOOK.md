# 📘 Mints Global — Team Member & Employee Handbook

Welcome to **Mints Global**! This handbook establishes our workplace standards, company culture, operational guidelines, and policy requirements. As a member of our team, you play a vital role in building world-class digital products and providing premier technology solutions to global clients.

---

## 1. Welcome & Company Culture

### 1.1 Our Mission & Core Principles
At Mints Global, we engineer high-performance systems and deliver transformative digital solutions. We operate on four fundamental tenets:
* **Radical Ownership**: Every team member owns their deliverables from conception to production deployment.
* **Speed with Precision**: We move fast, but we prioritize quality, security, and attention to detail above all else.
* **Transparent Communication**: Context is shared openly across leadership, departments, and project squads.
* **Continuous Innovation**: We encourage modernizing workflows, mastering new technologies, and eliminating friction.

---

## 2. Onboarding & Account Setup

### 2.1 First-Day Checklist
1. **Access Credentials**: Your corporate email (`@mintsglobal.ae`) and initial password will be provided by HR.
2. **First Login**: Navigate to `https://erp.mintsglobal.tech/login` (or your local environment at `http://localhost:3000/login`).
3. **Password Update**: Immediately update your password to a strong phrase containing uppercase, numbers, and special characters.
4. **Complete Profile**: Navigate to `/dashboard/hr` and ensure your phone number, emergency contacts, and job title are accurate.
5. **Theme Preference**: Toggle between Dark Mode and Light Mode using the Sun/Moon icon in the top header.

---

## 3. Working Hours & Attendance Policy

### 3.1 Standard Hours & Flexibility
* **Standard Working Week**: Monday to Friday (5 days/week).
* **Standard Daily Requirement**: 8 scheduled working hours + 1 hour lunch break.
* **Core Collaboration Window**: 10:00 AM – 4:00 PM (Local Time). Team members are expected to be reachable during this window for synchronous coordination.

### 3.2 Clock-In & Shift Protocol
All employees are required to log their daily presence through the **Attendance Module (`/dashboard/attendance`)**:
1. **Clock-In**: Immediately upon starting your work day, click **Clock In** on the main dashboard or the attendance page.
2. **Break Start**: When stepping away for lunch or personal breaks exceeding 15 minutes, click **Start Break**.
3. **Break End**: Click **Resume Work** upon returning.
4. **Clock-Out**: At the end of your scheduled shift, click **Clock Out**.

> [!IMPORTANT]
> **Clock-Skew & Verification Protection**: Our attendance engine uses server-side Firebase Admin token validation and non-negative delta clamping. If you notice any time discrepancies, do not worry—the system records exact UTC server timestamps.

### 3.3 Missed Punches & Correction Requests
If you forget to clock in/out or experience connectivity issues:
1. Navigate to `/dashboard/attendance`.
2. Scroll to **Request Correction**.
3. Enter the correct timestamp and provide a detailed reason.
4. Your Department Head will review and approve valid requests within 24 hours.

---

## 4. Leave & Time-Off Policy

### 4.1 Leave Categories
* **Annual Leave**: Accrued monthly up to 21 working days per calendar year.
* **Sick Leave**: Up to 10 days annually. Medical documentation is required for absences exceeding 2 consecutive days.
* **Casual / Emergency Leave**: Up to 5 days annually for unexpected personal emergencies.
* **Unpaid Leave**: Available with prior executive approval for extended sabbaticals.

### 4.2 Application & Notice Periods
* **Planned Leaves (>3 days)**: Submit requests at least **14 business days** in advance via `/dashboard/leaves`.
* **Short Leaves (1-2 days)**: Submit requests at least **48 hours** in advance.
* **Emergency Leaves**: Notify your manager via team chat before 9:00 AM on the day of absence, then log the request upon return.

### 4.3 Leave Approval Hierarchy
1. Employee submits request in the Leave Planner.
2. The request appears on the manager’s **Approvals Widget**.
3. The manager checks team coverage on the interactive department calendar.
4. Upon approval, days are automatically deducted from your balance and updated in HR records.

---

## 5. Internal Communication Standards

### 5.1 Communication Channels
* **Direct Messages & Team Chat (`/dashboard/chat`)**: For day-to-day team coordination, quick questions, and sprint standups.
* **Corporate Mail Room (`/dashboard/mail`)**: For formal directives, official documentation, client meeting summaries, and cross-department memos.
* **Announcements Hub (`/dashboard/announcements`)**: For company-wide updates, policy releases, and celebration notices.
* **Discord Webhooks**: Automated broadcast notifications for shift starts, leave approvals, and emergency alerts.

### 5.2 Meeting Etiquette
* Always include a clear agenda with meeting invitations.
* Turn cameras on for client calls and team town halls to build connection.
* Respect colleagues' focused deep-work blocks by prioritizing asynchronous messages over unplanned meetings.

---

## 6. Project Management & Task Execution

### 6.1 Project Workflows
* Every client contract is mapped to a Project in `/dashboard/projects`.
* **Gantt Timelines**: Project Managers maintain realistic milestones with multi-day task durations.
* **Task Kanban**: Individual contributors track task progress through `To Do` ➔ `In Progress` ➔ `In Review` ➔ `Completed`.
* Always log actual hours spent on specific tasks to ensure accurate client billing and resource allocation.

---

## 7. IT & HR Helpdesk Protocol

### 7.1 Submitting Support Tickets (`/dashboard/tickets`)
If you encounter software bugs, require software licenses, hardware equipment, or HR documentation:
1. Navigate to `/dashboard/tickets` and click **New Ticket**.
2. Select the Department (`IT Support`, `HR Operations`, `DevOps`, `Finance`).
3. Set the priority appropriately:
   * **Low**: General inquiries or non-blocking enhancements.
   * **Medium**: Minor workflow impediment with a viable workaround.
   * **High**: Blocked on a primary client deliverable.
   * **Critical**: Security issue, server outage, or data access failure.
4. Track status updates and resolutions directly on the Kanban board.

---

## 8. Information Security & Data Protection

### 8.1 Security Safeguards
* **Credential Hygiene**: Never share passwords or API keys over chat or email. Use an approved password manager.
* **Device Security**: Maintain full-disk encryption, active antivirus software, and automatic screen locking (max 5 minutes idle).
* **Client Confidentiality**: All client data, code repositories, design mockups, and strategic documents are strictly confidential.
* **Cloud Vault Usage**: Store all corporate deliverables in `/dashboard/files`. Do not store unencrypted client files on personal drives.

---

## 9. Code of Conduct & Ethics

### 9.1 Professional Conduct
Mints Global maintains a zero-tolerance policy for harassment, discrimination, or abusive behavior based on race, gender, nationality, religion, disability, or sexual orientation.

### 9.2 Conflicts of Interest
Team members must not engage in external consulting, freelancing, or commercial activities that compete directly with Mints Global or compromise performance during scheduled working hours.

---

## 10. Performance Reviews & Growth

### 10.1 Reviews & Specializations
* **Quarterly Check-ins**: Focused on milestone achievements, technical growth, and goal alignment.
* **Specialization Subroles**: High-performing team members earn specialized badges in the HR Directory (`Senior Architect`, `Lead DevOps`, `Frontend Specialist`), unlocking leadership tracks and compensation adjustments.

---

*For any questions regarding this handbook, reach out to HR at `hr@mintsglobal.ae` or submit an inquiry via the Helpdesk module.*
