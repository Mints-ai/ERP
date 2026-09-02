# 📖 Mints Global ERP — Comprehensive Product Documentation

---

## 1. Executive Product Overview

**Mints Global ERP** is an enterprise-grade, cloud-native Enterprise Resource Planning system engineered specifically for modern distributed digital agencies, technology firms, and remote teams. The platform centralizes human capital management, corporate communication, business development, financial tracking, task workflows, and client collaboration into a unified, high-performance interface.

### 1.1 Core Mission & Value Proposition
* **Single Source of Truth**: Eliminates fragmented third-party SaaS tools by unifying attendance, HR records, CRM pipelines, project roadmaps, and invoicing in one platform.
* **Frictionless Real-Time Collaboration**: Distributed Firestore state listeners deliver instantaneous updates across active users without manual page reloads.
* **Bespoke Dual-Theme Visual Experience**: Crafted with precision dark and light themes (Olive/Forest and Sage Cream) adhering to WCAG 2.1 AA accessibility guidelines.
* **Enterprise Security & Accountability**: Immutable administrative audit trails, Firebase Admin SDK server-side token validation, and strict Role-Based Access Control (RBAC).

---

## 2. Technical Stack & Architectural Architecture

```mermaid
graph TD
    A[Client Browser / Mobile PWA] -->|HTTPS / WSS| B[Next.js 16 App Router]
    B -->|React 19 Server & Client Components| C[Tailwind CSS v4 & Theme Engine]
    B -->|Client SDK v12 Direct Listeners| D[(Google Cloud Firestore)]
    B -->|Client Auth| E[Firebase Authentication]
    B -->|API Requests with Bearer Token| F[Serverless API Routes /api/*]
    F -->|adminAuth.verifyIdToken| G[Firebase Admin SDK v14]
    G -->|Service Account Credentials| D
    F -->|Discord Webhook Dispatcher| H[Discord Corporate Alert Channels]
```

### 2.1 Core Engineering Stack
* **Framework**: Next.js 16.2.6 (App Router + Turbopack Compiler)
* **Frontend Library**: React 19.0.0
* **Type Safety**: TypeScript 5.x with rigorous interface definitions
* **Styling & Design System**: Tailwind CSS v4 + Vanilla CSS Variables with `next-themes`
* **Data Layer**: Google Cloud Firestore (multi-collection real-time NoSQL database)
* **Authentication**: Firebase Authentication (Email/Password, Session Persistence)
* **Backend Security**: Firebase Admin SDK v14 (Server-side token verification proxy)
* **Icons & Visuals**: Lucide React iconography

---

## 3. The Dual-Theme Design System

Mints Global ERP features an adaptive, dual-theme visual architecture engineered to maximize readability and reduce eye fatigue in both low-light and bright office environments.

### 3.1 Dark Mode (Signature Forest / Deep Olive)
* **Background Base**: `#0a0e0b` (Deep obsidian forest green)
* **Card & Elevated Surfaces**: `#121813` with subtle border highlights (`rgba(255,255,255,0.06)`)
* **Primary Brand Accent**: `#84a98c` / `#52796f` (Muted emerald & olive)
* **Text Contrast**: `#f0f4ee` (High-contrast pale sage)

### 3.2 Light Mode (High-Contrast Sage Cream)
* **Background Base**: `#f5f7f4` (Soft cream sage)
* **Card & Elevated Surfaces**: `#ffffff` with soft drop shadows and clean borders (`rgba(0,0,0,0.08)`)
* **Primary Brand Accent**: `#2d5a3f` (Deep pine olive)
* **Text Contrast**: `#1a241b` (High-legibility deep forest charcoal)

### 3.3 Semantic Token Architecture
Every UI component utilizes CSS custom properties declared in `src/app/globals.css`:
* `var(--background)`: Page base background
* `var(--foreground)`: High-contrast typography
* `var(--card)` / `var(--card-foreground)`: Panel surfaces
* `var(--primary)` / `var(--primary-foreground)`: Interactive brand buttons and links
* `var(--muted)` / `var(--muted-foreground)`: Secondary labels and metadata
* `var(--border)`: Dynamic container and card dividers

---

## 4. Comprehensive Feature & Module Catalog

### 4.1 Command Center (`/dashboard`)
* **Live KPI Counters**: Instant cards displaying active team headcounts, open tasks, unbilled revenue, and pending approvals.
* **Quick Clock-In Action**: Direct 1-click punch-in widget connected to the distributed attendance state machine.
* **Activity Stream**: Aggregated timeline of project completions, client invoice approvals, and team check-ins.
* **Global Search (`Cmd/Ctrl + K`)**: Fuzzy search dialog spanning employees, clients, projects, and helpdesk tickets.

### 4.2 Attendance & Live Time Tracking (`/dashboard/attendance`)
* **Serverless State Machine**: Enforces valid shifts (`clock-in` ➔ `break-start` ➔ `break-end` ➔ `clock-out`).
* **Clock-Skew Protection**: Client-side timers and server-side logs clamp all elapsed delta calculations with `Math.max(0, ...)` to eliminate negative timer display anomalies.
* **Weekly Timesheet Matrix**: Interactive grid calculating daily worked hours, cumulative overtime, and lunch break durations.
* **Attendance Correction Requests**: Formal dispute system allowing staff to request timestamp corrections subject to managerial sign-off.
* **Discord Telemetry**: Instant notifications sent to `#attendance-log` on shift start, break toggle, and sign-off.

### 4.3 Human Resources & Org Directory (`/dashboard/hr`)
* **Organizational Hierarchy Tree**: Top-down visual corporate chart organizing staff hierarchically (Founder ➔ Core Leadership ➔ Department Leads ➔ Associates).
* **Specialization Subrole Badges**: Displays specific competencies (e.g. Full-Stack Lead, UI/UX Architect, Cloud Engineer).
* **Staff Profiles**: Contact directories, assigned assets, emergency contacts, and department filters.

### 4.4 CRM & Sales Pipeline (`/dashboard/crm`)
* **Kanban Stage Management**: Visual deal progression stages (Lead, Meeting Scheduled, Proposal Sent, In Negotiation, Closed Won, Closed Lost).
* **Weighted Value Analytics**: Real-time aggregation of pipeline value based on deal closing probabilities.
* **Deal Detail Modals**: Client interaction histories, proposal links, and deal value adjustments.

### 4.5 Projects & Gantt Roadmap (`/dashboard/projects`)
* **Multi-View Project Tracker**: Toggle between Kanban board, list view, and visual Gantt timeline.
* **Interactive Gantt Timeline**: Multi-day task duration bars with dependency tracking and milestone flags.
* **Budget vs. Actual Hours**: Tracks logged employee timesheet hours against allocated project budgets.

### 4.6 Enterprise Task Governance & Workflow Architecture (`/dashboard/tasks`)
* **Role-Gated Drag-and-Drop**: Freeform drag-and-drop between Kanban columns is restricted exclusively to C-Suite Executives and System Administrators. Standard assignees advance tasks through audited sequential lifecycle buttons (`Start Task` ➔ `Submit for Review` ➔ `Approve` / `Recheck`).
* **Mandatory Recheck Audit Loop**: Supervisors cannot reject work without submitting mandatory actionable feedback, which is permanently logged in the audit trail and highlighted directly on the task card.
* **Cascading Deletion with Justification**: Deleting or cancelling a task requires a non-empty cancellation reason. All child subtasks are cascaded automatically, and notifications/internal emails are dispatched to affected team members.
* **Delegated Team Task Hierarchy**: Supports Team Tasks with designated Team Leader accountability, Co-Leaders, and Member assignment pools.
* **Subtask Deadline Constraints**: Subtask deadlines are strictly bounded: they cannot be in the past and cannot exceed the parent task's completion deadline.
* **Secure Attachment Whitelisting**: Permitted file extensions are limited to `.pdf`, `.docx`, and `.xlsx` (max 10MB) with filename sanitization.
* **Focus Mode**: Single-session concurrency-guarded distraction-free timer with autosaved work notes.

### 4.7 Financial Treasury & Invoicing (`/dashboard/finance`)
* **Invoice Generator**: Multi-item invoice builder calculating taxes, discounts, and payment terms.
* **Cash Flow Telemetry**: Graphical breakdown of accounts receivable, cleared payments, and operational burn.
* **Payment Status Tracking**: Visual status pills (`Draft`, `Sent`, `Partially Paid`, `Paid`, `Overdue`).

### 4.8 Leaves & PTO Planner (`/dashboard/leaves`)
* **Entitlement Balances**: Real-time tracking of Annual, Sick, Casual, and Unpaid leave allocations.
* **Interactive Team Calendar**: Visual leave heatmap preventing department under-staffing.
* **Approval Chain**: Direct manager routing with automated leave balance deduction upon approval.

### 4.9 Corporate Team Chat (`/dashboard/chat`)
* **Department Channels**: Segregated communication channels (`#general`, `#engineering`, `#marketing`, `#finance`).
* **Direct Messaging**: Private 1-on-1 team messaging with unread badges.
* **Live Presence Indicators**: Green active dot synced with shift clock-in state.

### 4.10 Cloud Drive Vault (`/dashboard/files`)
* **Secure Folder Explorer**: Hierarchical folder structure with drag-and-drop file uploads.
* **Role-Based Storage**: Confidential folders restricted to leadership roles.
* **Version Tracking**: Download and replace files with audit logs.

### 4.11 Enterprise IT & HR Helpdesk (`/dashboard/tickets`)
* **Audited 4-Stage Kanban**: Multi-column service desk managing tickets across `Open`, `In Progress`, `Waiting on Requester`, and `Resolved` stages.
* **Role-Gated Transitions**: Non-privileged users cannot arbitrarily drag tickets into `Resolved` without authorized support agent or managerial clearance.
* **Mandatory Resolution Notes**: Moving any ticket to `Resolved` strictly mandates a resolution note explaining the fix or root-cause remedy applied, recorded in `resolutionDetails`.
* **Audited Ticket Cancellations**: Deleting or cancelling a ticket requires a formal reason, with automatic notification and internal email dispatch to the requester.
* **Dual-Layer Activity Thread**: Support agents can post both Public Replies (visible to the requester) and Private Staff Notes (marked with a lock badge and hidden from regular employees).
* **Attachment Whitelisting**: Supported file types: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg` (max 10MB).

### 4.12 Corporate Mail Room (`/dashboard/mail`)
* **3-Pane Email Suite**: Inbox, Sent, Drafts, and Archive folders.
* **Rich Memo Drafting**: Internal memo composer for official business communications.
* **Real-Time Delivery**: Messages deliver instantly via Firestore collection subscriptions.

### 4.13 Company Announcements (`/dashboard/announcements`)
* **Broadcast Hub**: Company-wide broadcasts with category tags (`Policy Update`, `Celebration`, `Urgent Notice`).
* **Audience Targeting**: Target all employees or specific departments.
* **Pinned Announcements**: Pin critical directives to the top of employee dashboards.

### 4.14 Reports & Business Intelligence (`/dashboard/reports`)
* **Executive Summary Graphs**: Monthly revenue growth, billable utilization, and attendance rates.
* **Export Utilities**: 1-click export to CSV and PDF for financial audits and stakeholder reporting.

### 4.15 Security & Admin Audit Trail (`/dashboard/security`)
* **Immutable Audit Trail**: Append-only log recording all administrative modifications, logins, and permission changes.
* **Telemetry Data**: Captures user UID, action type, client IP address, user-agent, and server timestamp.

### 4.16 External Client Portal (`/client-portal` & `/dashboard/clients`)
* **Isolated Client Tenancy**: External clients authenticate into an isolated portal restricted from internal company data.
* **Milestone & Invoice Visibility**: Clients view active project milestones, approve deliverables, and download invoices.

### 4.17 System Settings & Integrations (`/dashboard/settings`)
* **Discord Webhook Configuration**: Manage webhook URLs for automated alerts on shifts, leaves, and invoices.
* **Platform Customization**: Organization name, primary currency, working hours, and time zone configuration.

---

## 5. Security & Authorization Architecture

### 5.1 Role-Based Access Control (RBAC)
| Role | Dashboard | Attendance | HR / Org | CRM / Projects | Finance | Admin Audit | Settings |
|---|---|---|---|---|---|---|---|
| **Founder / Admin** | Full | Full | Full | Full | Full | Full | Full |
| **Core Team Lead** | Full | Full | Full | Full | Read/Write | Read-only | Limited |
| **Department Head** | Department | Department | Department | Assigned | Department | No | No |
| **Employee** | Personal | Personal | Read-only | Assigned | No | No | No |
| **External Client** | Scoped | No | No | Scoped | Invoices only | No | No |

### 5.2 Server-Side Token Authentication
All API endpoints under `src/app/api/*` validate incoming bearer tokens using the initialized Firebase Admin SDK:
```typescript
import { adminAuth } from "@/lib/firebaseAdmin";

const authHeader = req.headers.get("authorization");
const token = authHeader?.replace("Bearer ", "");
const decodedToken = await adminAuth.verifyIdToken(token);
const uid = decodedToken.uid;
```

---

## 6. Deployment & Environment Variables

### 6.1 Environment Configuration (`.env.local`)
```env
# Client-side Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mintserp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mintserp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mintserp.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...

# Server-side Firebase Admin SDK Credentials
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mintserp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDSEqyxGVcDCjr7...\n-----END PRIVATE KEY-----\n"

# Webhooks & Integrations
DISCORD_WEBHOOK_ATTENDANCE=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_ALERTS=https://discord.com/api/webhooks/...
```
