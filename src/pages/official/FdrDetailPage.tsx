import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Landmark,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { PdfViewer, type Highlight } from "../../components/document-review/PdfViewer";
import { EvidencePanel } from "../../components/fdr/EvidencePanel";
import { FindingCard } from "../../components/fdr/FindingCard";
import { StatusGrid } from "../../components/fdr/StatusGrid";
import { Dialog } from "../../components/ui/dialog";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "../../components/ui/primitives";
import {
  useCreateReplacement,
  useDisposeFinding,
  useFdr,
  useMockBankCheck,
  useScenarios,
  useScrutiny,
} from "../../lib/api/hooks";
import type { EvidenceField } from "../../lib/api/types";
import { useSession } from "../../lib/auth/session";
import { longDate, money } from "../../lib/format";

export function FdrDetailPage() {
  const { fdrId } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();

  const { data: fdr, isLoading, error } = useFdr(fdrId);
  const scenarios = useScenarios(true);
  const runBankCheck = useMockBankCheck(fdrId ?? "");
  const recordScrutiny = useScrutiny(fdrId ?? "");
  const recordReplacement = useCreateReplacement(fdrId ?? "");
  const disposeFinding = useDisposeFinding(fdrId);

  // State
  const [selectedField, setSelectedField] = useState<string | null>("principal_amount");
  const [highlight, setHighlight] = useState<Highlight | null>({
    pageIndex: 1,
    bbox: [120, 240, 280, 265],
    label: "Extracted Principal Sum: ₹20,00,000.00",
  });

  // Bank simulation modal
  const [showSimDialog, setShowSimDialog] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("MATCH");
  const [simError, setSimError] = useState<string | null>(null);

  // Scrutiny modal
  const [showScrutinyDialog, setShowScrutinyDialog] = useState(false);
  const [scrutinyDecision, setScrutinyDecision] = useState("ACCEPTED");
  const [scrutinyReason, setScrutinyReason] = useState("");

  // Renewal / replacement modal
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalNumber, setRenewalNumber] = useState("");
  const [renewalAmount, setRenewalAmount] = useState("");
  const [renewalBank, setRenewalBank] = useState("");
  const [renewalMaturity, setRenewalMaturity] = useState("");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <LoadingBlock label="Loading deposit instrument dossier" />
      </div>
    );
  }

  if (error || !fdr) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorState error={error ?? new Error("Instrument not found")} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const isOfficial = session?.workspace === "official" || session?.workspace === "admin";
  const canReview = isOfficial && session?.capabilities.includes("fdr:review");
  const canVerify = isOfficial && session?.capabilities.includes("bank:verify");
  const activeDocument = fdr.documents[0] || null;

  function handleSelectField(field: EvidenceField) {
    setSelectedField(field.field);
    if (field.page_index !== null && field.bbox) {
      setHighlight({
        pageIndex: field.page_index,
        bbox: field.bbox,
        label: `${field.field}: ${field.extracted_value ?? "Extracted text"}`,
      });
    } else {
      setHighlight(null);
    }
  }

  async function handleExecuteBankCheck() {
    setSimError(null);
    try {
      await runBankCheck.mutateAsync({ scenario_id: selectedScenario });
      setShowSimDialog(false);
    } catch (err: unknown) {
      const e = err as Error;
      setSimError(
        e.message ||
          "Simulation rejected: Cryptographic signature failed verification against issuing bank public key.",
      );
    }
  }

  async function handleSubmitScrutiny(e: React.FormEvent) {
    e.preventDefault();
    if (!scrutinyReason.trim()) return;
    await recordScrutiny.mutateAsync({
      decision: scrutinyDecision,
      reason: scrutinyReason.trim(),
    });
    setShowScrutinyDialog(false);
    setScrutinyReason("");
  }

  async function handleSubmitRenewal(e: React.FormEvent) {
    e.preventDefault();
    await recordReplacement.mutateAsync({
      new_fdr_number: renewalNumber || undefined,
      principal_amount: renewalAmount || fdr?.principal_amount,
      issuer_bank: renewalBank || fdr?.issuer_bank,
      maturity_date: renewalMaturity || undefined,
    });
    setShowRenewalDialog(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={isOfficial ? "/official/fdrs" : "/institution/fdrs"}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Back to deposits
        </Link>
      </div>

      <PageHeader
        title={`Fixed Deposit Receipt ${fdr.fdr_number_masked}`}
        description={`${fdr.institution.name} (${fdr.institution.aicte_id}) · ${fdr.issuer_bank}`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                fdr.attention_level === "CRITICAL"
                  ? "bg-danger/15 text-danger"
                  : fdr.attention_level === "HIGH"
                    ? "bg-warning/15 text-warning-dark"
                    : "bg-success/15 text-success"
              }`}
            >
              {fdr.attention_level} ATTENTION
            </span>
            <span className="text-xs text-ink-muted">· Version {fdr.version}</span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canVerify && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSimError(null);
                  setShowSimDialog(true);
                }}
              >
                <Shield className="mr-1.5 size-4 text-brand" />
                Run bank simulation
              </Button>
            )}

            {canReview && (
              <Button
                variant="primary"
                onClick={() => {
                  setScrutinyDecision(fdr.status.review_status === "ACCEPTED" ? "ACCEPTED" : "ACCEPTED");
                  setShowScrutinyDialog(true);
                }}
              >
                <FileCheck className="mr-1.5 size-4" />
                Record scrutiny
              </Button>
            )}

            {(fdr.days_remaining <= 60 || fdr.status.instrument_status === "ACTIVE") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setRenewalAmount(fdr.principal_amount);
                  setRenewalBank(fdr.issuer_bank);
                  setShowRenewalDialog(true);
                }}
              >
                <RefreshCw className="mr-1.5 size-4 text-brand" />
                Record renewal / replacement
              </Button>
            )}
          </div>
        }
      />

      {/* Status multi-dimensional grid */}
      <StatusGrid status={fdr.status} />

      {/* Main Grid: Details & Evidence */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Details & Evidence Viewer (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Summary Card */}
          <Card title="Instrument specifications" description="Key financial, maturity, and regulatory lien attributes.">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-muted">Principal Sum</dt>
                <dd className="text-lg font-bold text-ink tabular">{money(fdr.principal_amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Maturity Date</dt>
                <dd className="text-sm font-semibold text-ink">{longDate(fdr.maturity_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Days Remaining</dt>
                <dd className="text-sm font-semibold tabular">
                  <span
                    className={
                      fdr.days_remaining <= 30
                        ? "text-danger font-bold"
                        : fdr.days_remaining <= 90
                          ? "text-warning font-bold"
                          : "text-ink"
                    }
                  >
                    {fdr.days_remaining} days
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Issue Date</dt>
                <dd className="text-sm text-ink">{longDate(fdr.issue_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Lien Beneficiary</dt>
                <dd className="text-sm font-medium text-brand-dark">{fdr.lien_beneficiary ?? "AICTE New Delhi"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Interest Rate</dt>
                <dd className="text-sm text-ink">{fdr.interest_rate ?? "N/A"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Branch / IFSC</dt>
                <dd className="text-xs text-ink-muted">{fdr.branch ?? "Main Branch"} · {fdr.ifsc ?? "N/A"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Institution AICTE ID</dt>
                <dd className="text-sm font-medium text-ink">{fdr.institution.aicte_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Region</dt>
                <dd className="text-sm text-ink">{fdr.institution.region_code}</dd>
              </div>
            </dl>
          </Card>

          {/* Evidence Review: Document Preview & Extracted OCR */}
          <Card
            title="Document evidence & OCR extraction"
            description="Comparing declared submission fields against parsed text in the uploaded certificate."
          >
            {activeDocument ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-line bg-surface p-2">
                  <PdfViewer
                    fdrId={fdr.id}
                    documentId={activeDocument.id}
                    highlight={highlight}
                    isViewable={activeDocument.is_viewable}
                    scanDetail={activeDocument.scan_detail}
                  />
                </div>

                {fdr.evidence_fields.length > 0 && (
                  <EvidencePanel
                    fields={fdr.evidence_fields}
                    selectedField={selectedField}
                    onSelectField={handleSelectField}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                title="No certificate document attached"
                description="This draft has not uploaded a signed FDR certificate."
              />
            )}
          </Card>

          {/* Succession Chain Links */}
          {fdr.links.length > 0 && (
            <Card
              title="Instrument succession chain"
              description="Traceability links connecting predecessor and successor deposits."
            >
              <div className="space-y-2">
                {fdr.links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border border-line bg-subtle p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {link.predecessor_fdr_id === fdr.id ? "Replaced By Successor: " : "Replacement For: "}
                        <span className="text-brand">
                          {link.predecessor_fdr_id === fdr.id ? link.successor_masked : link.predecessor_masked}
                        </span>
                      </p>
                      <p className="text-xs text-ink-muted">{link.reason} · Effective {longDate(link.effective_date)}</p>
                    </div>
                    <Link
                      to={`/official/fdrs/${link.predecessor_fdr_id === fdr.id ? link.successor_fdr_id : link.predecessor_fdr_id}`}
                      className="text-xs font-semibold text-brand underline"
                    >
                      View linked →
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Actions, Findings & History (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Open Findings / Exceptions */}
          <Card
            title={`Integrity findings (${fdr.findings.filter((f) => f.status === "OPEN").length})`}
            description="Rule violations or discrepancy checks requiring resolution."
          >
            {fdr.findings.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-success">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Zero open exceptions. All deterministic rules satisfied.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {fdr.findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onDispose={(status, reason) =>
                      disposeFinding.mutateAsync({ id: finding.id, status, reason })
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Release Request Link */}
          {fdr.release_request_id && (
            <Card title="Active release case" description="This deposit is subject to an active clearance proceeding.">
              <div className="flex items-center justify-between rounded-lg bg-teal-soft p-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">Release Dossier {fdr.release_request_id.slice(0, 12)}</p>
                  <p className="text-xs text-ink-muted">Clearances and two-person approval tracking</p>
                </div>
                <Link
                  to={`/official/releases/${fdr.release_request_id}`}
                  className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Open release case →
                </Link>
              </div>
            </Card>
          )}

          {/* Bank Verification Checks */}
          <Card
            title={`Core Banking checks (${fdr.verification_checks.length})`}
            description="Authoritative or simulated bank inquiry history."
          >
            {fdr.verification_checks.length === 0 ? (
              <EmptyState
                title="No bank inquiry recorded"
                description="Core Banking confirmation has not been initiated for this instrument."
              />
            ) : (
              <div className="space-y-3">
                {fdr.verification_checks.map((chk) => (
                  <div key={chk.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{chk.check_type}</span>
                      <StatusBadge dimension="verification" value={chk.result} />
                    </div>
                    <p className="mt-1 text-xs text-ink">{chk.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                      <span>Scenario: {chk.scenario_id ?? "STANDARD"}</span>
                      <span>·</span>
                      <span>Ref: {chk.correlation_id ?? chk.id}</span>
                      <span>·</span>
                      <span>{longDate(chk.performed_at)}</span>
                    </div>
                    {chk.provenance_note && (
                      <p className="mt-1 text-[11px] italic text-ink-muted">{chk.provenance_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Scrutiny Decisions History */}
          <Card
            title={`Officer reviews (${fdr.review_decisions.length})`}
            description="Administrative scrutiny decisions recorded on this instrument."
          >
            {fdr.review_decisions.length === 0 ? (
              <p className="text-sm text-ink-muted">No scrutiny decision recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {fdr.review_decisions.map((rev) => (
                  <div key={rev.id} className="rounded-lg bg-subtle p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{rev.actor_label}</span>
                      <StatusBadge dimension="review" value={rev.decision} />
                    </div>
                    <p className="mt-1 text-xs text-ink">{rev.reason}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">{longDate(rev.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog: Bank Simulation */}
      <Dialog
        open={showSimDialog}
        title="Run Core Banking simulation"
        onClose={() => setShowSimDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSimDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={runBankCheck.isPending} onClick={handleExecuteBankCheck}>
              Execute simulation check
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Select a simulation fixture scenario to test the portal's discrepancy handling, lien validation, or
            cryptographic rejection policies.
          </p>

          {simError && (
            <Alert tone="danger" title="Simulation rejected by security policy">
              {simError}
            </Alert>
          )}

          <Field label="Simulation Scenario">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
              >
                {(scenarios.data?.scenarios ?? [
                  { id: "MATCH", description: "Deposit matches declared principal and AICTE lien" },
                  { id: "AMOUNT_MISMATCH", description: "CBS reports principal differs from declared ₹25L" },
                  { id: "LIEN_NOT_MARKED", description: "CBS reports deposit has no AICTE lien endorsement" },
                  { id: "ACCOUNT_CLOSED", description: "CBS reports deposit was liquidated or prematurely closed" },
                  { id: "INVALID_SIGNATURE", description: "Cryptographic signature fails verification" },
                ]).map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.id} — {sc.description}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Dialog>

      {/* Dialog: Record Scrutiny */}
      <Dialog
        open={showScrutinyDialog}
        title="Record administrative scrutiny decision"
        onClose={() => setShowScrutinyDialog(false)}
      >
        <form onSubmit={handleSubmitScrutiny} className="space-y-4">
          <Field label="Scrutiny Decision">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={scrutinyDecision}
                onChange={(e) => setScrutinyDecision(e.target.value)}
              >
                <option value="ACCEPTED">ACCEPTED — Instrument meets regulatory criteria</option>
                <option value="CLARIFICATION_REQUIRED">CLARIFICATION_REQUIRED — Institution must remedy discrepancy</option>
                <option value="REJECTED">REJECTED — Non-compliant deposit</option>
              </Select>
            )}
          </Field>

          <Field label="Decision Justification & Officer Notes">
            {(fieldProps) => (
              <TextArea
                {...fieldProps}
                rows={3}
                placeholder="Detail the rationale for acceptance, discrepancy tolerance, or clarification terms..."
                value={scrutinyReason}
                onChange={(e) => setScrutinyReason(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowScrutinyDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={recordScrutiny.isPending}>
              Commit scrutiny decision
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog: Record Renewal / Replacement */}
      <Dialog
        open={showRenewalDialog}
        title="Record deposit renewal or replacement"
        onClose={() => setShowRenewalDialog(false)}
      >
        <form onSubmit={handleSubmitRenewal} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Creates a successor instrument linked to this predecessor deposit. The current deposit will be marked
            SUPERSEDED.
          </p>

          <Field label="New FDR Reference Number">
            {(fieldProps) => (
              <TextInput
                {...fieldProps}
                placeholder="e.g. FDR-2026-9045"
                value={renewalNumber}
                onChange={(e) => setRenewalNumber(e.target.value)}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Principal Amount (INR)">
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  value={renewalAmount}
                  onChange={(e) => setRenewalAmount(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Issuer Bank">
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  value={renewalBank}
                  onChange={(e) => setRenewalBank(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <Field label="New Maturity Date">
            {(fieldProps) => (
              <TextInput
                {...fieldProps}
                type="date"
                value={renewalMaturity}
                onChange={(e) => setRenewalMaturity(e.target.value)}
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowRenewalDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={recordReplacement.isPending}>
              Create successor deposit
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
