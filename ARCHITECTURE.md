# NIDHISETU System Architecture

**Tagline:** Secure Deposits. Smarter Decisions. Complete Accountability.  
**Issuing Authority:** AICTE Regulation Bureau · Problem Statement SIH26265

---

## 1. Architectural Overview

NIDHISETU is a high-assurance, tamper-evident security deposit and Fixed Deposit Receipt (FDR) management portal built for the AICTE Regulation Bureau. The architecture strictly separates **four operational dimensions**:
1. **Attested Claim:** What the educational institution declared under official submission.
2. **Document Evidence:** Native optical and text field extractions extracted from uploaded PDF certificates.
3. **Issuer Bank Validation:** Independent simulated or API bank verification checks with cryptographic response hashes.
4. **Administrative Scrutiny:** Authorized scrutiny officer observations, clarification requests, and approval decisions.

```
+-----------------------------------------------------------------------------------+
|                            NIDHISETU FRONTEND (React 19 + TypeScript + Vite)      |
|  - AppShell Navigation Rail (Deep Navy #10233F / Royal Blue #2855D9 / Teal #0D9488) |
|  - Role-Scoped Dashboards: Institution Submitter / Scrutiny Officer / Admin       |
|  - Explainable Discrepancy Scrutiny Workbench & Embedded PDF Highlight Viewer     |
|  - Smart Action Queue (Priority-ranked by urgency, findings & upcoming maturity)  |
|  - Forensic Integrity Verification Centre (pyHanko CMS, Ed25519 QR, Duplicates)  |
+-----------------------------------------------------------------------------------+
                                         |
                                (REST / JSON over TLS)
                                         v
+-----------------------------------------------------------------------------------+
|                            NIDHISETU BACKEND (FastAPI + Python 3.11)              |
|                                                                                   |
|  [Security & Cryptography Core]                                                    |
|  * AES-256-GCM Envelope Encryption for Sensitive Fields & At-Rest Storage        |
|  * SHA-256 Hash-Chained Audit Ledger with Canonical JSON & Tamper Divergence      |
|  * Ed25519 Asymmetric Signature Signer & QR Envelope Verification               |
|  * pyHanko CMS PDF Signature Validation against Synthetic Test CA Root            |
|                                                                                   |
|  [Domain Engines]                                                                 |
|  * Scrutiny & Explainable Discrepancy Engine (Side-by-side mismatch analysis)     |
|  * Maturity Monitoring & Notification Engine (Overdue / 15-day / 30-day alerts)   |
|  * Deterministic Rules & Integrity Engine (YAML Catalog v1.0.0, 13 rules)         |
|  * Release & Clearance Workflow (Separation of duties & Multi-bureau approvals)  |
|  * Replacement & Renewal Lineage (Predecessor retention without overwriting)      |
|  * Duplicate Radar (Exact SHA-256 collision + Keyed reference lookup hashes)      |
+-----------------------------------------------------------------------------------+
                                         |
                 +-----------------------+-----------------------+
                 |                                               |
                 v                                               v
+---------------------------------+             +---------------------------------+
|     SQLAlchemy ORM + SQLite     |             |      Private Object Store       |
| (PostgreSQL driver compatible)  |             | (Quarantine / Clean namespaces) |
| - 17 Relational Domain Models   |             | - AES-GCM Encrypted at rest     |
| - Foreign keys, indexes, checks |             | - Direct URL access prohibited  |
+---------------------------------+             +---------------------------------+
```

---

## 2. Core Modules

### A. Explainable Document Discrepancy Engine
- Extracts text natively via `pypdf` with confidence scores and bounding boxes.
- Directly compares attested numbers, dates, and amounts against extracted values.
- Emits structured reasons (e.g. *"Attested deposit amount (2,500,000.00) differs from physical certificate text (2,000,000.00)"*) and concrete recommended actions (*"Request institution correction or updated certificate"*).

### B. Smart Action Queue
- Replaces naive alphabetical lists with a transparent, rules-based priority engine.
- Urgency tiers: `CRITICAL` (score >= 100), `HIGH` (score >= 60), `MEDIUM` (score >= 30), `ROUTINE`.
- Transparently lists contributing factors (+100 for overdue deposits, +80 for critical integrity findings, +45 for pending release requests) and suggested next actions.

### C. Forensic Integrity Verification Centre
- **PDF Digital Signatures:** pyHanko CMS structural validation.
- **Signed Ed25519 QR Payloads:** Verifies digital signatures embedded in machine-readable QR payloads.
- **Multi-Vector Duplicate Radar:** Compares exact document binary SHA-256 hashes and keyed HMAC lookup hashes to flag cross-institution reuse without automated wrongful rejection.

### D. Append-Only Audit Ledger
- Each entry calculates:
  `current_hash = SHA256(previous_hash + aggregate_type + aggregate_id + action + outcome + actor + old_summary + new_summary + timestamp)`
- `verify_chain()` scans the entire ledger to report intactness or the exact event where divergence was introduced.
- Includes a live tamper-simulation route to demonstrate instantaneous divergence detection.

### E. Replacement & Renewal Lineage
- Matured or renewed FDRs link predecessors to successors via `FdrLink`.
- The predecessor record is preserved intact with its original dates, documents, and audit decisions.
- Successors are registered with `relationship_type = 'REPLACEMENT'`, updating predecessor status to `SUPERSEDED` while retaining complete historical traceability.
