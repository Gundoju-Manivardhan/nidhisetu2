import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Select,
} from "../../components/ui/primitives";
import { useReport } from "../../lib/api/hooks";
import { dateTime } from "../../lib/format";

const REPORT_OPTIONS = [
  { key: "maturity_schedule", label: "Maturity Schedule & Exposure" },
  { key: "regional_distribution", label: "Regional Deposit Distribution" },
  { key: "bank_concentration", label: "Bank Concentration & Institutional Holdings" },
];

export function ReportsPage() {
  const [selectedKey, setSelectedKey] = useState("maturity_schedule");
  const { data: report, isLoading, error } = useReport(selectedKey);

  function exportCsv() {
    if (!report) return;
    const header = report.columns.join(",");
    const rows = report.rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedKey}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function triggerPrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statutory Reports & Aggregations"
        description="Official compilations of institutional security deposits, bank exposures, and maturity trajectories."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={triggerPrint}>
              <Printer className="mr-1.5 size-4" />
              Print
            </Button>
            <Button variant="primary" onClick={exportCsv} disabled={!report}>
              <Download className="mr-1.5 size-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-ink">Select Report:</label>
        <div className="w-80">
          <Select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {REPORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card title="Compiling report data" description="Querying records and aggregating balances...">
          <div className="p-8">
            <LoadingBlock label="Aggregating statutory report data" />
          </div>
        </Card>
      ) : error || !report ? (
        <ErrorState
          error={error ?? new Error("Report data not available")}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <Card
          title={report.scope_label}
          description={`Run ID: ${report.report_run_id} · Generated ${dateTime(report.generated_at)}`}
        >
          <div className="mb-4 flex items-center justify-between rounded-lg bg-subtle p-3 text-xs">
            <span className="font-semibold text-ink-muted">Security Classification:</span>
            <span className="rounded bg-brand/10 px-2 py-0.5 font-bold tracking-wider text-brand">
              {report.watermark}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-subtle text-xs font-semibold text-ink-muted">
                <tr>
                  {report.columns.map((col, idx) => (
                    <th key={idx} className="p-3 first:pl-4 last:pr-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-subtle/50">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="p-3 first:pl-4 last:pr-4 tabular text-ink">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
