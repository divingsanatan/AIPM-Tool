import React, { useState } from "react";
import { WbsItem, Stakeholder, RaciMatrixEntry, RaciRole } from "../types";
import {
  Grid3X3,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface RaciViewProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  raciEntries: RaciMatrixEntry[];
  onUpdateRaciEntry: (entry: RaciMatrixEntry) => void;
}

export const RaciView: React.FC<RaciViewProps> = ({
  wbsItems,
  stakeholders,
  raciEntries,
  onUpdateRaciEntry,
}) => {
  // Find or create assignment map
  const getAssignments = (wbsId: string) => {
    const found = raciEntries.find((e) => e.wbsItemId === wbsId);
    return found?.assignments || {};
  };

  const cycleRole = (current?: RaciRole): RaciRole | undefined => {
    if (!current) return "R";
    if (current === "R") return "A";
    if (current === "A") return "C";
    if (current === "C") return "I";
    return undefined;
  };

  const handleCellClick = (wbsId: string, stakeholderId: string) => {
    const existing = raciEntries.find((e) => e.wbsItemId === wbsId);
    const currentRole = existing?.assignments[stakeholderId];
    const nextRole = cycleRole(currentRole);

    const updatedAssignments = {
      ...(existing?.assignments || {}),
      [stakeholderId]: nextRole,
    };

    onUpdateRaciEntry({
      wbsItemId: wbsId,
      assignments: updatedAssignments,
    });
  };

  // PMI RACI Rules Validation
  // 1. Exactly 1 'A' per deliverable
  // 2. At least 1 'R' per deliverable
  let itemsWithZeroA = 0;
  let itemsWithMultipleA = 0;
  let itemsWithZeroR = 0;

  wbsItems.forEach((item) => {
    const assigns = getAssignments(item.id);
    const roles = Object.values(assigns).filter(Boolean);
    const aCount = roles.filter((r) => r === "A").length;
    const rCount = roles.filter((r) => r === "R").length;

    if (aCount === 0) itemsWithZeroA++;
    if (aCount > 1) itemsWithMultipleA++;
    if (rCount === 0) itemsWithZeroR++;
  });

  const isPmiCompliant = itemsWithZeroA === 0 && itemsWithMultipleA === 0 && itemsWithZeroR === 0;

  const getRoleStyle = (role?: RaciRole) => {
    switch (role) {
      case "A":
        return "bg-purple-600 text-white font-bold ring-2 ring-purple-400";
      case "R":
        return "bg-blue-600 text-white font-bold ring-1 ring-blue-400";
      case "C":
        return "bg-emerald-700/80 text-emerald-100 font-semibold";
      case "I":
        return "bg-slate-700 text-slate-300";
      default:
        return "text-slate-600 hover:bg-slate-800/60";
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
                Integrated RACI Responsibility Assignment Matrix
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                PMBOK Governance
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Click any cell to cycle through <strong>R</strong> (Responsible) &rarr; <strong>A</strong> (Accountable) &rarr; <strong>C</strong> (Consulted) &rarr; <strong>I</strong> (Informed).
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-purple-600/80 text-white font-bold">A: Accountable</span>
            <span className="px-2 py-0.5 rounded bg-blue-600/80 text-white font-bold">R: Responsible</span>
            <span className="px-2 py-0.5 rounded bg-emerald-700/80 text-white font-bold">C: Consulted</span>
            <span className="px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 font-bold">I: Informed</span>
          </div>
        </div>

        {/* PMI Rule Diagnostic Check */}
        <div className="mt-3 pt-3 border-t border-[#1E293B]">
          <div
            className={`p-3 rounded-lg text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
              isPmiCompliant
                ? "bg-emerald-950/30 text-emerald-300 border border-emerald-800/40"
                : "bg-amber-950/30 text-amber-300 border border-amber-800/40"
            }`}
          >
            <div className="flex items-center gap-2">
              {isPmiCompliant ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <span className="font-semibold">
                PMI Governance Audit: {isPmiCompliant ? "Fully Compliant" : "Validation Warnings Detected"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span>Missing 'A': {itemsWithZeroA}</span>
              <span>Duplicate 'A': {itemsWithMultipleA}</span>
              <span>Missing 'R': {itemsWithZeroR}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RACI Matrix Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#E2E8F0]">
            <thead className="bg-[#060911] border-b border-[#1E293B] text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 pl-5 pr-3 min-w-[240px]">WBS Work Item / Deliverable</th>
                <th className="py-3.5 px-3 min-w-[90px]">Status</th>
                {stakeholders.map((s) => (
                  <th key={s.id} className="py-3.5 px-2 text-center min-w-[110px]">
                    <span className="font-bold text-slate-200 block truncate max-w-[100px] mx-auto">
                      {s.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal font-mono block">
                      ${s.hourlyRate}/hr
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {wbsItems.map((item) => {
                const assigns = getAssignments(item.id);
                const aCount = Object.values(assigns).filter((r) => r === "A").length;
                const rCount = Object.values(assigns).filter((r) => r === "R").length;
                const hasWarning = aCount !== 1 || rCount === 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#0E1526] transition-colors ${
                      hasWarning ? "bg-amber-950/10" : ""
                    }`}
                  >
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 font-semibold">{item.wbsCode}</span>
                        <span className="font-medium text-slate-200">{item.title}</span>
                      </div>
                      {hasWarning && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5 font-mono">
                          <AlertTriangle className="h-3 w-3" />
                          {aCount === 0
                            ? "Must assign exactly 1 Accountable (A)"
                            : aCount > 1
                            ? "Multiple Accountables (A) violates single-point rule"
                            : "Must assign at least 1 Responsible (R)"}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {item.status}
                      </span>
                    </td>

                    {stakeholders.map((s) => {
                      const role = assigns[s.id];
                      return (
                        <td key={s.id} className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleCellClick(item.id, s.id)}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs transition-all cursor-pointer mx-auto ${getRoleStyle(
                              role
                            )}`}
                            title={`Click to cycle role for ${s.name}`}
                          >
                            {role || "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
