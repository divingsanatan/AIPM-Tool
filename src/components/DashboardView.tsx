import React, { useState, useMemo, useEffect } from "react";
import {
  WbsItem,
  Stakeholder,
  RaidItem,
  ChangeRequest,
  EvmMetrics,
  ActiveTab,
  GlobalFilterState,
  StatusConfig,
  Project,
  Sprint,
} from "../types";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Milestone,
  Scale,
  Sparkles,
  ChevronRight,
  Layers,
  Filter,
  Sliders,
  CheckCircle2,
  Folder,
  Play,
  RotateCcw,
  Check,
  Pencil,
  Trash2,
  X,
  Cloud,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { generateSCurveData, calculateEvmMetrics } from "../utils/pmiCalculations";
import {
  calculatePredictiveScenarios,
  calculateCriticalPathAnalytics,
  calculateContingencyAnalytics,
  calculateLaborEfficiencyAnalytics,
} from "../utils/analyticalInsights";
import {
  doesItemMatchFilters,
  isFilterActive,
  getItemPriority,
} from "../utils/filterUtils";
import {
  DEFAULT_STATUS_CONFIGS,
  getStatusConfig,
} from "../utils/statusConfig";

interface DashboardViewProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  raidItems: RaidItem[];
  changeRequests: ChangeRequest[];
  evmMetrics: EvmMetrics;
  onNavigateTab: (tab: ActiveTab) => void;
  onGenerateReportClick: (type: "risk" | "pmi") => void;
  globalFilter?: GlobalFilterState;
  onResetFilters?: () => void;
  statusConfigs?: StatusConfig[];
  projects?: Project[];
  sprints?: Sprint[];
  activeProjectId?: string;
  selectedSprintId?: string | null;
  onSelectProject?: (id: string) => void;
  onSelectSprint?: (sprintId: string | null) => void;
  onOpenEditSprint?: (sprint: Sprint) => void;
  onDeleteSprint?: (sprint: Sprint) => void;
  onOpenEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onOpenSyncModal?: () => void;
  onTriggerInstantSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  wbsItems,
  stakeholders,
  raidItems,
  changeRequests,
  evmMetrics: initialEvmMetrics,
  onNavigateTab,
  onGenerateReportClick,
  globalFilter,
  onResetFilters,
  statusConfigs = DEFAULT_STATUS_CONFIGS,
  projects = [],
  sprints = [],
  activeProjectId = "all",
  selectedSprintId = null,
  onSelectProject,
  onSelectSprint,
  onOpenEditSprint,
  onDeleteSprint,
  onOpenEditProject,
  onDeleteProject,
  onOpenSyncModal,
  onTriggerInstantSync,
  isSyncing = false,
  lastSyncTime = null,
}) => {
  const [wbsFilter, setWbsFilter] = useState<string>("All");
  const [showAllWbs, setShowAllWbs] = useState<boolean>(false);

  const selectedProjectObj = useMemo(() => {
    if (activeProjectId === "all" || !projects.length) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const selectedSprintObj = useMemo(() => {
    if (!selectedSprintId || !sprints.length) return null;
    return sprints.find((s) => s.id === selectedSprintId) || null;
  }, [sprints, selectedSprintId]);

  // Project-level work items (ensure all sprints of activeProjectId are included)
  const effectiveScopeWbsItems = useMemo(() => {
    let items = wbsItems;
    if (activeProjectId !== "all") {
      items = items.filter((item) => {
        if (item.projectId) return item.projectId === activeProjectId;
        if (item.projectName && selectedProjectObj) return item.projectName === selectedProjectObj.name;
        if (item.sprintId && sprints.length > 0) {
          const s = sprints.find((sp) => sp.id === item.sprintId);
          if (s?.projectId) return s.projectId === activeProjectId;
        }
        return activeProjectId === "proj-flutter";
      });
    }
    return items;
  }, [wbsItems, activeProjectId, sprints, selectedProjectObj]);

  // Scoped work items: filtered to selected sprint if clicked from the left menu, or all sprints combined
  const scopedWbsItems = useMemo(() => {
    if (!selectedSprintId) {
      return effectiveScopeWbsItems;
    }
    return effectiveScopeWbsItems.filter((item) => item.sprintId === selectedSprintId);
  }, [effectiveScopeWbsItems, selectedSprintId]);

  const effectiveScopeRaidItems = useMemo(() => {
    if (activeProjectId === "all") return raidItems;
    return raidItems.filter((r) => !r.projectId || r.projectId === activeProjectId);
  }, [raidItems, activeProjectId]);

  const scopedRaidItems = useMemo(() => {
    if (!selectedSprintId) {
      return effectiveScopeRaidItems;
    }
    return effectiveScopeRaidItems.filter((r) => !r.sprintId || r.sprintId === selectedSprintId);
  }, [effectiveScopeRaidItems, selectedSprintId]);

  const effectiveBudget = useMemo(() => {
    if (selectedProjectObj) return selectedProjectObj.authorizedBudget || selectedProjectObj.baselineBudget;
    if (projects && projects.length > 0) {
      return projects.reduce((sum, p) => sum + (p.authorizedBudget || p.baselineBudget || 0), 0);
    }
    return 830000;
  }, [selectedProjectObj, projects]);

  // If a sprint is filtered from the left menu, scope budget to that sprint's planned budget
  const scopedBudget = useMemo(() => {
    if (selectedSprintId) {
      const sprintPlanned = scopedWbsItems.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
      return sprintPlanned > 0 ? sprintPlanned : effectiveBudget;
    }
    return effectiveBudget;
  }, [selectedSprintId, scopedWbsItems, effectiveBudget]);

  // Sprints belonging to the active project (or all sprints if workspace view)
  const currentProjectSprints = useMemo(() => {
    if (activeProjectId === "all") {
      return sprints;
    }
    return sprints.filter(
      (s) => s.projectId === activeProjectId || s.projectGroup === selectedProjectObj?.name
    );
  }, [sprints, activeProjectId, selectedProjectObj]);

  // Comprehensive mathematical sprint-by-sprint rollup
  const sprintRollups = useMemo(() => {
    return currentProjectSprints.map((sprint) => {
      // Find all tasks belonging to this sprint
      const sprintTasks = effectiveScopeWbsItems.filter((i) => i.sprintId === sprint.id);
      const taskCount = sprintTasks.length;
      const plannedBudget = sprintTasks.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
      const actualCost = sprintTasks.reduce((sum, i) => sum + (Number(i.actualCost) || 0), 0);
      const estimatedHours = sprintTasks.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
      const actualHours = sprintTasks.reduce((sum, i) => sum + (Number(i.actualHours) || 0), 0);

      // Earned Value (EV) for this sprint: sum of (plannedBudget * progressPercent / 100)
      const earnedValue = sprintTasks.reduce((sum, i) => {
        const prog = i.progressPercent !== undefined ? i.progressPercent : (i.status === "Done" ? 100 : 0);
        return sum + ((Number(i.plannedBudget) || 0) * prog) / 100;
      }, 0);

      const completedCount = sprintTasks.filter((i) => i.status === "Done").length;
      const inProgressCount = sprintTasks.filter((i) => i.status === "In Progress" || i.status === "Demoable").length;

      // Sprint completion %
      const avgProgress = taskCount > 0
        ? Math.round(sprintTasks.reduce((sum, i) => sum + (i.progressPercent || 0), 0) / taskCount)
        : (sprint.status === "Completed" ? 100 : 0);

      // Sprint-level CPI and CV
      const sprintCpi = actualCost > 0 ? earnedValue / actualCost : (earnedValue > 0 ? 1.0 : 1.0);
      const sprintCv = earnedValue - actualCost;

      return {
        sprint,
        taskCount,
        completedCount,
        inProgressCount,
        plannedBudget,
        actualCost,
        earnedValue,
        estimatedHours,
        actualHours,
        avgProgress,
        sprintCpi,
        sprintCv,
      };
    });
  }, [currentProjectSprints, effectiveScopeWbsItems]);

  // Grand total cumulative aggregation across all sprints
  const aggregatedAllSprints = useMemo(() => {
    const totalSprintTasks = sprintRollups.reduce((sum, s) => sum + s.taskCount, 0);
    const totalPlannedBudget = sprintRollups.reduce((sum, s) => sum + s.plannedBudget, 0);
    const totalEarnedValue = sprintRollups.reduce((sum, s) => sum + s.earnedValue, 0);
    const totalActualCost = sprintRollups.reduce((sum, s) => sum + s.actualCost, 0);
    const totalEstHours = sprintRollups.reduce((sum, s) => sum + s.estimatedHours, 0);
    const totalActHours = sprintRollups.reduce((sum, s) => sum + s.actualHours, 0);
    const totalCompleted = sprintRollups.reduce((sum, s) => sum + s.completedCount, 0);
    const totalCv = totalEarnedValue - totalActualCost;
    const overallCpi = totalActualCost > 0 ? totalEarnedValue / totalActualCost : 1.0;

    return {
      totalSprintTasks,
      totalPlannedBudget,
      totalEarnedValue,
      totalActualCost,
      totalEstHours,
      totalActHours,
      totalCompleted,
      totalCv,
      overallCpi,
    };
  }, [sprintRollups]);

  // Dynamic EVM metrics: rolls up all sprints if no sprint is selected, or calculates for the selected sprint from left menu
  const evmMetrics = useMemo(() => {
    return calculateEvmMetrics(scopedWbsItems, stakeholders, scopedBudget);
  }, [scopedWbsItems, stakeholders, scopedBudget]);

  const sCurveData = generateSCurveData(evmMetrics);

  // Analytical calculations
  const scenarios = calculatePredictiveScenarios(evmMetrics);
  const criticalAnalytics = calculateCriticalPathAnalytics(scopedWbsItems, stakeholders);
  const contingencyAnalytics = calculateContingencyAnalytics(scopedRaidItems, changeRequests);
  const laborAnalytics = calculateLaborEfficiencyAnalytics(scopedWbsItems, stakeholders, evmMetrics);

  // High risks
  const risks = scopedRaidItems.filter((r) => r.category === "Risk");
  const highRisks = risks.filter((r) => (r.riskExposure || 0) >= 15);

  const filtersActive = globalFilter ? isFilterActive(globalFilter) : false;

  // Filtered WBS preview - respect globalFilter first, then sprint filter from left menu
  const matchingWbsItems = useMemo(() => {
    let items = scopedWbsItems;
    if (globalFilter && filtersActive) {
      items = items.filter((item) => doesItemMatchFilters(item, globalFilter));
    }
    return items;
  }, [scopedWbsItems, globalFilter, filtersActive]);

  // Dynamic status & automatic progress metrics across WBS
  const statusStats = useMemo(() => {
    const totalItems = scopedWbsItems.length || 1;
    return statusConfigs.map((cfg) => {
      const items = scopedWbsItems.filter((item) => item.status === cfg.key);
      const count = items.length;
      const percentOfTotal = Math.round((count / totalItems) * 100);
      const totalEstimatedHours = items.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
      const totalPlannedBudget = items.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
      const earnedValueContribution = items.reduce((sum, i) => {
        const itemProg = i.progressPercent !== undefined ? i.progressPercent : cfg.progressPercent;
        return sum + ((Number(i.plannedBudget) || 0) * itemProg) / 100;
      }, 0);
      return {
        ...cfg,
        count,
        percentOfTotal,
        totalEstimatedHours,
        totalPlannedBudget,
        earnedValueContribution,
      };
    });
  }, [scopedWbsItems, statusConfigs]);

  const totalWbsEffortHours = useMemo(() => {
    return scopedWbsItems.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
  }, [scopedWbsItems]);

  const filteredWbsItems = useMemo(() => {
    let items = matchingWbsItems;
    if (wbsFilter !== "All") {
      const isStatus = statusConfigs.some((c) => c.key === wbsFilter);
      if (isStatus) {
        items = items.filter((item) => item.status === wbsFilter);
      } else {
        items = items.filter((item) => item.type === wbsFilter);
      }
    }
    return showAllWbs ? items : items.slice(0, 12);
  }, [matchingWbsItems, wbsFilter, statusConfigs, showAllWbs]);

  const getStakeholderName = (id?: string) => {
    if (!id) return "Unassigned";
    const s = stakeholders.find((st) => st.id === id);
    return s ? s.name : "Unassigned";
  };

  const getSprintName = (sprintId?: string) => {
    if (!sprintId) return "Backlog";
    const s = sprints.find((sp) => sp.id === sprintId);
    return s ? s.name : sprintId;
  };

  const mostLikelyEac = scenarios[0]?.eac ?? evmMetrics.eac;
  const dualFactorEac = scenarios[1]?.eac ?? evmMetrics.eac * 1.06;

  const handleScopeProjectChange = (projId: string) => {
    if (onSelectSprint) onSelectSprint(null);
    if (onSelectProject) onSelectProject(projId);
  };

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Top Project Delivery Telemetry Bar */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 sm:px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono">
                Project Delivery Telemetry & EVM Control
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/80 shrink-0">
                ANSI/PMI 99-001
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans truncate">
              Real-time earned value pacing, predictive EAC scenarios, and critical chain tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            id="dashboard-header-sync-btn"
            onClick={onTriggerInstantSync || onOpenSyncModal}
            className="text-xs font-mono font-medium text-sky-300 hover:text-white px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Synchronize projects across all devices"
          >
            <Cloud className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Devices"}</span>
          </button>
          <button
            onClick={() => onNavigateTab("wbs")}
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#141C2E] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Full WBS</span>
          </button>
          <button
            onClick={() => onGenerateReportClick("pmi")}
            className="text-xs font-mono font-semibold text-slate-950 px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>PMI Audit Report</span>
          </button>
        </div>
      </div>

      {/* Single Project Selection Dropdown & Multi-Sprint Rollup Scope */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 sm:px-4 py-3 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Project Dropdown & Scope Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider shrink-0">
              <Folder className="w-4 h-4 text-indigo-400" />
              <span>Project Scope:</span>
            </div>

            <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[260px] md:min-w-[300px]">
              <select
                id="dashboard-project-filter"
                value={activeProjectId}
                onChange={(e) => handleScopeProjectChange(e.target.value)}
                className="w-full bg-[#141C2E] border border-slate-700 hover:border-indigo-500 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs truncate"
              >
                <option value="all" className="bg-[#101625] text-white font-semibold">
                  🌐 All Projects (Enterprise Portfolio)
                </option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id} className="bg-[#101625] text-white">
                    📁 {proj.name} ({proj.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {activeProjectId !== "all" && (
                <>
                  {selectedProjectObj && onOpenEditProject && (
                    <button
                      type="button"
                      id="dashboard-edit-project-btn"
                      onClick={() => onOpenEditProject(selectedProjectObj)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={`Edit ${selectedProjectObj.name}`}
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}

                  {selectedProjectObj && onDeleteProject && (
                    <button
                      type="button"
                      id="dashboard-delete-project-btn"
                      onClick={() => onDeleteProject(selectedProjectObj)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={`Delete ${selectedProjectObj.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="dashboard-reset-scope-btn"
                    onClick={() => handleScopeProjectChange("all")}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-[#141C2E] hover:bg-[#1A253D] border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset to All Projects"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>All</span>
                  </button>
                </>
              )}

              {/* Dedicated High-Visibility Sync Devices Button */}
              <button
                type="button"
                id="dashboard-sync-devices-scope-btn"
                onClick={onTriggerInstantSync || onOpenSyncModal}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-white border border-sky-500/40 hover:border-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Synchronize projects and tasks across all devices (phone & browser)"
              >
                <Cloud className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sync Devices</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#0E1726] border border-sky-600/30 font-mono text-sky-300">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSyncing ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                    }`}
                  />
                  {isSyncing ? "Syncing..." : "Live"}
                </span>
              </button>

              {onOpenSyncModal && (
                <button
                  type="button"
                  id="dashboard-sync-details-btn"
                  onClick={onOpenSyncModal}
                  className="px-2 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 bg-[#141C2E] hover:bg-[#1A253D] border border-slate-800 transition-colors cursor-pointer"
                  title="Configure Cloud & Device Sync"
                >
                  Details
                </button>
              )}
            </div>
          </div>

          {/* Scope Context Metrics */}
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            {selectedSprintObj ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>Sprint Filter: <strong>{selectedSprintObj.name}</strong></span>
                {onSelectSprint && (
                  <button
                    type="button"
                    onClick={() => onSelectSprint(null)}
                    className="text-slate-400 hover:text-white ml-0.5 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reset to all sprints"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-slate-500">Sprints Aggregated:</span>
                <strong className="text-sky-400 font-mono font-semibold">
                  {currentProjectSprints.length} Sprints Combined
                </strong>
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">Work Packages:</span>
              <strong className="text-emerald-400 font-mono font-semibold">
                {scopedWbsItems.length} {selectedSprintObj ? "in sprint" : "Total"}
              </strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">{selectedSprintObj ? "Sprint Budget:" : "Authorized Budget:"}</span>
              <strong className="text-white font-mono font-semibold">
                ${scopedBudget.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Core High-Contrast KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CPI Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono whitespace-nowrap">
                    CPI
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans ml-1.5 whitespace-nowrap hidden min-[360px]:inline">
                    (Cost Efficiency)
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                  evmMetrics.cpi >= 1.0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {evmMetrics.costStatus}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {evmMetrics.cpi.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">Target: 1.00</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
              <span className="text-slate-400 whitespace-nowrap">Cost Variance (CV):</span>
              <span
                className={`font-bold whitespace-nowrap ${
                  evmMetrics.cv >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {evmMetrics.cv >= 0 ? "+" : ""}${evmMetrics.cv.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-sans">
            ${laborAnalytics.earnedValuePerDollar.toFixed(2)} EV delivered per $1.00 spent
          </p>
        </div>

        {/* SPI Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono whitespace-nowrap">
                    SPI
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans ml-1.5 whitespace-nowrap hidden min-[360px]:inline">
                    (Schedule Pacing)
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                  evmMetrics.spi >= 1.0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {evmMetrics.scheduleStatus}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {evmMetrics.spi.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">Target: 1.00</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
              <span className="text-slate-400 whitespace-nowrap">Schedule Variance:</span>
              <span
                className={`font-bold whitespace-nowrap ${
                  evmMetrics.sv >= 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {evmMetrics.sv >= 0 ? "+" : ""}${evmMetrics.sv.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-sans">
            Critical path projected slip: +{criticalAnalytics.projectedScheduleSlipDays} days
          </p>
        </div>

        {/* EAC Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono whitespace-nowrap">
                  EAC Forecast
                </span>
              </div>
              <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                BAC: ${(evmMetrics.bac / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                ${(evmMetrics.eac / 1000).toFixed(1)}k
              </span>
              <span
                className={`text-xs font-mono font-semibold whitespace-nowrap ${
                  evmMetrics.vac >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                VAC: {evmMetrics.vac >= 0 ? "+" : ""}${(evmMetrics.vac / 1000).toFixed(1)}k
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
              <span className="text-slate-400 whitespace-nowrap">Dual-Factor Risk:</span>
              <span className="font-bold text-amber-400 whitespace-nowrap">
                ${(dualFactorEac / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-sans">
            Most likely outcome: ${(mostLikelyEac / 1000).toFixed(1)}k (CPI continuation)
          </p>
        </div>

        {/* Contingency Runway Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono whitespace-nowrap">
                  Contingency Reserve
                </span>
              </div>
              <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800 font-semibold whitespace-nowrap">
                {contingencyAnalytics.contingencyBurnRatePercent}% Used
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 font-mono">
                ${(contingencyAnalytics.remainingContingency / 1000).toFixed(1)}k
              </span>
              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">free buffer</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
              <span className="text-slate-400 whitespace-nowrap">Total Authorized:</span>
              <span className="font-bold text-white whitespace-nowrap">
                ${(contingencyAnalytics.totalContingencyReserve / 1000).toFixed(0)}k
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-sans">
            ${contingencyAnalytics.consumedByApprovedCr.toLocaleString()} spent · ${contingencyAnalytics.pendingCrExposure.toLocaleString()} pending CCB
          </p>
        </div>
      </div>

      {/* All Sprints Roll-up & Aggregated Delivery Performance */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono whitespace-nowrap">
                All Sprints Cumulative Roll-up & Delivery Pacing
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                {currentProjectSprints.length} Sprints Added Up
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Consolidated execution across all sprints for{" "}
              <strong className="text-slate-200">
                {selectedProjectObj ? selectedProjectObj.name : "All Projects Portfolio"}
              </strong>
              . All task budgets, earned values, costs, and hours are dynamically aggregated into the project total.
            </p>
          </div>

          {selectedSprintObj && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>Filtered by: <strong>{selectedSprintObj.name}</strong></span>
                {onSelectSprint && (
                  <button
                    type="button"
                    onClick={() => onSelectSprint(null)}
                    className="text-slate-400 hover:text-white ml-1 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    title="Clear filter & view all sprints combined"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Aggregated Sprints Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Total Work Packages
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5 block">
              {aggregatedAllSprints.totalSprintTasks}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 mt-1 block truncate">
              {aggregatedAllSprints.totalCompleted} completed
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Planned Value (PV)
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-sky-400 mt-0.5 block">
              ${(aggregatedAllSprints.totalPlannedBudget / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block truncate">
              Across all sprints
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Earned Value (EV)
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
              ${(aggregatedAllSprints.totalEarnedValue / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block truncate">
              Value delivered
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Actual Cost (AC)
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-0.5 block">
              ${(aggregatedAllSprints.totalActualCost / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block truncate">
              Incurred spend
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Cost Variance (CV)
            </span>
            <span
              className={`text-lg sm:text-xl font-bold font-mono mt-0.5 block ${
                aggregatedAllSprints.totalCv >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {aggregatedAllSprints.totalCv >= 0 ? "+" : ""}${(aggregatedAllSprints.totalCv / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block truncate">
              {aggregatedAllSprints.totalCv >= 0 ? "Under budget" : "Over budget"}
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Effort Logged
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-purple-400 mt-0.5 block">
              {aggregatedAllSprints.totalActHours}h
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block truncate">
              of {aggregatedAllSprints.totalEstHours}h planned
            </span>
          </div>
        </div>

        {/* Detailed Sprint By Sprint Aggregation Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1E293B] text-[10px] font-mono text-slate-400 uppercase">
                <th className="py-2.5 px-3">Sprint Name</th>
                <th className="py-2.5 px-3">Timeline</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Work Packages</th>
                <th className="py-2.5 px-3 text-right">Planned (PV)</th>
                <th className="py-2.5 px-3 text-right">Earned (EV)</th>
                <th className="py-2.5 px-3 text-right">Actual (AC)</th>
                <th className="py-2.5 px-3 text-right">CV</th>
                <th className="py-2.5 px-3 text-right">Hours</th>
                <th className="py-2.5 px-3 text-center">CPI</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2234]">
              {sprintRollups.map((sr) => {
                const isSelected = selectedSprintId === sr.sprint.id;
                return (
                  <tr
                    key={sr.sprint.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-indigo-950/40 font-medium border-l-2 border-l-sky-400"
                        : "hover:bg-[#0E1526]"
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-emerald-500/80 text-emerald-400 flex items-center justify-center shrink-0">
                        <Play className="w-2 h-2 fill-current ml-0.5" />
                      </div>
                      <span className="truncate">{sr.sprint.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {sr.sprint.startDate.slice(5)} to {sr.sprint.endDate.slice(5)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          sr.sprint.status === "Completed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : sr.sprint.status === "Active"
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {sr.sprint.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-white font-bold">{sr.taskCount}</span>
                      <span className="text-slate-500 text-[10px] ml-1">
                        ({sr.completedCount} done)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sky-400">
                      ${sr.plannedBudget.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                      ${sr.earnedValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      ${sr.actualCost.toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-semibold ${
                        sr.sprintCv >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {sr.sprintCv >= 0 ? "+" : ""}${sr.sprintCv.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {sr.actualHours}h / {sr.estimatedHours}h
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sr.sprintCpi >= 1.0
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-amber-400 bg-amber-500/10"
                        }`}
                      >
                        {sr.sprintCpi.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectSprint && onSelectSprint(isSelected ? null : sr.sprint.id)}
                          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-sky-400 text-slate-950 font-bold"
                              : "bg-[#141C2E] hover:bg-[#1C2842] text-slate-300 hover:text-white border border-slate-700"
                          }`}
                          title={isSelected ? "Clear sprint filter" : "Filter view to this sprint"}
                        >
                          {isSelected ? "Filtered ✓" : "Inspect"}
                        </button>
                        {onOpenEditSprint && (
                          <button
                            type="button"
                            onClick={() => onOpenEditSprint(sr.sprint)}
                            className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-[#1C2842] border border-slate-750 hover:border-slate-600 transition-colors cursor-pointer"
                            title="Edit sprint name & details"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteSprint && (
                          <button
                            type="button"
                            onClick={() => onDeleteSprint(sr.sprint)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-750 hover:border-rose-900/60 transition-colors cursor-pointer"
                            title="Delete sprint"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Cumulative Total Summary Row */}
              <tr className="bg-[#111827] font-bold border-t-2 border-indigo-500/50">
                <td className="py-3 px-3 text-indigo-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>TOTAL ROLL-UP ({sprintRollups.length} Sprints)</span>
                </td>
                <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">Cumulative</td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Aggregated
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-white">
                  {aggregatedAllSprints.totalSprintTasks} Packages
                </td>
                <td className="py-3 px-3 text-right font-mono text-sky-400">
                  ${aggregatedAllSprints.totalPlannedBudget.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400">
                  ${aggregatedAllSprints.totalEarnedValue.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-400">
                  ${aggregatedAllSprints.totalActualCost.toLocaleString()}
                </td>
                <td
                  className={`py-3 px-3 text-right font-mono ${
                    aggregatedAllSprints.totalCv >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {aggregatedAllSprints.totalCv >= 0 ? "+" : ""}${aggregatedAllSprints.totalCv.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-purple-300">
                  {aggregatedAllSprints.totalActHours}h / {aggregatedAllSprints.totalEstHours}h
                </td>
                <td className="py-3 px-3 text-center font-mono text-emerald-400">
                  {aggregatedAllSprints.overallCpi.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-center">
                  {selectedSprintId && onSelectSprint && (
                    <button
                      type="button"
                      onClick={() => onSelectSprint(null)}
                      className="px-2 py-1 rounded text-[10px] font-mono bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                      title="View all sprints combined"
                    >
                      Show All Sprints
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Middle Section: S-Curve Chart & Analytical Forecast Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* EVM Cumulative S-Curve (2 Cols on XL) */}
        <div className="xl:col-span-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono whitespace-nowrap">
                    EVM S-Curve Trajectory
                  </h3>
                  <span className="text-[11px] font-normal text-slate-400 font-sans whitespace-nowrap">
                    (Planned vs Earned vs Actual Cost)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Cumulative project spend and value delivered across delivery cycles
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono shrink-0">
                <span className="flex items-center gap-1.5 text-sky-400 whitespace-nowrap">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block shrink-0" /> PV (Planned)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 whitespace-nowrap">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block shrink-0" /> EV (Earned)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 whitespace-nowrap">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block shrink-0" /> AC (Actual)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060911",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="pv"
                    name="Planned Value (PV)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pvGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ev"
                    name="Earned Value (EV)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#evGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ac"
                    name="Actual Cost (AC)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#acGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-[#1E293B] mt-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400">Current PV:</span>
              <span className="font-bold text-sky-400">${(evmMetrics.pv / 1000).toFixed(1)}k</span>
            </div>
            <div className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400">Current EV:</span>
              <span className="font-bold text-emerald-400">${(evmMetrics.ev / 1000).toFixed(1)}k</span>
            </div>
            <div className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400">Current AC:</span>
              <span className="font-bold text-amber-400">${(evmMetrics.ac / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        {/* Analytical Forecasting & Critical Path Diagnostic (1 Col) */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Predictive Forecasts
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  PMBOK 4-Model EAC variance analysis
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 shrink-0">
                Confidence 92%
              </span>
            </div>

            {/* Scenarios List */}
            <div className="mt-3 space-y-2.5">
              {scenarios.slice(0, 3).map((sc, idx) => (
                <div
                  key={sc.name}
                  className="p-2.5 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white leading-snug">
                      {sc.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-white shrink-0 whitespace-nowrap">
                      ${(sc.eac / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] mt-1 font-mono">
                    <span className="text-slate-400 truncate max-w-[150px]">{sc.formula}</span>
                    <span
                      className={`font-semibold shrink-0 whitespace-nowrap ${
                        sc.varianceAtCompletion >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      VAC: {sc.varianceAtCompletion >= 0 ? "+" : ""}${(sc.varianceAtCompletion / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Critical Path Health Section */}
            <div className="mt-4 pt-3.5 border-t border-[#1E293B]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Critical Path Pacing
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab("wbs")}
                  className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Inspect WBS</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-[#060911] border border-[#1E293B]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">
                    Chain Progress: {criticalAnalytics.criticalProgressPercent}%
                  </span>
                  <span
                    className={`font-bold ${
                      criticalAnalytics.blockedCriticalItems > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {criticalAnalytics.blockedCriticalItems > 0
                      ? `${criticalAnalytics.blockedCriticalItems} Blocker (+${criticalAnalytics.projectedScheduleSlipDays}d)`
                      : "Zero Float Chain Active"}
                  </span>
                </div>
                {criticalAnalytics.topBottlenecks[0] && (
                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-1 font-sans">
                    Bottleneck: <span className="text-slate-200">{criticalAnalytics.topBottlenecks[0].code} {criticalAnalytics.topBottlenecks[0].title}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Contingency Allocation Bar */}
            <div className="mt-3.5 pt-3.5 border-t border-[#1E293B]">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Contingency Buffer</span>
                <span className="text-emerald-400 font-bold">
                  ${(contingencyAnalytics.remainingContingency / 1000).toFixed(1)}k available
                </span>
              </div>
              <div className="w-full bg-[#060911] h-2 rounded-full overflow-hidden border border-[#1E293B]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (contingencyAnalytics.consumedByApprovedCr /
                        contingencyAnalytics.totalContingencyReserve) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>Consumed: ${contingencyAnalytics.consumedByApprovedCr.toLocaleString()}</span>
                <span>Buffer: ${contingencyAnalytics.totalContingencyReserve.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab("change-management")}
              className="w-full py-2 px-3 rounded-lg bg-[#141C2E] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Manage CCB & Change Requests</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Status & Automated Progress Telemetry */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                Workflow Status & Automated Progress Rules
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Rule Pacing: Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Task counts, linked progress percentage allocations, effort estimates ({totalWbsEffortHours} hrs total), and earned value contribution
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab("wbs")}
              className="text-xs bg-[#141C2E] hover:bg-slate-800 text-sky-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <span>Manage Status Rules</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>
        </div>

        {/* Dynamic Proportional Distribution Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
            <span className="text-slate-300">
              WBS Volume Distribution ({wbsItems.length} Total Deliverables · {totalWbsEffortHours}h Total Effort)
            </span>
            <span>{statusStats.filter((s) => s.count > 0).length} active workflow states</span>
          </div>
          <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
            {statusStats.map((stat) => {
              if (stat.count === 0) return null;
              return (
                <div
                  key={stat.key}
                  style={{ width: `${Math.max(stat.percentOfTotal, 2)}%` }}
                  className={`h-full transition-all duration-300 relative group cursor-pointer ${stat.dotColor}`}
                  title={`${stat.label}: ${stat.count} items (${stat.percentOfTotal}%) - Auto Progress: ${stat.progressPercent}%`}
                  onClick={() => setWbsFilter(stat.key)}
                />
              );
            })}
          </div>
        </div>

        {/* Status Metrics Cards Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusStats.map((stat) => {
            const isFilterSelected = wbsFilter === stat.key;
            return (
              <div
                key={stat.key}
                onClick={() => setWbsFilter(isFilterSelected ? "All" : stat.key)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isFilterSelected
                    ? "bg-sky-500/10 border-sky-500 ring-1 ring-sky-400"
                    : "bg-[#060911] border-[#1E293B] hover:border-slate-700 hover:bg-[#0d1424]"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border truncate ${stat.badgeBg} ${stat.badgeText} ${stat.badgeBorder}`}
                  >
                    {stat.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {stat.progressPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-bold font-mono text-white">{stat.count}</span>
                  <span className="text-[10px] font-mono text-slate-400">{stat.percentOfTotal}%</span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Effort:</span>
                    <span className="text-slate-200 font-semibold">{stat.totalEstimatedHours}h</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Value:</span>
                    <span className="text-emerald-400 font-semibold">${(stat.earnedValueContribution / 1000).toFixed(1)}k</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Operational Section: WBS Tracker & RAID Intelligence */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* WBS Deliverables & Delivery Health (2 Cols on XL) */}
        <div className="xl:col-span-2 bg-[#0B0F19] rounded-xl border border-[#1E293B] p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    WBS Work Packages & Delivery Health
                  </h3>
                  {filtersActive && (
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {matchingWbsItems.length} of {wbsItems.length} filtered
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Hierarchical decomposition, assigned stakeholders, and automated progress levels
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["All", "Milestone", "Task"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setWbsFilter(filter)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer font-mono ${
                      wbsFilter === filter
                        ? "bg-sky-400 text-slate-950 font-bold"
                        : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                {statusConfigs.map((cfg) => (
                  <button
                    key={cfg.key}
                    onClick={() => setWbsFilter(cfg.key)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors cursor-pointer font-mono flex items-center gap-1 border ${
                      wbsFilter === cfg.key
                        ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} font-bold ring-1 ring-sky-400`
                        : "bg-[#141C2E] text-slate-400 hover:text-slate-200 border-slate-800"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                    <span>{cfg.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => onNavigateTab("wbs")}
                  className="text-xs bg-[#1E293B] hover:bg-slate-700 text-white px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer font-mono ml-1"
                >
                  <span>Full WBS</span>
                  <ArrowUpRight className="w-3 h-3 text-sky-400" />
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-separate border-spacing-y-2 min-w-[620px]">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-mono">
                    <th className="pb-1 pl-2">WBS ID</th>
                    <th className="pb-1">Work Package</th>
                    <th className="pb-1">Sprint</th>
                    <th className="pb-1">Priority</th>
                    <th className="pb-1">Owner</th>
                    <th className="pb-1">Status</th>
                    <th className="pb-1 pr-2 text-right">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWbsItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs bg-[#060911] rounded-lg">
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
                      </td>
                    </tr>
                  ) : (
                    filteredWbsItems.map((item) => {
                      const itemPriority = getItemPriority(item);
                      return (
                        <tr
                          key={item.id}
                          className={`bg-[#060911] rounded-lg hover:bg-[#0E1526] transition-colors border border-slate-900 ${
                            item.status === "Blocked"
                              ? "border-l-2 border-l-amber-500"
                              : item.isCriticalPath
                              ? "border-l-2 border-l-sky-400"
                              : ""
                          }`}
                        >
                          <td className="py-2.5 pl-3 font-mono text-sky-400 font-semibold">
                            {item.wbsCode}
                          </td>
                          <td className="py-2.5 font-medium text-white">
                            {item.title}
                            <span className="ml-2 text-[10px] font-normal text-slate-400 uppercase font-mono">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#131A2A] text-sky-300 border border-sky-500/20 whitespace-nowrap">
                              {getSprintName(item.sprintId)}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                itemPriority === "Critical"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                  : itemPriority === "High"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : itemPriority === "Medium"
                                  ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                  : "bg-slate-700/40 text-slate-300 border-slate-600/40"
                              }`}
                            >
                              {itemPriority}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-300">
                            {getStakeholderName(item.assignedStakeholderId)}
                          </td>
                          <td className="py-2.5">
                            {(() => {
                              const statusCfg = getStatusConfig(item.status, statusConfigs);
                              return (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border inline-flex items-center gap-1.5 ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                                  <span>{statusCfg.label}</span>
                                  <span className="opacity-80">({statusCfg.progressPercent}%)</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            {(() => {
                              const statusCfg = getStatusConfig(item.status, statusConfigs);
                              return (
                                <span
                                  className={`inline-block w-2.5 h-2.5 rounded-full ${statusCfg.dotColor} ${
                                    item.status === "Blocked" ? "animate-pulse ring-2 ring-rose-500/40" : ""
                                  }`}
                                  title={`Status: ${statusCfg.label} (${statusCfg.progressPercent}% auto progress)`}
                                />
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Work Package count & show more toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1E293B] mt-3 text-xs text-slate-400 font-mono">
              <span>
                Showing {filteredWbsItems.length} of {matchingWbsItems.length} work packages
                {selectedSprintObj && ` in ${selectedSprintObj.name}`}
              </span>
              {matchingWbsItems.length > 12 && (
                <button
                  type="button"
                  onClick={() => setShowAllWbs(!showAllWbs)}
                  className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer underline"
                >
                  {showAllWbs ? "Show Fewer (Top 12)" : `Show All ${matchingWbsItems.length} Packages`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RAID Intelligence & Advisory (1 Col) */}
        <div className="bg-[#0B0F19] rounded-xl border border-[#1E293B] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[#1E293B]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>RAID Intelligence</span>
              </h3>
              <span className="text-xs text-amber-400 font-mono font-semibold">
                {highRisks.length} High Exposure
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {raidItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className={`p-3 bg-[#060911] border-l-2 rounded-lg text-xs border-slate-800 ${
                    item.category === "Risk"
                      ? "border-l-red-500"
                      : item.category === "Issue"
                      ? "border-l-rose-500"
                      : item.category === "Dependency"
                      ? "border-l-amber-500"
                      : "border-l-blue-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white line-clamp-1">
                      {item.title}
                    </p>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono font-bold ${
                        item.category === "Risk"
                          ? "bg-red-950/60 text-red-300 border border-red-800"
                          : item.category === "Issue"
                          ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                          : "bg-amber-950/60 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-1 font-sans">
                    {item.mitigationStrategy || item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* PM Advisory Note */}
            <div className="mt-4 p-3 rounded-lg bg-[#060911] border border-[#1E293B]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                  Governance Advisory
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {evmMetrics.cpi >= 1.0
                  ? `Cost efficiency is favorable (CPI ${evmMetrics.cpi.toFixed(2)}). Focus mitigation on the critical chain to recover ${criticalAnalytics.projectedScheduleSlipDays} days of schedule variance.`
                  : `Cost performance is lagging (CPI ${evmMetrics.cpi.toFixed(2)}). Recommend activating contingency reserves for pending scope packages.`}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between mt-4">
            <button
              onClick={() => onNavigateTab("raid")}
              className="text-xs bg-[#141C2E] border border-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 font-mono transition-colors cursor-pointer"
            >
              5×5 Risk Heatmap
            </button>
            <button
              onClick={() => onGenerateReportClick("risk")}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>AI Risk Plan</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
