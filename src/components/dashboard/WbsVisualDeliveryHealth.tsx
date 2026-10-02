import React, { useState, useMemo } from "react";
import { WbsItem, Stakeholder, Sprint, StatusConfig, ActiveTab } from "../../types";
import {
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  User,
  LayoutGrid,
  List,
  Sparkles,
  Milestone,
  Check,
  TrendingUp,
} from "lucide-react";
import { getStatusConfig } from "../../utils/statusConfig";
import { formatDurationSeconds, getTotalBlockedSeconds } from "../../utils/wbsTimerUtils";
import { getItemPriority } from "../../utils/filterUtils";

interface WbsVisualDeliveryHealthProps {
  wbsItems: WbsItem[];
  matchingWbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  sprints: Sprint[];
  statusConfigs: StatusConfig[];
  activeProjectId?: string;
  selectedSprintId?: string | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onRedirectToArea?: (tab: ActiveTab, params?: { projectId?: string; sprintId?: string | null }) => void;
  onResetFilters?: () => void;
  filtersActive?: boolean;
}

export const WbsVisualDeliveryHealth: React.FC<WbsVisualDeliveryHealthProps> = ({
  wbsItems,
  matchingWbsItems,
  stakeholders,
  sprints,
  statusConfigs,
  activeProjectId = "all",
  selectedSprintId = null,
  onNavigateTab,
  onRedirectToArea,
  onResetFilters,
  filtersActive = false,
}) => {
  const [displayMode, setDisplayMode] = useState<"cards" | "table" | "phases">("cards");
  const [wbsFilter, setWbsFilter] = useState<string>("All");
  const [showAllWbs, setShowAllWbs] = useState<boolean>(false);

  // Filtered deliverables based on internal pill filter
  const displayedItems = useMemo(() => {
    let items = matchingWbsItems;
    if (wbsFilter !== "All") {
      const isStatus = statusConfigs.some((c) => c.key === wbsFilter);
      if (isStatus) {
        items = items.filter((item) => item.status === wbsFilter);
      } else {
        items = items.filter((item) => item.type === wbsFilter);
      }
    }
    return showAllWbs ? items : items.slice(0, 8);
  }, [matchingWbsItems, wbsFilter, statusConfigs, showAllWbs]);

  // Aggregate health metrics for visual top banner
  const healthStats = useMemo(() => {
    const total = matchingWbsItems.length || 1;
    const completed = matchingWbsItems.filter((i) => i.status === "Done").length;
    const inProgress = matchingWbsItems.filter((i) => i.status === "In Progress" || i.status === "Demoable").length;
    const blocked = matchingWbsItems.filter((i) => i.status === "Blocked" || getTotalBlockedSeconds(i) > 0).length;
    const critical = matchingWbsItems.filter((i) => i.isCriticalPath).length;

    const totalPlanned = matchingWbsItems.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
    const totalActual = matchingWbsItems.reduce((sum, i) => sum + (Number(i.actualCost) || 0), 0);
    const totalEV = matchingWbsItems.reduce((sum, i) => {
      const prog = i.progressPercent !== undefined ? i.progressPercent : (i.status === "Done" ? 100 : 0);
      return sum + ((Number(i.plannedBudget) || 0) * prog) / 100;
    }, 0);

    const overallProgress = Math.round(
      matchingWbsItems.reduce((sum, i) => sum + (i.progressPercent || 0), 0) / total
    );

    return {
      total,
      completed,
      inProgress,
      blocked,
      critical,
      totalPlanned,
      totalActual,
      totalEV,
      overallProgress,
    };
  }, [matchingWbsItems]);

  // Major Phases / Milestones Rollup for "phases" view mode
  const majorPhases = useMemo(() => {
    const rootItems = wbsItems.filter((w) => w.type === "Milestone" || w.parentId === null);
    return rootItems.map((phase) => {
      // Find all children or items sharing prefix
      const related = wbsItems.filter(
        (i) => i.id === phase.id || i.parentId === phase.id || i.wbsCode.startsWith(phase.wbsCode + ".")
      );
      const taskCount = related.length;
      const completedCount = related.filter((i) => i.status === "Done").length;
      const progress = taskCount > 0
        ? Math.round(related.reduce((sum, i) => sum + (i.progressPercent || 0), 0) / taskCount)
        : (phase.progressPercent || 0);

      const planned = related.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
      const actual = related.reduce((sum, i) => sum + (Number(i.actualCost) || 0), 0);

      return {
        phase,
        taskCount,
        completedCount,
        progress,
        planned,
        actual,
      };
    });
  }, [wbsItems]);

  const getStakeholder = (id?: string) => {
    if (!id) return null;
    return stakeholders.find((st) => st.id === id) || null;
  };

  const getSprintName = (sprintId?: string) => {
    if (!sprintId) return "Backlog";
    const s = sprints.find((sp) => sp.id === sprintId);
    return s ? s.name : sprintId;
  };

  const handleDeepJump = (item: WbsItem) => {
    if (onRedirectToArea) {
      onRedirectToArea("wbs", {
        projectId: item.projectId || (activeProjectId !== "all" ? activeProjectId : undefined),
        sprintId: item.sprintId,
      });
    } else {
      onNavigateTab("wbs");
    }
  };

  const getDueDaysText = (dueDateStr?: string, status?: string) => {
    if (!dueDateStr) return "No date";
    if (status === "Done") return "Completed";
    const due = new Date(dueDateStr).getTime();
    const now = new Date("2026-03-15").getTime(); // Project reference time
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return "Due today";
    return `${diffDays}d left`;
  };

  return (
    <div className="bg-[#0B0F19] rounded-xl border border-[#1E293B] p-4 sm:p-5 flex flex-col justify-between shadow-xs space-y-4">
      {/* Header with Title & Mode Switcher */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                WBS Work Packages & Delivery Health
              </h3>
              {filtersActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {matchingWbsItems.length} of {wbsItems.length} filtered
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Visual pacing, progress meters, and real-time deliverable health.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Display Mode Switcher (Visual Cards vs Table vs Phases) */}
            <div className="flex items-center gap-1 p-1 bg-[#060911] border border-[#1E293B] rounded-lg">
              <button
                type="button"
                onClick={() => setDisplayMode("cards")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  displayMode === "cards"
                    ? "bg-sky-400 text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Visual Deliverable Health Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visual Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  displayMode === "table"
                    ? "bg-sky-400 text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Structured Table with visual indicators"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode("phases")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  displayMode === "phases"
                    ? "bg-sky-400 text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Major Phase & Milestone Rollups"
              >
                <Milestone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phases</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateTab("wbs")}
              className="text-xs bg-[#1E293B] hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-mono"
            >
              <span>Full WBS</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>
        </div>

        {/* Visual Progress Spectrum & Telemetry Strip */}
        <div className="mt-3 p-3 rounded-xl bg-[#060911] border border-[#1E293B] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Delivery Velocity:</span>
              <span className="text-white font-bold">{healthStats.overallProgress}% Complete</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-400">{healthStats.completed}/{healthStats.total} Finished</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {healthStats.completed} Done
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> {healthStats.inProgress} In Flight
              </span>
              {healthStats.blocked > 0 && (
                <span className="flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> {healthStats.blocked} Blocked
                </span>
              )}
            </div>
          </div>

          {/* Proportional Segmented Progress Bar */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${Math.round((healthStats.completed / healthStats.total) * 100)}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Completed: ${healthStats.completed} deliverables`}
            />
            <div
              style={{ width: `${Math.round((healthStats.inProgress / healthStats.total) * 100)}%` }}
              className="h-full bg-sky-500 transition-all duration-500"
              title={`In Progress: ${healthStats.inProgress} deliverables`}
            />
            {healthStats.blocked > 0 && (
              <div
                style={{ width: `${Math.max(2, Math.round((healthStats.blocked / healthStats.total) * 100))}%` }}
                className="h-full bg-rose-500 animate-pulse transition-all duration-500"
                title={`Blocked: ${healthStats.blocked} deliverables`}
              />
            )}
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
          {["All", "Milestone", "Task"].map((filter) => (
            <button
              key={filter}
              onClick={() => setWbsFilter(filter)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer font-mono whitespace-nowrap shrink-0 ${
                wbsFilter === filter
                  ? "bg-sky-400 text-slate-950 font-bold"
                  : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              {filter}
            </button>
          ))}
          <div className="h-4 w-px bg-slate-800 shrink-0 mx-0.5" />
          {statusConfigs.map((cfg) => (
            <button
              key={cfg.key}
              onClick={() => setWbsFilter(cfg.key)}
              className={`text-xs px-2 py-1 rounded-md transition-colors cursor-pointer font-mono flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                wbsFilter === cfg.key
                  ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} font-bold ring-1 ring-sky-400`
                  : "bg-[#141C2E] text-slate-400 hover:text-slate-200 border-slate-800"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} shrink-0`} />
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: VISUAL CARDS (Rich, Graphic, Insightful) */}
      {displayMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedItems.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 font-mono text-xs bg-[#060911] rounded-lg">
              <div className="flex flex-col items-center justify-center gap-2">
                <Filter className="h-5 w-5 text-slate-500" />
                <span>No work packages match the active filter criteria.</span>
                {onResetFilters && (
                  <button
                    onClick={onResetFilters}
                    className="text-xs text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    Reset filters to view all items
                  </button>
                )}
              </div>
            </div>
          ) : (
            displayedItems.map((item) => {
              const statusCfg = getStatusConfig(item.status, statusConfigs);
              const itemPriority = getItemPriority(item);
              const owner = getStakeholder(item.assignedStakeholderId);
              const blockedSec = getTotalBlockedSeconds(item);
              const progress = item.progressPercent !== undefined ? item.progressPercent : (item.status === "Done" ? 100 : 0);
              const plannedCost = Number(item.plannedBudget) || 0;
              const actualSpend = Number(item.actualCost) || 0;
              const dueDays = getDueDaysText(item.dueDate, item.status);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl bg-[#060911] border transition-all flex flex-col justify-between hover:bg-[#0D1424] ${
                    item.status === "Blocked"
                      ? "border-rose-900/60 ring-1 ring-rose-500/30"
                      : item.isCriticalPath
                      ? "border-sky-500/40 ring-1 ring-sky-500/20"
                      : "border-[#1E293B] hover:border-slate-700"
                  }`}
                >
                  <div>
                    {/* Top Row: WBS Code, Sprint, Priority, Status */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#1E293B]">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                          {item.wbsCode}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131A2A] text-sky-300 border border-sky-500/20 truncate">
                          {getSprintName(item.sprintId)}
                        </span>
                        {item.isCriticalPath && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Critical Path
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 shrink-0 ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor} shrink-0`} />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Deliverable Title & Type */}
                    <div className="mt-2.5">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                        <span className="text-[9px] text-slate-400 uppercase font-mono shrink-0">
                          {item.type}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-sans">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Visual Progress Bar with Radial percentage */}
                    <div className="mt-3 bg-[#0B0F19] p-2.5 rounded-lg border border-[#1E293B] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Progress:</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={progress >= 100 ? "text-emerald-400" : "text-sky-400"}>
                            {progress}%
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({item.actualHours}h / {item.estimatedHours}h)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${progress}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.status === "Blocked"
                              ? "bg-rose-500 animate-pulse"
                              : progress >= 100
                              ? "bg-emerald-500"
                              : "bg-sky-400"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Financial Meter & Blocked Timer alert */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>
                          ${(actualSpend / 1000).toFixed(1)}k / ${(plannedCost / 1000).toFixed(1)}k
                        </span>
                      </div>

                      {item.status === "Blocked" ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Blocked {formatDurationSeconds(blockedSec)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{dueDays}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Assignee & Action */}
                  <div className="mt-3 pt-2.5 border-t border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {owner ? owner.name[0] : "U"}
                      </div>
                      <span className="text-xs text-slate-300 font-medium truncate">
                        {owner ? owner.name : "Unassigned"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeepJump(item)}
                      className="px-2.5 py-1 rounded-lg bg-[#141C2E] hover:bg-[#1E2842] text-sky-400 hover:text-white border border-slate-700 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      title="Inspect deliverable in full WBS"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: ENHANCED TABLE (With Visual Meters, Avatars & Pacing) */}
      {displayMode === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2 min-w-[940px]">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-mono">
                <th className="pb-1 pl-3 pr-2 whitespace-nowrap min-w-[85px]">WBS ID</th>
                <th className="pb-1 px-3 min-w-[240px]">Work Package & Pacing</th>
                <th className="pb-1 px-3 whitespace-nowrap min-w-[120px]">Sprint</th>
                <th className="pb-1 px-3 whitespace-nowrap min-w-[130px]">Budget Burn</th>
                <th className="pb-1 px-3 whitespace-nowrap min-w-[145px]">Owner</th>
                <th className="pb-1 px-3 whitespace-nowrap min-w-[185px]">Status & Progress</th>
                <th className="pb-1 pl-2 pr-3 text-right whitespace-nowrap min-w-[95px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs bg-[#060911] rounded-lg">
                    No work packages match the active filter criteria.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const statusCfg = getStatusConfig(item.status, statusConfigs);
                  const itemPriority = getItemPriority(item);
                  const owner = getStakeholder(item.assignedStakeholderId);
                  const blockedSec = getTotalBlockedSeconds(item);
                  const progress = item.progressPercent !== undefined ? item.progressPercent : (item.status === "Done" ? 100 : 0);
                  const plannedCost = Number(item.plannedBudget) || 0;
                  const actualSpend = Number(item.actualCost) || 0;

                  return (
                    <tr
                      key={item.id}
                      className={`bg-[#060911] rounded-lg hover:bg-[#0E1526] transition-colors border border-slate-900 ${
                        item.status === "Blocked"
                          ? "border-l-2 border-l-rose-500"
                          : item.isCriticalPath
                          ? "border-l-2 border-l-sky-400"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 pl-3 pr-2 font-mono text-sky-400 font-bold whitespace-nowrap min-w-[85px]">
                        {item.wbsCode}
                      </td>
                      <td className="py-2.5 px-3 min-w-[240px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white">{item.title}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono">
                            {item.type}
                          </span>
                        </div>
                        {/* Visual mini progress bar under title */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="w-28 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              style={{ width: `${progress}%` }}
                              className={`h-full rounded-full ${
                                item.status === "Blocked"
                                  ? "bg-rose-500"
                                  : progress >= 100
                                  ? "bg-emerald-500"
                                  : "bg-sky-400"
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap min-w-[120px]">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#131A2A] text-sky-300 border border-sky-500/20 whitespace-nowrap">
                          {getSprintName(item.sprintId)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap min-w-[130px]">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold">
                            ${(actualSpend / 1000).toFixed(1)}k / ${(plannedCost / 1000).toFixed(1)}k
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.actualHours}h of {item.estimatedHours}h
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap min-w-[145px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {owner ? owner.name[0] : "U"}
                          </div>
                          <span className="text-slate-200 font-medium text-xs truncate max-w-[110px]">
                            {owner ? owner.name : "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap min-w-[185px]">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border inline-flex items-center gap-1.5 whitespace-nowrap ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor} shrink-0`} />
                            <span>{statusCfg.label}</span>
                          </span>

                          {item.status === "Blocked" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse whitespace-nowrap">
                              ⏱ {formatDurationSeconds(blockedSec)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-right whitespace-nowrap min-w-[95px]">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${statusCfg.dotColor} ${
                              item.status === "Blocked" ? "animate-pulse ring-2 ring-rose-500/40" : ""
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeepJump(item)}
                            className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-[#141C2E] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                            title="Inspect in WBS Tree"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 3: PHASES & MILESTONES (High-Level Rollup) */}
      {displayMode === "phases" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {majorPhases.map(({ phase, taskCount, completedCount, progress, planned, actual }) => (
            <div
              key={phase.id}
              className="p-3.5 rounded-xl bg-[#060911] border border-[#1E293B] hover:border-sky-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
                  <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                    Phase {phase.wbsCode}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {completedCount}/{taskCount} Done
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-2 leading-snug">
                  {phase.title}
                </h4>

                <div className="mt-3 bg-[#0B0F19] p-2.5 rounded-lg border border-[#1E293B] space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Stream Pacing:</span>
                    <span className="text-sky-400 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Planned: ${(planned / 1000).toFixed(1)}k</span>
                  <span className={actual <= planned ? "text-emerald-400" : "text-amber-400"}>
                    Spent: ${(actual / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1E293B] flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeepJump(phase)}
                  className="px-2.5 py-1 rounded text-xs font-mono text-sky-400 hover:text-white bg-[#141C2E] hover:bg-[#1E2842] border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Inspect Phase</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count & Show More Toggle */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1E293B] mt-1 text-xs text-slate-400 font-mono">
        <span>
          Showing {displayedItems.length} of {matchingWbsItems.length} deliverables
        </span>
        {matchingWbsItems.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllWbs(!showAllWbs)}
            className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer underline"
          >
            {showAllWbs ? "Show Top 8" : `Show All ${matchingWbsItems.length}`}
          </button>
        )}
      </div>
    </div>
  );
};
