# ❓ Mints Global ERP — Frequently Asked Questions (FAQ)

Find quick answers to common questions about using the Mints Global ERP platform, managing your shifts, configuring themes, submitting requests, and troubleshooting issues.

---

## 📑 Table of Contents
1. [Account Access & Authentication](#1-account-access--authentication)
2. [Themes & Display Preferences](#2-themes--display-preferences)
3. [Attendance, Clock-In & Time Tracking](#3-attendance-clock-in--time-tracking)
4. [Leaves & Time-Off Planning](#4-leaves--time-off-planning)
5. [Projects, Gantt & Automated Workflows](#5-projects-gantt--automated-workflows)
6. [Finance, Invoices & Client Portal](#6-finance-invoices--client-portal)
7. [Team Chat, Helpdesk & Mail Room](#7-team-chat-helpdesk--mail-room)
8. [Technical Troubleshooting & Support](#8-technical-troubleshooting--support)

---

## 1. Account Access & Authentication

### Q1.1: How do I log in to the ERP?
**A:** Navigate to `https://erp.mintsglobal.tech/login` (or `http://localhost:3000/login` in development). Enter your corporate email (`@mintsglobal.ae`) and password.

### Q1.2: What should I do if I forget my password?
**A:** On the login page, click **Forgot Password?**. Enter your registered corporate email address, and a secure password reset link will be sent to your inbox. If you do not receive it within 5 minutes, submit a ticket to IT Support or ask your Admin.

### Q1.3: Why am I seeing an "Invalid Token" or "Session Expired" notification?
**A:** This occurs when your Firebase authentication token expires after long periods of inactivity. The ERP automatically refreshes tokens via `getIdToken(true)`. If prompted, simply sign out and log back in to renew your cryptographic session.

### Q1.4: How are user permissions determined?
**A:** Access is governed by Role-Based Access Control (RBAC). Roles include **Founder**, **Core Team Lead**, **Department Head**, **Employee**, and **External Client**. If you require access to a restricted module (e.g. Finance or Admin Security), request approval from your Department Lead.

---

## 2. Themes & Display Preferences

### Q2.1: How do I toggle between Dark Mode and Light Mode?
**A:** Click the **Theme Toggle** (Sun/Moon icon) located in the top navigation header next to your profile avatar. The system immediately switches between the signature **Olive Forest Dark** and **High-Contrast Sage Light** themes.

### Q2.2: Will my theme preference be saved when I log in on another day?
**A:** Yes. Your choice is automatically persisted in your browser's local storage and synced across sessions.

### Q2.3: Why do some status badges have different contrast in Light Mode?
**A:** Our design system uses high-contrast accessibility tokens (`html.light .status-*`) to guarantee WCAG 2.1 AA compliance. In Light Mode, badges use slightly deeper background saturations with dark charcoal text to ensure maximum legibility against light card backgrounds.

---

## 3. Attendance, Clock-In & Time Tracking

### Q3.1: Why did my timer previously show negative numbers like `-1:-3:-24`?
**A:** This was caused by minor clock drift between a user's local machine clock and the Google Cloud server clock. When a local machine was even a few seconds behind the server's UTC timestamp, the difference evaluated to a negative number. We implemented strict non-negative clamping (`Math.max(0, ...)`) across all timers and formatters, permanently resolving this issue.

### Q3.2: What happens if I forget to clock in at the start of my shift?
**A:** Clock in as soon as you remember. Then, submit an **Attendance Correction Request** at the bottom of the `/dashboard/attendance` page detailing your actual start time. Your manager can approve the correction with one click.

### Q3.3: Do lunch breaks count towards my total worked hours?
**A:** No. When you click **Start Break**, the live worked timer pauses and shifts into break tracking mode. Total daily hours reflect net working time excluding breaks.

### Q3.4: How can I view my historical attendance and overtime?
**A:** In `/dashboard/attendance`, refer to the **Weekly Timesheet Matrix**. It displays daily clock-in/out timestamps, break durations, net worked hours, and any accrued overtime.

---

## 4. Leaves & Time-Off Planning

### Q4.1: How do I apply for annual or sick leave?
**A:** Go to `/dashboard/leaves`, select the leave category (Annual, Sick, Casual, Unpaid), choose your start and end dates, provide a brief reason, and click **Submit Application**.

### Q4.2: How do I know if my leave is approved?
**A:** You will receive a real-time notification on your dashboard, and the status will update from `Pending` to `Approved` in your Leave History table.

### Q4.3: Can I cancel or edit a leave request?
**A:** You can cancel a leave request while it is still in `Pending` status. If the leave has already been approved, contact your Department Head or HR to adjust your balance.

---

## 5. Projects, Gantt & Automated Workflows

### Q5.1: How do I switch to the Gantt Timeline view in Projects?
**A:** Navigate to `/dashboard/projects` and click the **Gantt View** tab in the top-right corner of the project board. The timeline illustrates tasks across a multi-day calendar span with milestone markers.

### Q5.2: What is the Automated Workflow Builder?
**A:** Found under `/dashboard/tasks`, the Workflow Builder allows managers to design conditional rule chains (e.g. expenses > $500 automatically route to the Founder for approval before reaching Finance).

### Q5.3: Where do I find tasks waiting for my sign-off?
**A:** Look at the **Approvals Widget** on your main `/dashboard` page. Any workflow or leave request requiring your sign-off will appear there with direct **Approve** and **Reject** buttons.

### Q5.4: Why can't I drag tasks freely between columns on the Kanban board?
**A:** To guarantee compliance and prevent unreviewed work from silently slipping into `Done`, direct drag-and-drop between columns is restricted to C-Suite Executives and System Administrators. Standard assignees advance work using audited lifecycle action buttons (`Start Task` ➔ `Submit for Review` ➔ `Approve` or `Recheck`).

### Q5.5: What happens when a task is sent back for "Recheck"?
**A:** When a manager or reviewer requests adjustments, they are required to enter mandatory written feedback in the Recheck Dialog. The task reverts to `In Progress`, and the feedback is permanently logged in the audit trail and highlighted in amber directly on the task card.

### Q5.6: Can a subtask have a due date later than its parent task?
**A:** No. Our subtask constraint engine strictly validates deadlines: a subtask's due date cannot be in the past, nor can it exceed the parent task's completion deadline.

---

## 6. Finance, Invoices & Client Portal

### Q6.1: Can external clients access internal company chat or HR records?
**A:** No. External clients log in through an isolated route (`/client-portal`). They are strictly segregated and can only see invoices, contracts, and milestones specifically tagged with their unique Client ID.

### Q6.2: How do I generate an invoice for a client?
**A:** In `/dashboard/finance`, click **Create Invoice**. Select the client, add line items with quantities and unit rates, apply any tax or discounts, and click **Generate**. You can download it as a PDF or dispatch it directly to the Client Portal.

---

## 7. Team Chat, Helpdesk & Mail Room

### Q7.1: What is the difference between Team Chat and the Mail Room?
* **Team Chat (`/dashboard/chat`)**: Fast, real-time messaging for day-to-day team coordination, quick questions, and sprint standups.
* **Mail Room (`/dashboard/mail`)**: Formal, encrypted internal memos, official policy distribution, and documentation that requires an archived audit trail.

### Q7.2: How do I submit an internal support ticket?
**A:** Navigate to `/dashboard/tickets` and click **New Ticket**. Fill out the subject, select the department category (IT Support, HR & Workplace, Finance, Access & Security, General Operations), pick a priority, describe the issue, and attach any relevant files.

### Q7.3: Why is a resolution note mandatory before marking a ticket as Resolved?
**A:** To eliminate "closed without explanation" ambiguity, support agents must document the fix, remedy, or root-cause explanation before a ticket can be moved to `Resolved`. This note is stamped in `resolutionDetails` and delivered to the ticket activity thread.

### Q7.4: Who can see "Private Staff Notes" on a ticket?
**A:** Only internal support agents and managers can see comments flagged as Private Staff Notes (distinguished by an amber background and lock icon). Standard employees requesting support only see Public Replies.

---

## 8. Technical Troubleshooting & Support

### Q8.1: Which browsers are supported?
**A:** The platform is fully optimized for modern evergreen browsers including:
* Google Chrome (v110+)
* Microsoft Edge (v110+)
* Mozilla Firefox (v115+)
* Apple Safari (v16.4+)

### Q8.2: The page seems out of date or buttons aren't responding. How do I fix it?
**A:** Perform a hard refresh to clear your browser's cached scripts:
* **Windows / Linux**: `Ctrl + F5` or `Ctrl + Shift + R`
* **macOS**: `Cmd + Shift + R`

### Q8.3: Who do I contact for urgent system bugs?
**A:** Submit a ticket with urgency level **Critical** at `/dashboard/tickets`, or alert the DevOps team directly in the `#engineering` chat channel.
