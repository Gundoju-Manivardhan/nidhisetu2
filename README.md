# NIDHISETU — AICTE Security Deposit & FDR Management Portal (SIH26265)

Secure Deposits. Smarter Decisions. Complete Accountability.

**NIDHISETU** is a streamlined regulatory portal for the AICTE Regulation Bureau to manage, verify, track, and release institutional Fixed Deposit Receipts (FDR) and Security Deposits submitted under the Approval Process Handbook.

---

## Key Features

1. **Role-Based Workspaces & Multi-Bureau Governance**
   - **Institution Workspace**: 5-step FDR submission wizard, document uploads, tracking renewals, and filing release requests.
   - **Official Scrutiny Workspace**: Regional scoping (South, West, etc.), queue management, discrepancy detection, and bank verification.
   - **Clearance Bureaus**: Independent verification checkpoints for PGRC, Vigilance Bureau, and Finance Bureau enforcing statutory separation of concerns.
   - **Two-Person Release Rule**: The officer who prepares a release dossier cannot be its final approver.
   - **Auditor & Security Admin**: Read-only oversight, rule catalog versioning, and cryptographic audit log validation.

2. **Evidence Review & Discrepancy Detection (DATA-001)**
   - Side-by-side split view comparing institution declarations against extracted document data.
   - Visual page jumping and highlight bounding boxes for audit scrutiny.
   - Masked instrument reference protection (`•••••••4821`).
   - Constructive resolution framing (identifies inconsistencies without punitive fraud labeling).

3. **Core Banking Simulation Engine**
   - Simulated bank confirmation with real-world scenarios:
     - `MATCH`: Authenticates deposit, principal sum, and AICTE lien.
     - `AMOUNT_MISMATCH`: Flags discrepancies in recorded CBS balances.
     - `LIEN_NOT_MARKED`: Identifies missing or misplaced lien endorsements.
     - `ACCOUNT_CLOSED`: Flags liquidated or prematurely closed instruments.
     - `INVALID_SIGNATURE`: Cryptographic HMAC/RSA validation failure triggers security rejection.

4. **Maturity & Succession Tracking**
   - 30-day, 60-day, and 90-day warning bands.
   - Automated reminder scan engine with deduplication.
   - Replacement deposit workflow linking predecessor and successor instruments into an unbroken chain of custody.

5. **Cryptographic Audit Trail (SHA-256 Digest Chain)**
   - Immutable audit event history capturing actor, timestamp, prior state, new state, and reason.
   - Live audit verification verifying that every block links cryptographically to its predecessor.

---

## Demo Accounts

All demo accounts use password: `Demo@12345` (quick-switch available on the sign-in page):

- **AICTE Scrutiny Officer**: `scrutiny@aicte.demo` (South & West regions)
- **Institution Submitter (Coastal)**: `submitter@coastal.demo` (Coastal Institute of Technology)
- **Institution Submitter (Highland)**: `submitter@highland.demo` (Highland School of Engineering)
- **Competent Authority / Approver**: `supervisor@aicte.demo`
- **PGRC Clearance Officer**: `pgrc@aicte.demo`
- **Vigilance Clearance Officer**: `vigilance@aicte.demo`
- **Finance Bureau Clearance Officer**: `finance@aicte.demo`
- **Read-only Auditor**: `auditor@aicte.demo`
- **Security Administrator**: `admin@aicte.demo`

---

## Technology Stack

- **Framework**: React 19 SPA, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Data & State**: TanStack React Query, React Router v7
- **Visualization**: Recharts, Lucide Icons, PDF.js
