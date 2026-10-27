import {
  DEMO_ACCOUNTS_MAP,
  INITIAL_AUDIT_EVENTS,
  INITIAL_FDR_DETAILS,
  INITIAL_INSTITUTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RELEASES,
  MOCK_META,
  RELEASE_POLICY,
  RULE_CATALOG,
  SCENARIO_CATALOG,
} from "./mockData";
import type {
  AuditEvent,
  Clearance,
  DocumentSummary,
  EvidenceField,
  FdrDetail,
  FdrListItem,
  Finding,
  Institution,
  MaturityItem,
  Notification,
  Overview,
  ReleasePolicy,
  ReleaseRequest,
  ReportTable,
  RuleCatalog,
  ScenarioCatalog,
  Session,
  UploadFinalizeResult,
  UploadSession,
  VerificationCheck,
} from "./types";

const STORAGE_KEY_PREFIX = "koshsetu_mock_";

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (item) return JSON.parse(item);
  } catch (e) {
    console.warn("Mock storage load error", e);
  }
  return fallback;
}

function saveStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(val));
  } catch (e) {
    console.warn("Mock storage save error", e);
  }
}

class MockBackendStore {
  currentUserEmail: string | null = null;
  institutions: Institution[];
  fdrs: FdrDetail[];
  releases: ReleaseRequest[];
  auditEvents: AuditEvent[];
  notifications: Notification[];

  constructor() {
    this.currentUserEmail = loadStorage("current_user", "scrutiny@aicte.demo");
    this.institutions = loadStorage("institutions", INITIAL_INSTITUTIONS);
    this.fdrs = loadStorage("fdrs", INITIAL_FDR_DETAILS);
    this.releases = loadStorage("releases", INITIAL_RELEASES);
    this.auditEvents = loadStorage("audit", INITIAL_AUDIT_EVENTS);
    this.notifications = loadStorage("notifications", INITIAL_NOTIFICATIONS);
  }

  getCurrentSession(): Session | null {
    if (!this.currentUserEmail) return null;
    const account = DEMO_ACCOUNTS_MAP[this.currentUserEmail];
    return account ? account.session : DEMO_ACCOUNTS_MAP["scrutiny@aicte.demo"].session;
  }

  setCurrentUser(email: string | null) {
    this.currentUserEmail = email;
    saveStorage("current_user", email);
  }

  save() {
    saveStorage("fdrs", this.fdrs);
    saveStorage("releases", this.releases);
    saveStorage("audit", this.auditEvents);
    saveStorage("notifications", this.notifications);
  }

  addAuditEvent(
    aggregateType: string,
    aggregateId: string,
    action: string,
    outcome: string,
    reason: string | null,
    oldState: string | null = null,
    newState: string | null = null,
  ) {
    const session = this.getCurrentSession();
    const actor = session ? session.display_name : "SYSTEM";
    const prevDigest =
      this.auditEvents.length > 0
        ? this.auditEvents[this.auditEvents.length - 1].integrity_digest
        : "genesis_hash_00000000000000000000";
    const pseudoHash = Math.random().toString(16).substring(2, 10) + Date.now().toString(16);
    const digest = `${prevDigest.substring(0, 16)}:${pseudoHash}`;

    const event: AuditEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      aggregate_type: aggregateType,
      aggregate_id: aggregateId,
      actor_label: actor,
      action,
      outcome,
      reason,
      old_state_summary: oldState,
      new_state_summary: newState,
      request_id: `req-${Date.now()}`,
      integrity_digest: digest,
      occurred_at: new Date().toISOString(),
    };
    this.auditEvents.push(event);
    saveStorage("audit", this.auditEvents);
  }

  toListItem(detail: FdrDetail): FdrListItem {
    return {
      id: detail.id,
      institution_id: detail.institution.id,
      institution_name: detail.institution.name,
      aicte_id: detail.institution.aicte_id,
      region_code: detail.institution.region_code,
      issuer_bank: detail.issuer_bank,
      fdr_number_masked: detail.fdr_number_masked,
      principal_amount: detail.principal_amount,
      currency: detail.currency,
      issue_date: detail.issue_date,
      maturity_date: detail.maturity_date,
      days_remaining: detail.days_remaining,
      is_maturing: detail.days_remaining <= 30 && detail.days_remaining >= 0,
      status: detail.status,
      assigned_officer_id: detail.assigned_officer_id,
      attention_level: detail.attention_level,
      open_finding_count: detail.findings.filter((f) => f.status === "OPEN").length,
      version: detail.version,
      updated_at: detail.updated_at,
    };
  }
}

export const mockStore = new MockBackendStore();

// Generates a minimal real PDF byte stream
export function createSyntheticPdfBlob(fdrNumber: string, amount: string): Blob {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 260 >> stream
BT
/F1 20 Tf
50 720 Td
(ALL INDIA COUNCIL FOR TECHNICAL EDUCATION) Tj
/F1 14 Tf
0 -40 Td
(SECURITY DEPOSIT / FIXED DEPOSIT RECEIPT) Tj
/F1 11 Tf
0 -30 Td
(FDR Ref: ${fdrNumber}) Tj
0 -20 Td
(Principal Sum: Rs. ${amount}) Tj
0 -20 Td
(Lien Holder: Member Secretary, AICTE New Delhi) Tj
0 -20 Td
(Status: Verified Security Instrument) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000557 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
630
%%EOF`;

  return new Blob([content], { type: "application/pdf" });
}

export async function handleMockApiRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
  } = {},
): Promise<unknown> {
  const method = (options.method || "GET").toUpperCase();
  const cleanPath = path.split("?")[0];
  const query = options.query || {};

  await new Promise((r) => setTimeout(r, 30));

  // --- /meta ---
  if (cleanPath === "/meta") {
    return MOCK_META;
  }

  // --- /me ---
  if (cleanPath === "/me") {
    const session = mockStore.getCurrentSession();
    if (!session) {
      const err = new Error("Not authenticated");
      (err as unknown as { status: number }).status = 401;
      throw err;
    }
    return session;
  }

  // --- /auth/login ---
  if (cleanPath === "/auth/login" && method === "POST") {
    const { email } = (options.body || {}) as { email?: string };
    const targetEmail = (email || "scrutiny@aicte.demo").toLowerCase().trim();
    const account = DEMO_ACCOUNTS_MAP[targetEmail] || DEMO_ACCOUNTS_MAP["scrutiny@aicte.demo"];
    mockStore.setCurrentUser(targetEmail in DEMO_ACCOUNTS_MAP ? targetEmail : "scrutiny@aicte.demo");
    return account.session;
  }

  // --- /auth/logout ---
  if (cleanPath === "/auth/logout" && method === "POST") {
    mockStore.setCurrentUser(null);
    return { ok: true };
  }

  // --- /smart-action-queue ---
  if (cleanPath === "/smart-action-queue") {
    const queueItems = [
      {
        fdr_id: "fdr-coastal-001",
        fdr_number_masked: "•••••••4821",
        issuer_bank: "State Bank of India",
        institution_name: "Coastal Institute of Technology",
        urgency_level: "HIGH",
        priority_score: 88,
        primary_reason: "DATA-001: Declared ₹25,00,000 differs from extracted ₹20,00,000 in document.",
        suggested_action: "Review highlighted PDF evidence and seek institution clarification.",
      },
      {
        fdr_id: "fdr-coastal-002",
        fdr_number_masked: "•••••••9044",
        issuer_bank: "Bank of Baroda",
        institution_name: "Coastal Institute of Technology",
        urgency_level: "CRITICAL",
        priority_score: 95,
        primary_reason: "MAT-001: Deposit maturing in 12 days. Replacement pending.",
        suggested_action: "Record replacement instrument or initiate statutory renewal.",
      },
      {
        fdr_id: "fdr-highland-001",
        fdr_number_masked: "•••••••7712",
        issuer_bank: "Punjab National Bank",
        institution_name: "Highland School of Engineering",
        urgency_level: "ROUTINE",
        priority_score: 62,
        primary_reason: "Release case rel-highland-001 awaiting Finance Bureau verification.",
        suggested_action: "Coordinate with Finance Bureau officer for final release signoff.",
      },
    ];
    return queueItems;
  }

  // --- /overview ---
  if (cleanPath === "/overview") {
    const session = mockStore.getCurrentSession();
    const isInst = session?.workspace === "institution";
    const instId = session?.institution_ids[0];

    const relevantFdrs = mockStore.fdrs.filter((f) => {
      if (isInst && instId) return f.institution.id === instId;
      return true;
    });

    const totalCount = relevantFdrs.length;
    const totalAmount = relevantFdrs.reduce((acc, f) => acc + parseFloat(f.principal_amount || "0"), 0);
    const maturingCount = relevantFdrs.filter((f) => f.days_remaining <= 30 && f.days_remaining >= 0).length;
    const criticalCount = relevantFdrs.filter((f) => f.attention_level === "CRITICAL").length;

    const actionNeeded = relevantFdrs
      .filter((f) => f.attention_level === "CRITICAL" || f.attention_level === "HIGH")
      .map((f) => mockStore.toListItem(f));

    const overview: Overview = {
      scope_label: isInst
        ? session.display_name
        : "Assigned region: SOUTH, WEST (Regulation Bureau)",
      as_of: new Date().toISOString(),
      kpis: [
        {
          key: "TOTAL_INSTRUMENTS",
          label: "Active Instruments",
          value: String(totalCount),
          unit: "instruments",
          inclusion_criteria: "Active FDRs assigned to current jurisdiction",
          filter_hint: { instrument_status: "ACTIVE" },
        },
        {
          key: "TOTAL_VALUE",
          label: "Security Deposit Value",
          value: `₹${(totalAmount / 100000).toFixed(2)} L`,
          unit: "INR",
          inclusion_criteria: "Aggregate principal of all active FDRs",
          filter_hint: {},
        },
        {
          key: "MATURING_SOON",
          label: "Maturing within 30 Days",
          value: String(maturingCount),
          unit: "requiring renewal",
          inclusion_criteria: "Maturity date <= 30 days remaining",
          filter_hint: { maturity_band: "30_DAYS" },
        },
        {
          key: "CRITICAL_ATTENTION",
          label: "Integrity Exceptions",
          value: String(criticalCount),
          unit: "cases flagged",
          inclusion_criteria: "Open DATA or VERIFICATION findings",
          filter_hint: { review_status: "UNDER_REVIEW" },
        },
      ],
      maturity_by_month: [
        { label: "Nov 2026", month: "2026-11", count: 1, amount: "₹15,00,000" },
        { label: "Dec 2026", month: "2026-12", count: 0, amount: "₹0" },
        { label: "Jan 2027", month: "2027-01", count: 1, amount: "₹25,00,000" },
        { label: "Feb 2027", month: "2027-02", count: 0, amount: "₹0" },
        { label: "Mar 2027", month: "2027-03", count: 0, amount: "₹0" },
      ],
      verification_backlog: [
        { label: "Core Banking Verified", month: null, count: 3, amount: "₹1,00,00,000" },
        { label: "Pending Verification", month: null, count: 1, amount: "₹25,00,000" },
        { label: "Discrepancy Reported", month: null, count: 0, amount: "₹0" },
      ],
      action_needed: actionNeeded,
      recent_activity: [...mockStore.auditEvents].reverse().slice(0, 8),
    };
    return overview;
  }

  // --- /institutions ---
  if (cleanPath === "/institutions") {
    return mockStore.institutions;
  }

  // --- /rules ---
  if (cleanPath === "/rules") {
    return RULE_CATALOG;
  }

  // --- /verification/scenarios & /scenarios ---
  if (cleanPath === "/verification/scenarios" || cleanPath === "/scenarios") {
    return SCENARIO_CATALOG;
  }

  // --- /release-policy & /releases/policy ---
  if (cleanPath === "/release-policy" || cleanPath === "/releases/policy") {
    return RELEASE_POLICY;
  }

  // --- /release-requests & /releases (List & Create) ---
  if (cleanPath === "/release-requests" || cleanPath === "/releases") {
    if (method === "POST") {
      const body = (options.body || {}) as {
        fdr_id: string;
        basis_code: string;
        justification: string;
      };
      const fdr = mockStore.fdrs.find((f) => f.id === body.fdr_id);
      if (!fdr) throw new Error("FDR instrument not found");

      const session = mockStore.getCurrentSession();
      const newRelease: ReleaseRequest = {
        id: `rel-${Date.now()}`,
        fdr_id: fdr.id,
        fdr_number_masked: fdr.fdr_number_masked,
        institution_id: fdr.institution.id,
        institution_name: fdr.institution.name,
        basis_code: body.basis_code || "INSTITUTION_CLOSURE",
        basis_label: "Closure of institution",
        justification: body.justification || "Statutory release application submitted.",
        status: "CLEARANCES_PENDING",
        hold_reason: null,
        policy_version: "1.0.0",
        version: 1,
        requested_by_label: session?.display_name || "Institution Official",
        prepared_by: null,
        approved_by: null,
        created_at: new Date().toISOString(),
        decided_at: null,
        clearances: [
          {
            id: `clr-pgrc-${Date.now()}`,
            bureau_code: "PGRC",
            bureau_name: "Public Grievance Redressal Committee",
            required: true,
            state: "PENDING",
            requirement_version: "1.0.0",
            outcome: null,
            reason: null,
            decided_by: null,
            decided_at: null,
            valid_until: null,
          },
          {
            id: `clr-vig-${Date.now()}`,
            bureau_code: "VIGILANCE",
            bureau_name: "Vigilance Bureau",
            required: true,
            state: "PENDING",
            requirement_version: "1.0.0",
            outcome: null,
            reason: null,
            decided_by: null,
            decided_at: null,
            valid_until: null,
          },
          {
            id: `clr-fin-${Date.now()}`,
            bureau_code: "FINANCE_BUREAU",
            bureau_name: "Finance Bureau",
            required: true,
            state: "PENDING",
            requirement_version: "1.0.0",
            outcome: null,
            reason: null,
            decided_by: null,
            decided_at: null,
            valid_until: null,
          },
        ],
        checklist: [
          {
            code: "APPLICATION_LETTER",
            label: "Signed application letter",
            satisfied: true,
            document_id: "doc-rel-1",
          },
          {
            code: "AFFIDAVIT",
            label: "Affidavit in prescribed format",
            satisfied: true,
            document_id: "doc-rel-2",
          },
          {
            code: "FDR_COPY",
            label: "Copy of original deposit instrument",
            satisfied: true,
            document_id: "doc-rel-3",
          },
        ],
        approvals: [],
        blocking_reasons: [
          "PGRC clearance is pending.",
          "Vigilance Bureau clearance is pending.",
          "Finance Bureau clearance is pending.",
        ],
        can_finally_approve: false,
        principal_amount: fdr.principal_amount,
        maturity_date: fdr.maturity_date,
      };

      fdr.release_request_id = newRelease.id;
      mockStore.releases.unshift(newRelease);
      mockStore.addAuditEvent("RELEASE_REQUEST", newRelease.id, "RELEASE_INITIATED", "SUCCESS", "Release request submitted");
      mockStore.save();
      return newRelease;
    }

    let list = mockStore.releases;
    const session = mockStore.getCurrentSession();
    if (session?.workspace === "institution" && session.institution_ids.length > 0) {
      list = list.filter((r) => session.institution_ids.includes(r.institution_id));
    }
    return list;
  }

  // --- /release-requests/:id/clearances/:bureauCode/decide ---
  const clearanceDecideMatch = cleanPath.match(
    /^\/(?:release-requests|releases)\/([^/]+)\/clearances\/([^/]+)(?:\/decide)?$/,
  );
  if (clearanceDecideMatch && method === "POST") {
    const [, relId, bureauCode] = clearanceDecideMatch;
    const { outcome, reason, valid_until } = (options.body || {}) as {
      outcome: string;
      reason: string;
      valid_until?: string;
    };
    const session = mockStore.getCurrentSession();

    const rel = mockStore.releases.find((r) => r.id === relId);
    if (!rel) throw new Error("Release request not found");

    const clr = rel.clearances.find((c) => c.bureau_code === bureauCode || c.id === bureauCode);
    if (!clr) throw new Error("Clearance requirement not found");

    if (
      session &&
      session.bureau_codes.length > 0 &&
      !session.bureau_codes.includes("ALL") &&
      !session.bureau_codes.includes(clr.bureau_code)
    ) {
      const err = new Error(
        `Permission denied: You are assigned to ${session.bureau_codes.join(", ")}, but this clearance is owned by ${clr.bureau_code}.`,
      );
      (err as unknown as { status: number; code: string }).status = 403;
      (err as unknown as { code: string }).code = "BUREAU_MISMATCH";
      throw err;
    }

    clr.state = outcome === "REJECTED" ? "REJECTED" : "CLEARED";
    clr.outcome = clr.state;
    clr.reason = reason || "Clearance criteria fulfilled after statutory review.";
    clr.decided_by = session ? session.email : "officer@aicte.demo";
    clr.decided_at = new Date().toISOString();
    clr.valid_until = valid_until || new Date(Date.now() + 365 * 86400000).toISOString();

    const pendingClearances = rel.clearances.filter((c) => c.state !== "CLEARED");
    if (pendingClearances.length === 0) {
      rel.status = "READY_FOR_DECISION";
      rel.blocking_reasons = [
        "Case preparation must be recorded before final competent authority decision.",
        "Two-person rule: officer preparing the case cannot be its final approver.",
      ];
      rel.can_finally_approve = false;
    } else {
      rel.blocking_reasons = pendingClearances.map((c) => `${c.bureau_name} clearance is pending.`);
      rel.can_finally_approve = false;
    }

    mockStore.addAuditEvent(
      "RELEASE_REQUEST",
      rel.id,
      "CLEARANCE_RECORDED",
      clr.state,
      `Clearance for ${clr.bureau_name} recorded as ${clr.state}. Reason: ${reason}`,
    );
    mockStore.save();
    return rel;
  }

  // --- /release-requests/:id/prepare ---
  const prepareMatch = cleanPath.match(/^\/(?:release-requests|releases)\/([^/]+)\/prepare$/);
  if (prepareMatch && method === "POST") {
    const relId = prepareMatch[1];
    const rel = mockStore.releases.find((r) => r.id === relId);
    if (!rel) throw new Error("Release request not found");

    const session = mockStore.getCurrentSession();
    rel.prepared_by = session ? session.email : "supervisor@aicte.demo";
    rel.blocking_reasons = [
      "Case prepared. A different officer must approve to satisfy the two-person rule.",
    ];
    rel.can_finally_approve = true;

    mockStore.addAuditEvent(
      "RELEASE_REQUEST",
      rel.id,
      "CASE_PREPARED",
      "SUCCESS",
      `Case dossier prepared by ${rel.prepared_by}. Prepared status recorded.`,
    );
    mockStore.save();
    return rel;
  }

  // --- /release-requests/:id/approve or reject or decision ---
  const actionMatch = cleanPath.match(/^\/(?:release-requests|releases)\/([^/]+)\/(approve|reject|decision)$/);
  if (actionMatch && method === "POST") {
    const [, relId, action] = actionMatch;
    const body = (options.body || {}) as { decision?: string; reason?: string };
    const decision = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : (body.decision || "APPROVED");
    const reason = body.reason || "Release sanctioned in accordance with Approval Process Handbook regulations.";

    const rel = mockStore.releases.find((r) => r.id === relId);
    if (!rel) throw new Error("Release request not found");

    const session = mockStore.getCurrentSession();
    const currentEmail = session ? session.email : "supervisor@aicte.demo";

    if (decision === "APPROVED" && rel.prepared_by && rel.prepared_by === currentEmail) {
      const err = new Error(
        "Two-person separation rule violated: The officer who prepared the release dossier cannot be its final decision approver.",
      );
      (err as unknown as { status: number; code: string }).status = 403;
      (err as unknown as { code: string }).code = "TWO_PERSON_RULE_VIOLATION";
      throw err;
    }

    rel.status = decision === "REJECTED" ? "REJECTED" : "APPROVED";
    rel.approved_by = currentEmail;
    rel.decided_at = new Date().toISOString();
    rel.blocking_reasons = [];
    rel.approvals.push({
      id: `appr-${Date.now()}`,
      stage: "COMPETENT_AUTHORITY",
      outcome: rel.status,
      reason,
      actor_label: session ? session.display_name : "Competent Authority",
      decided_at: new Date().toISOString(),
    });

    const fdr = mockStore.fdrs.find((f) => f.id === rel.fdr_id);
    if (fdr && rel.status === "APPROVED") {
      fdr.status.instrument_status = "RELEASED";
      fdr.status.lien_status = "LIEN_DISCHARGED";
    }

    mockStore.addAuditEvent(
      "RELEASE_REQUEST",
      rel.id,
      "FINAL_APPROVAL_DECISION",
      rel.status,
      `Competent authority decision recorded as ${rel.status}. Reason: ${reason}`,
    );
    mockStore.save();
    return rel;
  }

  // --- /release-requests/:id ---
  const releaseMatch = cleanPath.match(/^\/(?:release-requests|releases)\/([^/]+)$/);
  if (releaseMatch) {
    const relId = releaseMatch[1];
    const rel = mockStore.releases.find((r) => r.id === relId);
    if (!rel) throw new Error("Release request not found");
    return rel;
  }

  // --- /fdrs (List and Create) ---
  if (cleanPath === "/fdrs" || cleanPath === "/fdrs/drafts") {
    if (method === "POST") {
      const body = (options.body || {}) as Partial<FdrDetail> & {
        fdr_number?: string;
        institution_id?: string;
      };
      const session = mockStore.getCurrentSession();
      const inst =
        mockStore.institutions.find((i) => i.id === body.institution_id) ||
        mockStore.institutions.find((i) => i.id === session?.institution_ids[0]) ||
        mockStore.institutions[0];

      const rawNumber = body.fdr_number || "FDR-" + Math.floor(1000 + Math.random() * 9000);
      const masked = "•••••••" + rawNumber.slice(-4);
      const newFdr: FdrDetail = {
        id: `fdr-${Date.now()}`,
        institution: inst,
        issuer_bank: body.issuer_bank || "State Bank of India",
        branch: body.branch || "Central Branch",
        ifsc: body.ifsc || "SBIN0001000",
        fdr_number_masked: masked,
        principal_amount: String(body.principal_amount || "1000000.00"),
        currency: body.currency || "INR",
        interest_rate: body.interest_rate || "7.00%",
        issue_date: body.issue_date || new Date().toISOString().split("T")[0],
        maturity_date:
          body.maturity_date ||
          new Date(Date.now() + 365 * 86400000 * 3).toISOString().split("T")[0],
        days_remaining: 1095,
        lien_beneficiary: body.lien_beneficiary || "AICTE New Delhi",
        status: {
          submission_status: "DRAFT",
          document_processing_status: "PENDING",
          bank_verification_status: "PENDING",
          review_status: "DRAFT",
          instrument_status: "PENDING",
          lien_status: "PENDING",
        },
        assigned_officer_id: null,
        version: 1,
        attention_level: "ROUTINE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        evidence_fields: [],
        documents: [],
        verification_checks: [],
        findings: [],
        review_decisions: [],
        links: [],
        release_request_id: null,
        permitted_actions: ["UPLOAD", "SUBMIT", "EDIT"],
      };

      mockStore.fdrs.unshift(newFdr);
      mockStore.addAuditEvent("FDR", newFdr.id, "DRAFT_CREATED", "SUCCESS", "New FDR draft initialized");
      mockStore.save();
      return newFdr;
    }

    let list = mockStore.fdrs.map((f) => mockStore.toListItem(f));
    const session = mockStore.getCurrentSession();
    if (session?.workspace === "institution" && session.institution_ids.length > 0) {
      list = list.filter((i) => session.institution_ids.includes(i.institution_id));
    }
    if (query.q) {
      const q = String(query.q).toLowerCase();
      list = list.filter(
        (i) =>
          i.institution_name.toLowerCase().includes(q) ||
          i.issuer_bank.toLowerCase().includes(q) ||
          i.fdr_number_masked.toLowerCase().includes(q) ||
          i.aicte_id.toLowerCase().includes(q),
      );
    }
    if (query.review_status) {
      list = list.filter((i) => i.status.review_status === query.review_status);
    }
    if (query.submission_status) {
      list = list.filter((i) => i.status.submission_status === query.submission_status);
    }
    if (query.instrument_status) {
      list = list.filter((i) => i.status.instrument_status === query.instrument_status);
    }
    if (query.bank_verification_status) {
      list = list.filter((i) => i.status.bank_verification_status === query.bank_verification_status);
    }
    if (query.maturity_band === "30_DAYS") {
      list = list.filter((i) => i.days_remaining <= 30 && i.days_remaining >= 0);
    } else if (query.maturity_band === "60_DAYS") {
      list = list.filter((i) => i.days_remaining <= 60 && i.days_remaining > 30);
    } else if (query.maturity_band === "90_DAYS") {
      list = list.filter((i) => i.days_remaining <= 90 && i.days_remaining > 60);
    }

    return list;
  }

  // --- /maturities ---
  if (cleanPath === "/maturities") {
    const band = query.band || "30_DAYS";
    let list = mockStore.fdrs.filter((f) => f.days_remaining <= 90 && f.days_remaining >= 0);
    if (band === "30_DAYS") {
      list = list.filter((f) => f.days_remaining <= 30);
    }

    const items: MaturityItem[] = list.map((f) => ({
      fdr: mockStore.toListItem(f),
      band: f.days_remaining <= 30 ? "30_DAYS" : "60_DAYS",
      next_action:
        f.status.review_status === "ACCEPTED"
          ? "Request replacement deposit or renewal certificate from institution."
          : "Complete outstanding scrutiny before processing renewal.",
      reminders_sent: 1,
      predecessor_id: f.links.find((l) => l.relationship_type === "REPLACED")?.predecessor_fdr_id || null,
      successor_id: f.links.find((l) => l.relationship_type === "REPLACED")?.successor_fdr_id || null,
    }));
    return items;
  }

  // --- /ops/maturity-scan & /maturities/scan ---
  if ((cleanPath === "/ops/maturity-scan" || cleanPath === "/maturities/scan") && method === "POST") {
    mockStore.addAuditEvent(
      "MATURITY_SCAN",
      "global",
      "REMINDER_SCAN_EXECUTED",
      "SUCCESS",
      "Automated maturity scan completed. 1 maturing instrument checked. Deduplication prevents re-sending.",
    );
    return {
      status: "COMPLETED",
      instruments_scanned: mockStore.fdrs.length,
      maturing_found: 1,
      reminders_created: 0,
      created: 0,
      skipped_duplicates: 1,
      note: "Deduplication active: reminder already exists for current cycle.",
    };
  }

  // --- /exceptions ---
  if (cleanPath === "/exceptions") {
    const allFindings: Finding[] = [];
    mockStore.fdrs.forEach((f) => {
      f.findings.forEach((finding) => {
        allFindings.push({
          ...finding,
          institution_name: f.institution.name,
          fdr_number_masked: f.fdr_number_masked,
        });
      });
    });
    return allFindings.filter((f) => f.status === "OPEN");
  }

  // --- /findings/:id/disposition ---
  const findingDispMatch = cleanPath.match(/^\/findings\/([^/]+)\/disposition$/);
  if (findingDispMatch && method === "POST") {
    const findingId = findingDispMatch[1];
    const { status, reason } = (options.body || {}) as { status: string; reason: string };
    let targetFinding: Finding | null = null;
    mockStore.fdrs.forEach((f) => {
      const fd = f.findings.find((item) => item.id === findingId);
      if (fd) {
        fd.status = status;
        fd.disposition_reason = reason;
        targetFinding = fd;
      }
    });
    mockStore.save();
    return targetFinding || { id: findingId, status, disposition_reason: reason };
  }

  // --- /fdrs/:fdrId/draft (PATCH) ---
  const patchDraftMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/draft$/);
  if (patchDraftMatch && method === "PATCH") {
    const fdrId = patchDraftMatch[1];
    const body = (options.body || {}) as Partial<FdrDetail>;
    const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
    if (!fdr) throw new Error("FDR not found");
    Object.assign(fdr, body);
    fdr.updated_at = new Date().toISOString();
    mockStore.save();
    return fdr;
  }

  // --- /fdrs/:id/submit ---
  const submitMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/submit$/);
  if (submitMatch && method === "POST") {
    const fdrId = submitMatch[1];
    const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
    if (!fdr) throw new Error("FDR not found");

    fdr.status.submission_status = "SUBMITTED";
    fdr.status.review_status = "UNDER_REVIEW";
    fdr.updated_at = new Date().toISOString();

    mockStore.addAuditEvent(
      "FDR",
      fdr.id,
      "FDR_SUBMISSION",
      "SUCCESS",
      "Draft formally submitted for AICTE regulatory scrutiny.",
      "DRAFT",
      "SUBMITTED",
    );
    mockStore.save();
    return fdr;
  }

  // --- /fdrs/:id/scrutiny or /review ---
  const reviewMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/(?:scrutiny|review)$/);
  if (reviewMatch && method === "POST") {
    const fdrId = reviewMatch[1];
    const { decision, reason } = (options.body || {}) as { decision: string; reason: string };
    const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
    if (!fdr) throw new Error("FDR not found");

    const session = mockStore.getCurrentSession();
    const actor = session ? session.display_name : "Scrutiny Officer";

    fdr.status.review_status = decision;
    fdr.review_decisions.unshift({
      id: `rev-${Date.now()}`,
      decision,
      reason: reason || "Scrutiny completed against submitted documents and bank verification.",
      actor_label: actor,
      created_at: new Date().toISOString(),
    });

    if (decision === "ACCEPTED") {
      fdr.attention_level = "ROUTINE";
      fdr.findings = fdr.findings.filter((f) => f.rule_id !== "DATA-001");
    }

    fdr.updated_at = new Date().toISOString();
    mockStore.addAuditEvent(
      "FDR",
      fdr.id,
      "SCRUTINY_DECISION",
      decision,
      `Officer recorded decision: ${decision}. Reason: ${reason}`,
    );
    mockStore.save();
    return fdr;
  }

  // --- /fdrs/:id/replacements or renew ---
  const renewMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/(?:replacements|renew)$/);
  if (renewMatch && method === "POST") {
    const fdrId = renewMatch[1];
    const body = (options.body || {}) as {
      new_fdr_number?: string;
      principal_amount?: string;
      maturity_date?: string;
      issuer_bank?: string;
    };
    const oldFdr = mockStore.fdrs.find((f) => f.id === fdrId);
    if (!oldFdr) throw new Error("FDR not found");

    const rawNum = body.new_fdr_number || "FDR-RENEW-" + Math.floor(1000 + Math.random() * 9000);
    const masked = "•••••••" + rawNum.slice(-4);
    const newFdrId = `fdr-${Date.now()}`;

    const newFdr: FdrDetail = {
      ...oldFdr,
      id: newFdrId,
      fdr_number_masked: masked,
      principal_amount: body.principal_amount || oldFdr.principal_amount,
      issuer_bank: body.issuer_bank || oldFdr.issuer_bank,
      issue_date: new Date().toISOString().split("T")[0],
      maturity_date:
        body.maturity_date ||
        new Date(Date.now() + 365 * 86400000 * 3).toISOString().split("T")[0],
      days_remaining: 1095,
      version: 1,
      attention_level: "ROUTINE",
      findings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      links: [
        {
          id: `link-${Date.now()}`,
          relationship_type: "REPLACED",
          effective_date: new Date().toISOString().split("T")[0],
          reason: "Successor deposit replacing maturing instrument.",
          predecessor_fdr_id: oldFdr.id,
          successor_fdr_id: newFdrId,
          predecessor_masked: oldFdr.fdr_number_masked,
          successor_masked: masked,
        },
      ],
    };

    oldFdr.status.instrument_status = "SUPERSEDED";
    oldFdr.findings = oldFdr.findings.filter((f) => f.rule_id !== "MAT-001");
    oldFdr.attention_level = "ROUTINE";
    oldFdr.links.push({
      id: `link-old-${Date.now()}`,
      relationship_type: "REPLACED",
      effective_date: new Date().toISOString().split("T")[0],
      reason: "Instrument superseded by replacement deposit.",
      predecessor_fdr_id: oldFdr.id,
      successor_fdr_id: newFdrId,
      predecessor_masked: oldFdr.fdr_number_masked,
      successor_masked: masked,
    });

    mockStore.fdrs.unshift(newFdr);
    mockStore.addAuditEvent(
      "FDR",
      oldFdr.id,
      "INSTRUMENT_REPLACED",
      "SUCCESS",
      `Instrument replaced by new deposit ${masked}. Succession link registered.`,
    );
    mockStore.save();
    return newFdr;
  }

  // --- /fdrs/:fdrId/mock-bank-check or /verification/simulate ---
  const bankCheckMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/mock-bank-check$/);
  if (bankCheckMatch || (cleanPath === "/verification/simulate" && method === "POST")) {
    const fdrId = bankCheckMatch ? bankCheckMatch[1] : ((options.body || {}) as { fdr_id: string }).fdr_id;
    const { scenario_id, scenario } = (options.body || {}) as {
      scenario_id?: string;
      scenario?: string;
    };
    const activeScenario = scenario_id || scenario || "MATCH";

    const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
    if (!fdr) throw new Error("FDR not found");

    if (activeScenario === "INVALID_SIGNATURE") {
      mockStore.addAuditEvent(
        "BANK_VERIFICATION",
        fdr.id,
        "SECURITY_REJECTION",
        "FAILED",
        "Bank simulation payload rejected: cryptographic HMAC/RSA signature failed verification.",
      );
      const err = new Error(
        "Cryptographic signature check failed: The simulated response payload signature did not match the issuing bank public key. Portal rejected the unverified response.",
      );
      (err as unknown as { status: number; code: string }).status = 400;
      (err as unknown as { code: string }).code = "INVALID_BANK_SIGNATURE";
      throw err;
    }

    const checkId = `chk-${Date.now()}`;
    let result = "VERIFIED";
    let message = "Core Banking inquiry confirmed instrument validity and AICTE lien.";
    let lienClaim = "LIEN_MARKED_AICTE";

    if (activeScenario === "AMOUNT_MISMATCH") {
      result = "DIFFERENCE_REPORTED";
      message = "Bank CBS reported principal amount as ₹20,00,000.00 instead of declared ₹25,00,000.00.";
      fdr.status.bank_verification_status = "DIFFERENCE_REPORTED";
    } else if (activeScenario === "LIEN_NOT_MARKED") {
      result = "DIFFERENCE_REPORTED";
      message = "Bank CBS confirmed deposit exists, but lien is NOT marked to AICTE.";
      lienClaim = "LIEN_NOT_MARKED";
      fdr.status.bank_verification_status = "DIFFERENCE_REPORTED";
    } else if (activeScenario === "ACCOUNT_CLOSED") {
      result = "DIFFERENCE_REPORTED";
      message = "Bank CBS reported account has been liquidated or prematurely closed.";
      lienClaim = "LIQUIDATED";
      fdr.status.bank_verification_status = "DIFFERENCE_REPORTED";
    } else {
      result = "VERIFIED";
      message = "Bank CBS confirmed active deposit with lien marked to Member Secretary, AICTE.";
      fdr.status.bank_verification_status = "VERIFIED";
      fdr.findings = fdr.findings.filter((f) => f.rule_id !== "VERIFY-001");
    }

    const newCheck: VerificationCheck = {
      id: checkId,
      check_type: "CORE_BANKING_INQUIRY",
      source_kind: "MOCK_BANK",
      scenario_id: activeScenario,
      result,
      is_simulated: true,
      message,
      match_results: {
        principal: activeScenario === "AMOUNT_MISMATCH" ? "DIFFERS" : "MATCH",
        lien: activeScenario === "LIEN_NOT_MARKED" ? "DIFFERS" : "MATCH",
        account_status: activeScenario === "ACCOUNT_CLOSED" ? "CLOSED" : "ACTIVE",
      },
      lien_claim: lienClaim,
      response_hash: Math.random().toString(16).substring(2, 32),
      correlation_id: `sim-cbs-${Date.now()}`,
      performed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
      provenance_note: `Mock bank check (${activeScenario}) executed via simulation engine.`,
    };

    fdr.verification_checks.unshift(newCheck);
    fdr.updated_at = new Date().toISOString();
    mockStore.addAuditEvent(
      "BANK_VERIFICATION",
      fdr.id,
      "CBS_INQUIRY_SIMULATION",
      result,
      `Bank simulation check executed (${activeScenario}). Result: ${result}`,
    );
    mockStore.save();
    return newCheck;
  }

  // --- /fdrs/:fdrId/documents/:documentId/reparse ---
  const reparseMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/documents\/([^/]+)\/reparse$/);
  if (reparseMatch && method === "POST") {
    const [, fdrId, docId] = reparseMatch;
    const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
    return {
      document_id: docId,
      scan_status: "PASSED",
      scan_detail: "Clean OCR extraction completed.",
      processing_status: "COMPLETED",
      extraction_status: "COMPLETED",
      evidence_fields: fdr?.evidence_fields || [],
      document_processing_status: "COMPLETED",
    };
  }

  // --- /fdrs/:fdrId/documents/:documentId/download-ticket ---
  const downloadTicketMatch = cleanPath.match(/^\/fdrs\/([^/]+)\/documents\/([^/]+)\/download-ticket$/);
  if (downloadTicketMatch && method === "POST") {
    const [, fdrId, docId] = downloadTicketMatch;
    return {
      ticket: `tkt-${fdrId}-${docId}`,
      url: `/api/v1/documents/content?ticket=tkt-${fdrId}-${docId}`,
    };
  }

  // --- /fdrs/:id (Detail) ---
  const fdrDetailMatch = cleanPath.match(/^\/fdrs\/([^/]+)$/);
  if (fdrDetailMatch) {
    const fdrId = fdrDetailMatch[1];
    const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
    if (!fdr) throw new Error("FDR not found");
    return fdr;
  }

  // --- /upload-sessions & /uploads ---
  if ((cleanPath === "/upload-sessions" || cleanPath === "/uploads") && method === "POST") {
    const sessionRes: UploadSession = {
      upload_session_id: `upload-${Date.now()}`,
      upload_url: `/api/v1/uploads/chunk/simulated`,
      method: "PUT",
      max_size_bytes: 10485760,
      accepted_content_types: ["application/pdf", "image/png", "image/jpeg"],
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      notes: "Upload secured by in-memory sandbox and mock security scanner.",
    };
    return sessionRes;
  }

  // --- /upload-sessions/:sessionId/finalize & /uploads/:id/finalize ---
  const finalizeMatch = cleanPath.match(/^\/(?:upload-sessions|uploads)\/([^/]+)\/finalize$/);
  if (finalizeMatch && method === "POST") {
    const { fdr_id, filename } = (options.body || {}) as {
      fdr_id: string;
      filename: string;
    };
    const fdr = mockStore.fdrs.find((f) => f.id === fdr_id);

    const docId = `doc-${Date.now()}`;
    const newDoc: DocumentSummary = {
      id: docId,
      document_type: "FDR_CERTIFICATE",
      original_filename: filename || "Deposit_Certificate.pdf",
      content_type: "application/pdf",
      size_bytes: 125400,
      sha256: Math.random().toString(16).substring(2, 34),
      scan_status: "PASSED",
      scan_detail: "Clean scan. No malicious scripts or embedded binaries detected.",
      processing_status: "COMPLETED",
      version: 1,
      uploaded_at: new Date().toISOString(),
      is_viewable: true,
    };

    if (fdr) {
      fdr.documents.push(newDoc);
      fdr.status.document_processing_status = "COMPLETED";
      mockStore.addAuditEvent(
        "FDR_DOCUMENT",
        fdr.id,
        "DOCUMENT_UPLOAD_FINALIZED",
        "SUCCESS",
        `Document ${newDoc.original_filename} uploaded, scanned, and extraction completed.`,
      );
      mockStore.save();
    }

    const res: UploadFinalizeResult = {
      document_id: docId,
      scan_status: "PASSED",
      scan_detail: "Clean security scan.",
      processing_status: "COMPLETED",
      extraction_status: "COMPLETED",
      evidence_fields: fdr?.evidence_fields || [],
      document_processing_status: "COMPLETED",
    };
    return res;
  }

  // --- /notifications ---
  if (cleanPath === "/notifications") {
    return mockStore.notifications;
  }

  // --- /notifications/unread-count & /notifications/unread ---
  if (cleanPath === "/notifications/unread-count" || cleanPath === "/notifications/unread") {
    const count = mockStore.notifications.filter((n) => n.status === "UNREAD").length;
    return {
      unread: count,
      action_required: count > 0 ? 1 : 0,
      count,
    };
  }

  // --- /notifications/:id/:mode (read | ack) ---
  const notifReadMatch = cleanPath.match(/^\/notifications\/([^/]+)\/(read|ack)$/);
  if (notifReadMatch && method === "POST") {
    const notifId = notifReadMatch[1];
    const n = mockStore.notifications.find((notif) => notif.id === notifId);
    if (n) {
      n.status = "READ";
      n.read_at = new Date().toISOString();
      mockStore.save();
    }
    return n || { id: notifId, status: "READ" };
  }

  // --- /audit-events & /audit ---
  if (cleanPath === "/audit-events" || cleanPath === "/audit") {
    let list = [...mockStore.auditEvents].reverse();
    if (query.aggregate_type) {
      list = list.filter((e) => e.aggregate_type === query.aggregate_type);
    }
    return list;
  }

  // --- /audit-events/integrity & /audit/integrity ---
  if (cleanPath === "/audit-events/integrity" || cleanPath === "/audit/integrity") {
    return {
      verified: true,
      valid: true,
      events_checked: mockStore.auditEvents.length,
      verified_count: mockStore.auditEvents.length,
      first_divergence: null,
      tampered_events: [],
      head_digest:
        mockStore.auditEvents[mockStore.auditEvents.length - 1]?.integrity_digest ||
        "0000000000000000",
      algorithm: "SHA-256",
      note: "Cryptographic digest chain verified intact. Every event links to predecessor with zero discrepancies.",
      message: "Cryptographic digest chain verified intact. Every event links to predecessor with zero discrepancies.",
    };
  }

  // --- /reports/:key ---
  const reportMatch = cleanPath.match(/^\/reports\/([^/]+)$/);
  if (reportMatch) {
    const key = reportMatch[1];
    const report: ReportTable = {
      columns: [
        "Institution AICTE ID",
        "Institution Name",
        "Bank Name",
        "Principal Amount (INR)",
        "Maturity Date",
        "Review Status",
      ],
      rows: mockStore.fdrs.map((f) => [
        f.institution.aicte_id,
        f.institution.name,
        f.issuer_bank,
        `₹${parseFloat(f.principal_amount).toLocaleString("en-IN")}`,
        f.maturity_date,
        f.status.review_status,
      ]),
      report_run_id: `rep-${Date.now()}`,
      scope_label: "Statutory Security Deposit Summary Report",
      generated_at: new Date().toISOString(),
      watermark: "OFFICIAL AUDIT COPY — SIMULATED DATA",
    };
    return report;
  }

  // Fallback
  console.warn("Unmatched mock API route:", method, cleanPath);
  return [];
}
