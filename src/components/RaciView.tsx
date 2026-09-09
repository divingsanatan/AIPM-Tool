import React, { useState, useMemo } from "react";
import { WbsItem, Stakeholder, RaciMatrixEntry, RaciRole, WbsType } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  CornerDownRight,
  Clock,
  DollarSign,
  Filter,
  ArrowUpRight,
  Users,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { calculateRaciHierarchyRollups } from "../utils/raciRollup";
import { getParentId } from "../utils/wbsRollup";

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
  const [showTimeAndCost, setShowTimeAndCost] = useState<boolean>(true);
  const [filterView, setFilterView] = useState<"ALL" | "SUMMARY" | "LEAF" | "WARNINGS">("ALL");
  const [hoveredCell, setHoveredCell] = useState<{ itemId: string; stakeholderId: string } | null>(null);

  // Compute hierarchical RACI roll-ups
  const rollupResult = useMemo(() => {
    return calculateRaciHierarchyRollups(wbsItems, raciEntries, stakeholders);
  }, [wbsItems, raciEntries, stakeholders]);

  const {
    itemsMap,
    totalDirectRoles,
    totalInheritedRoles,
    itemsWithZeroA,
    itemsWithMultipleA,
    itemsWithZeroR,
    isPmiCompliant,
  } = rollupResult;

  // Cycle role on click: R -> A -> C -> I -> Clear (reverts to inherited or unassigned)
  const handleCellClick = (wbsId: string, stakeholderId: string) => {
    const rolledItem = itemsMap.get(wbsId);
    const directRole = rolledItem?.directAssignments[stakeholderId];
    const effectiveRole = rolledItem?.assignments[stakeholderId];

    let nextRole: RaciRole | undefined;

    if (!directRole && !effectiveRole) {
      nextRole = "R";
    } else if (directRole === "R" || (!directRole && effectiveRole === "R")) {
      nextRole = "A";
    } else if (directRole === "A" || (!directRole && effectiveRole === "A")) {
      nextRole = "C";
    } else if (directRole === "C" || (!directRole && effectiveRole === "C")) {
      nextRole = "I";
    } else if (directRole === "I" || (!directRole && effectiveRole === "I")) {
      // Clear direct override
      nextRole = undefined;
    } else {
      nextRole = "R";
    }

    const existingEntry = raciEntries.find((e) => e.wbsItemId === wbsId);
    const updatedAssignments = {
      ...(existingEntry?.assignments || {}),
      [stakeholderId]: nextRole,
    };

    if (!nextRole) {
      delete updatedAssignments[stakeholderId];
    }

    onUpdateRaciEntry({
      wbsItemId: wbsId,
      assignments: updatedAssignments,
    });
  };

  // Level badge styling
  const getTypeBadge = (type: WbsType) => {
    switch (type) {
      case "Milestone":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Milestone
          </span>
        );
      case "Epic":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Epic
          </span>
        );
      case "Feature":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Feature
          </span>
        );
      case "User Story":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Story
          </span>
        );
      case "Subtask":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium font-mono bg-slate-800 text-slate-400 border border-slate-700">
            Subtask
          </span>
        );
      case "Task":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium font-mono bg-slate-700/60 text-slate-300 border border-slate-600">
            Task
          </span>
        );
    }
  };

  // Indentation calculation based on dot hierarchy or parent chain
  const getItemDepth = (item: WbsItem): number => {
    let depth = 0;
    let curr: WbsItem | undefined = item;
    const visited = new Set<string>();

    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      const pId = getParentId(curr, wbsItems);
      if (pId) {
        depth++;
        curr = wbsItems.find((i) => i.id === pId);
      } else {
        break;
      }
    }
    return depth;
  };

  // Filter items based on active view
  const displayedItems = useMemo(() => {
    return wbsItems.filter((item) => {
      const rolled = itemsMap.get(item.id);
      const isParent = Boolean(item.childCount && item.childCount > 0);

      if (filterView === "SUMMARY") {
        return isParent || item.type === "Milestone" || item.type === "Epic" || item.type === "Feature";
      }
      if (filterView === "LEAF") {
        return !isParent;
      }
      if (filterView === "WARNINGS") {
        return Boolean(rolled?.hasWarning);
      }
      return true;
    });
  }, [wbsItems, filterView, itemsMap]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Integrated RACI Responsibility Assignment Matrix
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                Hierarchy Roll-up Active
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                PMBOK Governance
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              RACI assignments automatically roll up from subtasks to parent Features, Epics, and Milestones. Direct deliverables retain explicit authority. Click any cell to cycle roles or override.
            </p>
          </div>

          {/* Quick Legend */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-bold shadow-xs whitespace-nowrap">
              A: Accountable
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold shadow-xs whitespace-nowrap">
              R: Responsible
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-700 text-emerald-100 font-bold shadow-xs whitespace-nowrap">
              C: Consulted
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold shadow-xs whitespace-nowrap">
              I: Informed
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-850 text-sky-400 border border-sky-400/40 font-bold flex items-center gap-1 whitespace-nowrap">
              <ArrowUpRight className="h-2.5 w-2.5" /> Rolled Up
            </span>
          </div>
        </div>

        {/* Audit & Metrics Toolbar */}
        <div className="mt-4 pt-4 border-t border-[#1E293B] space-y-3">
          {/* Audit Banner Card */}
          <div
            className={`p-3 sm:p-3.5 rounded-lg text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
              isPmiCompliant
                ? "bg-emerald-950/30 text-emerald-300 border border-emerald-800/40"
                : "bg-amber-950/30 text-amber-300 border border-amber-800/40"
            }`}
          >
            <div className="flex items-center gap-2 shrink-0">
              {isPmiCompliant ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <span className="font-semibold whitespace-nowrap">
                PMI Audit: {isPmiCompliant ? "Fully Compliant" : "Validation Warnings Detected"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
              <span className="px-2 py-1 rounded bg-black/40 border border-white/10 text-slate-300 whitespace-nowrap">
                Direct: <strong>{totalDirectRoles}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 whitespace-nowrap">
                Rolled Up from Subtasks: <strong>{totalInheritedRoles}</strong>
              </span>
              {itemsWithZeroA > 0 && (
                <span className="px-2 py-1 rounded bg-rose-950/50 text-rose-300 border border-rose-800/50 font-bold whitespace-nowrap">
                  Missing 'A': {itemsWithZeroA}
                </span>
              )}
              {itemsWithMultipleA > 0 && (
                <span className="px-2 py-1 rounded bg-amber-950/50 text-amber-300 border border-amber-800/50 font-bold whitespace-nowrap">
                  Multiple 'A': {itemsWithMultipleA}
                </span>
              )}
              {itemsWithZeroR > 0 && (
                <span className="px-2 py-1 rounded bg-amber-950/50 text-amber-300 border border-amber-800/50 font-bold whitespace-nowrap">
                  Missing 'R': {itemsWithZeroR}
                </span>
              )}
            </div>
          </div>

          {/* Controls: Filter & Time/Cost Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowTimeAndCost((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto ${
                showTimeAndCost
                  ? "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30"
                  : "bg-[#0E1526] text-slate-400 border-[#1E293B] hover:text-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Time & Cost Values</span>
            </button>

            <div className="flex items-center bg-[#0E1526] border border-[#1E293B] rounded-lg p-0.5 text-xs overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterView("ALL")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterView === "ALL"
                    ? "bg-[#1E293B] text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({wbsItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterView("SUMMARY")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterView === "SUMMARY"
                    ? "bg-[#1E293B] text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Deliverables
              </button>
              <button
                type="button"
                onClick={() => setFilterView("LEAF")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterView === "LEAF"
                    ? "bg-[#1E293B] text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Subtasks
              </button>
              {itemsWithZeroA + itemsWithMultipleA + itemsWithZeroR > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterView("WARNINGS")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filterView === "WARNINGS"
                      ? "bg-amber-950/60 text-amber-300 font-bold border border-amber-800/40"
                      : "text-amber-400/80 hover:text-amber-300"
                  }`}
                >
                  Warnings
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RACI Matrix Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#E2E8F0] border-collapse">
            <thead className="bg-[#060911] border-b border-[#1E293B] text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 pl-5 pr-3 min-w-[300px]">WBS Deliverable Hierarchy</th>
                <th className="py-3.5 px-3 min-w-[95px]">Status</th>

                {showTimeAndCost && (
                  <>
                    <th className="py-3.5 px-3 text-right min-w-[110px]">
                      <div className="flex items-center justify-end gap-1 text-slate-300">
                        <Clock className="h-3 w-3 text-sky-400" />
                        <span>Hours (Est / Act)</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right min-w-[130px]">
                      <div className="flex items-center justify-end gap-1 text-slate-300">
                        <DollarSign className="h-3 w-3 text-emerald-400" />
                        <span>Budget (Plan / Spent)</span>
                      </div>
                    </th>
                  </>
                )}

                {stakeholders.map((s) => (
                  <th key={s.id} className="py-3.5 px-2 text-center min-w-[105px]">
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
              {displayedItems.map((item) => {
                const depth = getItemDepth(item);
                const rolled = itemsMap.get(item.id);
                const isParent = Boolean(item.childCount && item.childCount > 0);
                const assignments = rolled?.assignments || {};
                const isInheritedMap = rolled?.isInherited || {};
                const inheritedSources = rolled?.inheritedSources || {};
                const hasWarning = rolled?.hasWarning;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      hasWarning
                        ? "bg-amber-950/15 hover:bg-amber-950/25"
                        : isParent
                        ? "bg-[#0A0E1A]/80 hover:bg-[#0E1526]"
                        : "hover:bg-[#0E1526]"
                    }`}
                  >
                    {/* Deliverable Info with Indentation */}
                    <td className="py-3 pr-3" style={{ paddingLeft: `${Math.max(16, 20 + depth * 22)}px` }}>
                      <div className="flex items-center gap-2">
                        {depth > 0 && (
                          <CornerDownRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className="font-mono text-slate-400 font-semibold text-[11px] shrink-0">
                          {item.wbsCode}
                        </span>
                        {getTypeBadge(item.type)}
                        <span
                          className={`truncate max-w-[280px] sm:max-w-md ${
                            isParent ? "font-bold text-white text-[13px]" : "font-normal text-slate-200"
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </span>
                      </div>

                      {hasWarning && (
                        <div className="text-[10px] text-amber-400 flex items-center gap-1 mt-1 font-mono pl-4">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{rolled?.warningMessage}</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === "Done"
                              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                              : item.status === "In Progress"
                              ? "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                              : item.status === "Demoable"
                              ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
                              : item.status === "Blocked"
                              ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.progressPercent !== undefined && item.progressPercent > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.progressPercent}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Time & Cost Columns (Rolled Up) */}
                    {showTimeAndCost && (
                      <>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-sky-300 font-semibold">{item.estimatedHours || 0}h</span>
                            <span className="text-slate-500 text-[10px]">
                              / {item.actualHours || 0}h
                            </span>
                          </div>
                          {isParent && (
                            <span className="text-[9px] text-slate-500 font-sans block">
                              Rolled up from {item.childCount} subtasks
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-emerald-400 font-semibold">
                              ${(item.plannedBudget || 0).toLocaleString()}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              / ${(item.actualCost || 0).toLocaleString()}
                            </span>
                          </div>
                          {item.costVariance !== undefined && (
                            <span
                              className={`text-[9px] font-mono block ${
                                item.costVariance >= 0 ? "text-emerald-400/80" : "text-rose-400/80"
                              }`}
                            >
                              CV: {item.costVariance >= 0 ? "+$" : "-$"}
                              {Math.abs(item.costVariance).toLocaleString()}
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {/* RACI Matrix Cells */}
                    {stakeholders.map((s) => {
                      const role = assignments[s.id];
                      const isInherited = Boolean(isInheritedMap[s.id]);
                      const sources = inheritedSources[s.id] || [];
                      const isDirect = Boolean(rolled?.directAssignments[s.id]);

                      return (
                        <td
                          key={s.id}
                          className="py-2.5 px-2 text-center relative"
                          onMouseEnter={() => setHoveredCell({ itemId: item.id, stakeholderId: s.id })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <button
                            onClick={() => handleCellClick(item.id, s.id)}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs transition-all cursor-pointer mx-auto relative group ${
                              role === "A"
                                ? isInherited
                                  ? "bg-purple-900/60 text-purple-200 border-2 border-dashed border-purple-400 font-bold"
                                  : "bg-purple-600 text-white font-bold ring-2 ring-purple-400"
                                : role === "R"
                                ? isInherited
                                  ? "bg-blue-950/70 text-blue-200 border-2 border-dashed border-blue-400 font-bold"
                                  : "bg-blue-600 text-white font-bold ring-1 ring-blue-400"
                                : role === "C"
                                ? isInherited
                                  ? "bg-emerald-950/60 text-emerald-200 border-2 border-dashed border-emerald-500 font-semibold"
                                  : "bg-emerald-700/80 text-emerald-100 font-semibold"
                                : role === "I"
                                ? isInherited
                                  ? "bg-slate-800 text-slate-300 border-2 border-dashed border-slate-500 font-medium"
                                  : "bg-slate-700 text-slate-300"
                                : "text-slate-600 hover:bg-slate-800/60"
                            }`}
                            title={
                              isInherited
                                ? `Rolled up as ${role} for ${s.name} from subtasks: ${sources
                                    .map((src) => src.childCode)
                                    .join(", ")}. Click to set direct override.`
                                : isDirect
                                ? `Explicit direct assignment: ${role} for ${s.name}. Click to cycle or clear.`
                                : `Assign role for ${s.name}`
                            }
                          >
                            <span>{role || "—"}</span>

                            {/* Small indicator badge for inherited roll-up */}
                            {isInherited && (
                              <span
                                className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-sky-400 text-black font-bold text-[8px] flex items-center justify-center shadow-xs"
                                title="Rolled up from child subtasks"
                              >
                                ↑
                              </span>
                            )}
                          </button>

                          {/* Provenance Tooltip on Hover */}
                          {hoveredCell?.itemId === item.id &&
                            hoveredCell?.stakeholderId === s.id &&
                            isInherited &&
                            sources.length > 0 && (
                              <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#020617] border border-sky-500/40 rounded-lg shadow-xl text-left w-52 pointer-events-none">
                                <div className="flex items-center gap-1 text-[10px] text-sky-300 font-bold uppercase tracking-wider font-mono">
                                  <ArrowUpRight className="h-3 w-3" />
                                  <span>Hierarchical Roll-up</span>
                                </div>
                                <p className="text-[10px] text-slate-300 mt-1">
                                  Inherited <strong>{role}</strong> for <strong>{s.name}</strong> from{" "}
                                  {sources.length} subtask(s):
                                </p>
                                <div className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                                  {sources.slice(0, 4).map((src, idx) => (
                                    <div
                                      key={idx}
                                      className="text-[9px] font-mono text-slate-400 flex items-center justify-between"
                                    >
                                      <span>{src.childCode}</span>
                                      <span className="text-sky-300 font-bold">{src.role}</span>
                                    </div>
                                  ))}
                                  {sources.length > 4 && (
                                    <span className="text-[9px] text-slate-500">
                                      +{sources.length - 4} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
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
