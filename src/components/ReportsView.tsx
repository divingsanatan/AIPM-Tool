import React, { useState } from "react";
import { WbsItem, RaidItem, Stakeholder, ChangeRequest, EvmMetrics } from "../types";
import {
  FileCheck2,
  Sparkles,
  Copy,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Loader2,
  BookOpen,
} from "lucide-react";

interface ReportsViewProps {
  wbsItems: WbsItem[];
  raidItems: RaidItem[];
  stakeholders: Stakeholder[];
  changeRequests: ChangeRequest[];
  evmMetrics: EvmMetrics;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  wbsItems,
  raidItems,
  stakeholders,
  changeRequests,
  evmMetrics,
}) => {
  const [reportType, setReportType] = useState<"EXECUTIVE_STATUS" | "RISK_MITIGATION">("EXECUTIVE_STATUS");
  const [generatedReport, setGeneratedReport] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate Status Report
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      if (reportType === "EXECUTIVE_STATUS") {
        const res = await fetch("/api/gemini/generate-pmi-status-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evmData: evmMetrics,
            wbsSummary: {
              total: wbsItems.length,
              done: wbsItems.filter((i) => i.status === "Done").length,
              inProgress: wbsItems.filter((i) => i.status === "In Progress").length,
              blocked: wbsItems.filter((i) => i.status === "Blocked").length,
            },
            raidSummary: {
              activeRisks: raidItems.filter((r) => r.category === "Risk" && r.status !== "Closed").length,
              openIssues: raidItems.filter((r) => r.category === "Issue" && r.status !== "Resolved").length,
            },
            changeRequestsSummary: {
              approvedDeltaCost: changeRequests
                .filter((c) => c.status === "Approved")
                .reduce((s, c) => s + (c.costImpact || 0), 0),
              pendingReview: changeRequests.filter((c) => c.status === "Submitted").length,
            },
          }),
        });

        if (!res.ok) throw new Error("Status report generation failed");
        const data = await res.json();
        setGeneratedReport(data.reportMarkdown);
      } else {
        const res = await fetch("/api/gemini/generate-risk-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            raidData: raidItems,
            projectInfo: { name: "Enterprise Project Modernization" },
            evmData: evmMetrics,
          }),
        });

        if (!res.ok) throw new Error("Risk report generation failed");
        const data = await res.json();
        setGeneratedReport(data.reportMarkdown);
      }
    } catch (err: any) {
      alert(`Error generating report: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated PMI Reporting & Stakeholder Intelligence
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                AI Synthesis Engine
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              One-click generation of audit-ready status reports, executive variance dashboards, and risk mitigation evaluations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="generate-pmi-report-btn"
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="px-3.5 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate AI Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="mt-3 pt-3 border-t border-[#1E293B] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider font-mono">
            Template:
          </span>
          <button
            onClick={() => setReportType("EXECUTIVE_STATUS")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              reportType === "EXECUTIVE_STATUS"
                ? "bg-[#38BDF8] text-[#0F172A] font-bold shadow-xs"
                : "bg-[#141C2E] border border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            PMI Executive Status & EVM Variance Report
          </button>
          <button
            onClick={() => setReportType("RISK_MITIGATION")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              reportType === "RISK_MITIGATION"
                ? "bg-[#38BDF8] text-[#0F172A] font-bold shadow-xs"
                : "bg-[#141C2E] border border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            Comprehensive Risk Mitigation & Exposure Report
          </button>
        </div>
      </div>

      {/* Snapshot EVM Data Feeding the Report */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Cost Index (CPI)</span>
          <div
            className={`text-xl font-bold mt-0.5 ${
              evmMetrics.cpi >= 1.0 ? "text-green-400" : "text-amber-400"
            }`}
          >
            {evmMetrics.cpi.toFixed(2)}
          </div>
          <span className="text-[10px] text-[#64748B] font-sans block">
            CV: ${(evmMetrics?.cv ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Schedule Index (SPI)</span>
          <div
            className={`text-xl font-bold mt-0.5 ${
              (evmMetrics?.spi ?? 1.0) >= 1.0 ? "text-green-400" : "text-amber-400"
            }`}
          >
            {(evmMetrics?.spi ?? 1.0).toFixed(2)}
          </div>
          <span className="text-[10px] text-[#64748B] font-sans block">
            SV: ${(evmMetrics?.sv ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Forecast EAC</span>
          <div className="text-xl font-bold text-white mt-0.5">
            ${Math.round(evmMetrics?.eac ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-[#64748B] font-sans block">
            BAC: ${(evmMetrics?.bac ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Required TCPI</span>
          <div className="text-xl font-bold text-blue-400 mt-0.5">
            {evmMetrics.tcpi.toFixed(2)}
          </div>
          <span className="text-[10px] text-[#64748B] font-sans block">Effort factor to complete</span>
        </div>
      </div>

      {/* Generated Report Content */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#060911]">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-blue-400" />
            <span className="font-bold text-white text-sm">
              {reportType === "EXECUTIVE_STATUS"
                ? "Executive Status Briefing Document"
                : "Risk Mitigation Evaluation Report"}
            </span>
          </div>

          {generatedReport && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedReport);
                  alert("Report text copied to clipboard!");
                }}
                className="px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {generatedReport ? (
            <div className="font-sans text-slate-200 text-sm leading-relaxed whitespace-pre-wrap bg-[#060911] p-6 rounded-xl border border-[#1E293B]">
              {generatedReport}
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Report Generated Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Click the "Generate AI Report" button above to synthesize real-time EVM metrics, WBS progress, RAID risks, and Change Requests into a polished, audit-grade document.
              </p>
              <button
                onClick={handleGenerateReport}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate Report Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
