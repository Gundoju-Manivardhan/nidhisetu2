// Assigned work queue: what this officer must look at, oldest first.

import { Link, useSearchParams } from "react-router-dom";

import { FdrTable } from "../../components/fdr/FdrTable";
import {
  Card,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "../../components/ui/primitives";
import { useFdrs, useSmartActionQueue } from "../../lib/api/hooks";

export function WorkQueuePage() {
  const [params, setParams] = useSearchParams();
  const onlyMine = params.get("mine") === "1";

  const queued = useFdrs({ submission_status: "SUBMITTED", review_status: "QUEUED", limit: 100 });
  const inReview = useFdrs({
    submission_status: "SUBMITTED",
    review_status: "IN_REVIEW",
    assigned_to_me: onlyMine || undefined,
    limit: 100,
  });
  const clarification = useFdrs({ review_status: "CLARIFICATION_REQUIRED", limit: 100 });

  const sections = [
    {
      key: "queued",
      title: "Ready for officer review",
      description: "Submitted and attested by the institution, not yet picked up.",
      query: queued,
    },
    {
      key: "in-review",
      title: "In review",
      description: "Cases a scrutiny officer has started.",
      query: inReview,
    },
    {
      key: "clarification",
      title: "Awaiting institution clarification",
      description: "A correction has been requested; the case waits on the institution.",
      query: clarification,
    },
  ];

  const smartQueue = useSmartActionQueue();

  return (
    <>
      <PageHeader
        title="Work queue"
        description="Scrutiny work in your assigned region, grouped by what it is waiting on."
        actions={
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.checked) next.set("mine", "1");
                else next.delete("mine");
                setParams(next, { replace: true });
              }}
              className="size-4"
            />
            Only cases assigned to me
          </label>
        }
      />

      {/* Smart Action Queue: Rules-based urgency sorting */}
      <div className="mb-6">
        <Card
          title={`Smart Action Queue — Priority Ranked (${smartQueue.data?.length ?? 0})`}
          description="Transparent, rules-based priority order generated from upcoming deadlines, discrepancy findings, and unreviewed submissions."
        >
          {smartQueue.isLoading ? (
            <LoadingBlock label="Evaluating rules and urgency priorities" />
          ) : (
            <div className="divide-y divide-line">
              {(smartQueue.data ?? []).slice(0, 6).map((item: any) => (
                <div key={item.fdr_id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          item.urgency_level === "CRITICAL"
                            ? "bg-danger/15 text-danger"
                            : item.urgency_level === "HIGH"
                              ? "bg-warning/15 text-warning-dark"
                              : "bg-brand/15 text-brand"
                        }`}
                      >
                        {item.urgency_level} · Score {item.priority_score}
                      </span>
                      <Link
                        to={`/official/fdrs/${item.fdr_id}`}
                        className="font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {item.fdr_number_masked}
                      </Link>
                      <span className="text-xs text-ink-muted">({item.issuer_bank})</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink">{item.institution_name}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      <span className="font-semibold text-ink">Primary factor:</span> {item.primary_reason}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-dark">
                      <span className="font-semibold">Suggested action:</span> {item.suggested_action}
                    </p>
                  </div>
                  <div>
                    <Link
                      to={`/official/fdrs/${item.fdr_id}`}
                      className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted"
                    >
                      Review case →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5">

        {sections.map((section) => (
          <Card
            key={section.key}
            title={`${section.title}${section.query.data ? ` (${section.query.data.length})` : ""}`}
            description={section.description}
            bodyClassName=""
          >
            {section.query.isLoading ? (
              <div className="p-5">
                <LoadingBlock label={`Loading ${section.title}`} />
              </div>
            ) : section.query.isError ? (
              <div className="p-5">
                <ErrorState error={section.query.error} onRetry={section.query.refetch} />
              </div>
            ) : (
              <FdrTable
                rows={section.query.data ?? []}
                basePath="/official/fdrs"
                caption={section.title}
              />
            )}
          </Card>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Looking for findings rather than cases?{" "}
        <Link to="/official/exceptions" className="font-semibold text-brand underline">
          Open the integrity and action-needed queue
        </Link>
        .
      </p>
    </>
  );
}
