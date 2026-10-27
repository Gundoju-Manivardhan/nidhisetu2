import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  FileText,
  Lock,
  Shield,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

import { ClearanceMatrix } from "../../components/release/ClearanceMatrix";
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
} from "../../components/ui/primitives";
import {
  useDecideClearance,
  useReleaseAction,
  useReleasePolicy,
  useReleaseRequest,
} from "../../lib/api/hooks";
import { useSession } from "../../lib/auth/session";
import { dateTime, longDate, money } from "../../lib/format";

export function ReleaseCasePage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();

  const { data: rel, isLoading, error } = useReleaseRequest(requestId);
  const policy = useReleasePolicy();

  const decideClearance = useDecideClearance(requestId ?? "");
  const prepareAction = useReleaseAction(requestId ?? "", "prepare");
  const approveAction = useReleaseAction(requestId ?? "", "approve");
  const rejectAction = useReleaseAction(requestId ?? "", "reject");

  // Clearance modal
  const [activeBureau, setActiveBureau] = useState<string | null>(null);
  const [clearanceOutcome, setClearanceOutcome] = useState("CLEARED");
  const [clearanceReason, setClearanceReason] = useState("");
  const [clearanceError, setClearanceError] = useState<string | null>(null);

  // Decision modal
  const [showDecisionModal, setShowDecisionModal] = useState<"approve" | "reject" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <LoadingBlock label="Loading release dossier" />
      </div>
    );
  }

  if (error || !rel) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorState error={error ?? new Error("Release case not found")} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const isOfficial = session?.workspace === "official" || session?.workspace === "admin";
  const userBureaus = session?.bureau_codes ?? [];
  const canClearBureau = (bureauCode: string) => {
    if (!isOfficial) return false;
    if (userBureaus.includes("ALL")) return true;
    return userBureaus.includes(bureauCode);
  };

  const isPrepared = Boolean(rel.prepared_by);
  const isPreparer = rel.prepared_by === session?.email;
  const canPrepare =
    isOfficial &&
    !isPrepared &&
    rel.clearances.every((c) => c.state === "CLEARED") &&
    session?.capabilities.includes("release:prepare");

  const canApprove =
    isOfficial &&
    isPrepared &&
    !isPreparer && // Two-person rule!
    session?.capabilities.includes("release:approve") &&
    rel.status !== "APPROVED" &&
    rel.status !== "REJECTED";

  async function handleClearanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBureau) return;
    setClearanceError(null);
    try {
      await decideClearance.mutateAsync({
        bureauCode: activeBureau,
        outcome: clearanceOutcome,
        reason: clearanceReason.trim(),
      });
      setActiveBureau(null);
      setClearanceReason("");
    } catch (err: unknown) {
      const e = err as Error;
      setClearanceError(
        e.message || "Failed to record clearance decision. Verify your bureau assignment.",
      );
    }
  }

  async function handlePrepareCase() {
    if (!rel) return;
    try {
      await prepareAction.mutateAsync({
        reason: "Case dossier prepared and submitted for final competent authority sanction.",
        expectedVersion: rel.version,
      });
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Case preparation could not be recorded.");
    }
  }

  async function handleDecisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rel) return;
    setDecisionError(null);
    const action = showDecisionModal;
    if (!action) return;

    try {
      if (action === "approve") {
        await approveAction.mutateAsync({
          reason: decisionReason.trim() || "Release approved under Approval Process Handbook rules.",
          expectedVersion: rel.version,
        });
      } else {
        await rejectAction.mutateAsync({
          reason: decisionReason.trim() || "Release rejected.",
          expectedVersion: rel.version,
        });
      }
      setShowDecisionModal(null);
      setDecisionReason("");
    } catch (err: unknown) {
      const e = err as Error;
      setDecisionError(e.message || "Decision could not be registered.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={isOfficial ? "/official/releases" : "/institution/releases"}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Back to release cases
        </Link>
      </div>

      <PageHeader
        title={`Release Case ${rel.id.slice(0, 14)}`}
        description={`${rel.institution_name} · ${rel.basis_label} · Instrument ${rel.fdr_number_masked}`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge dimension="release" value={rel.status} />
            <span className="text-xs text-ink-muted">· Policy v{rel.policy_version}</span>
            <span className="text-xs text-ink-muted">· Case v{rel.version}</span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/official/fdrs/${rel.fdr_id}`}
              className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-subtle"
            >
              <FileText className="mr-1.5 size-4 text-brand" />
              View deposit instrument
            </Link>

            {canPrepare && (
              <Button
                variant="primary"
                loading={prepareAction.isPending}
                onClick={handlePrepareCase}
              >
                <UserCheck className="mr-1.5 size-4" />
                Record case preparation
              </Button>
            )}

            {canApprove && (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    setDecisionError(null);
                    setShowDecisionModal("approve");
                  }}
                >
                  <CheckCircle2 className="mr-1.5 size-4" />
                  Final approval
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDecisionError(null);
                    setShowDecisionModal("reject");
                  }}
                >
                  Reject release
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Two-person rule notice */}
      {isPrepared && isPreparer && rel.status !== "APPROVED" && (
        <Alert tone="warning" title="Two-person separation rule active">
          You prepared this release case ({rel.prepared_by}). Under regulatory governance, a different competent
          authority must perform final approval.
        </Alert>
      )}

      {/* Blocking reasons alert */}
      {rel.blocking_reasons && rel.blocking_reasons.length > 0 && rel.status !== "APPROVED" && (
        <Alert tone="neutral" title="Steps required before final release decision">
          <ul className="list-inside list-disc space-y-1 text-xs">
            {rel.blocking_reasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Clearances & Checklist (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Clearance Matrix */}
          <Card
            title="Multi-Bureau Clearance Matrix"
            description="Statutory clearances required across autonomous AICTE bureaus before any deposit release."
          >
            <ClearanceMatrix
              clearances={rel.clearances}
              canDecide={canClearBureau}
              onDecide={(bureau) => {
                setActiveBureau(bureau);
                setClearanceError(null);
                setClearanceOutcome("CLEARED");
                setClearanceReason("");
              }}
            />
          </Card>

          {/* Checklist & Required Documents */}
          <Card
            title="Required statutory documentation"
            description="Documentation mandated by the Approval Process Handbook for this release basis."
          >
            <ul className="divide-y divide-line">
              {rel.checklist.map((doc) => (
                <li key={doc.code} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    {doc.satisfied ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <AlertCircle className="size-4 text-warning" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink">{doc.label}</p>
                      <p className="text-xs text-ink-muted">Code: {doc.code}</p>
                    </div>
                  </div>
                  <Badge tone={doc.satisfied ? "success" : "warning"}>
                    {doc.satisfied ? "Verified" : "Pending"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column: Case Summary & Governance (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Case Dossier Specs */}
          <Card title="Release specifications" description="Requested terms and financial values.">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-ink-muted">Principal Sum</dt>
                <dd className="text-base font-bold text-ink tabular">{money(rel.principal_amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Basis of Release</dt>
                <dd className="text-sm font-semibold text-ink">{rel.basis_label}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Requested By</dt>
                <dd className="text-sm text-ink">{rel.requested_by_label}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Filing Date</dt>
                <dd className="text-sm text-ink">{longDate(rel.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Case Preparer</dt>
                <dd className="text-sm font-medium text-brand">
                  {rel.prepared_by ? rel.prepared_by : "Pending preparation"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Final Approver</dt>
                <dd className="text-sm font-medium text-ink">
                  {rel.approved_by ? rel.approved_by : "Pending decision"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs text-ink-muted font-medium">Justification Statement:</p>
              <p className="mt-1 text-xs text-ink italic bg-subtle p-2.5 rounded-lg">
                "{rel.justification}"
              </p>
            </div>
          </Card>

          {/* Decision Timeline */}
          <Card title="Approvals & Sanctions" description="Formal signoffs recorded for this case.">
            {rel.approvals.length === 0 ? (
              <p className="text-sm text-ink-muted">Zero sanction records committed.</p>
            ) : (
              <div className="space-y-3">
                {rel.approvals.map((appr) => (
                  <div key={appr.id} className="rounded-lg bg-subtle p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{appr.actor_label}</span>
                      <StatusBadge dimension="release" value={appr.outcome} />
                    </div>
                    <p className="mt-1 text-xs text-ink">{appr.reason}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">{dateTime(appr.decided_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog: Record Clearance */}
      <Dialog
        open={Boolean(activeBureau)}
        title={`Record Clearance for ${activeBureau ?? ""}`}
        onClose={() => setActiveBureau(null)}
      >
        <form onSubmit={handleClearanceSubmit} className="space-y-4">
          <p className="text-sm text-ink-muted">
            You are recording a statutory bureau clearance on behalf of {activeBureau}. This action will be immutably
            logged to the SHA-256 audit ledger.
          </p>

          {clearanceError && (
            <Alert tone="danger" title="Permission or validation error">
              {clearanceError}
            </Alert>
          )}

          <Field label="Clearance Outcome">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={clearanceOutcome}
                onChange={(e) => setClearanceOutcome(e.target.value)}
              >
                <option value="CLEARED">CLEARED — No objections or pending inquiries</option>
                <option value="REJECTED">REJECTED — Inquiry or grievance outstanding</option>
              </Select>
            )}
          </Field>

          <Field label="Statutory Clearance Reason & Verification Notes">
            {(fieldProps) => (
              <TextArea
                {...fieldProps}
                rows={3}
                placeholder="State basis of clearance, reference numbers, or court/grievance search findings..."
                value={clearanceReason}
                onChange={(e) => setClearanceReason(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveBureau(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={decideClearance.isPending}>
              Commit clearance
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog: Final Decision */}
      <Dialog
        open={Boolean(showDecisionModal)}
        title={showDecisionModal === "approve" ? "Final Competent Authority Sanction" : "Reject Release Case"}
        onClose={() => setShowDecisionModal(null)}
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4">
          <p className="text-sm text-ink-muted">
            {showDecisionModal === "approve"
              ? "Sanctioning this release marks the deposit instrument as RELEASED and discharges the regulatory lien."
              : "Rejecting this case returns it to the applicant institution."}
          </p>

          {decisionError && (
            <Alert tone="danger" title="Sanction error">
              {decisionError}
            </Alert>
          )}

          <Field label="Formal Sanction Order Notes">
            {(fieldProps) => (
              <TextArea
                {...fieldProps}
                rows={3}
                placeholder="Enter regulatory sanction details, executive committee resolution ref, or rejection grounds..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDecisionModal(null)}>
              Cancel
            </Button>
            <Button
              variant={showDecisionModal === "approve" ? "primary" : "danger"}
              type="submit"
              loading={approveAction.isPending || rejectAction.isPending}
            >
              Confirm {showDecisionModal === "approve" ? "approval" : "rejection"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
