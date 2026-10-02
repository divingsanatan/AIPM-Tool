import React from "react";
import { Sprint, Stakeholder } from "../../types";
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  BarChart2,
  Layers,
  Target,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";

export type DashboardViewMode = "overview" | "charts" | "portfolio" | "blockers" | "packages";

export type SmartPresetType =
  | "ALL"
  | "AT_RISK_BLOCKED"
  | "CRITICAL_PATH"
  | "BEHIND_SCHEDULE"
  | "BUDGET_HOTSPOTS"
  | "MILESTONES";

interface SmartFiltersBarProps {
  viewMode: DashboardViewMode;
  onSelectViewMode: (mode: DashboardViewMode) => void;
  smartPreset: SmartPresetType;
  onSelectSmartPreset: (preset: SmartPresetType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSprintId: string | null;
  onSelectSprint: (sprintId: string | null) => void;
  sprints: Sprint[];
  selectedAssigneeId: string;
  onSelectAssignee: (assigneeId: string) => void;
  stakeholders: Stakeholder[];
  totalItemCount: number;
  filteredItemCount: number;
  blockedCount: number;
  criticalPathCount: number;
  onResetAllFilters: () => void;
  isFilterActive: boolean;
}

export const SmartFiltersBar: React.FC<SmartFiltersBarProps> = ({
  viewMode,
  onSelectViewMode,
  smartPreset,
  onSelectSmartPreset,
  searchQuery,
  onSearchChange,
  selectedSprintId,
  onSelectSprint,
  sprints,
  selectedAssigneeId,
  onSelectAssignee,
  stakeholders,
  totalItemCount,
  filteredItemCount,
  blockedCount,
  criticalPathCount,
  onResetAllFilters,
  isFilterActive,
}) => {
  const presets = [
    { key: "ALL" as SmartPresetType, label: "All Deliverables", count: totalItemCount },
    {
      key: "AT_RISK_BLOCKED" as SmartPresetType,
      label: "⚠️ At Risk & Blocked",
      count: blockedCount,
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    },
    {
      key: "CRITICAL_PATH" as SmartPresetType,
      label: "⚡ Critical Path",
      count: criticalPathCount,
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    },
    { key: "BEHIND_SCHEDULE" as SmartPresetType, label: "📉 Behind Schedule" },
    { key: "BUDGET_HOTSPOTS" as SmartPresetType, label: "💸 Budget Hotspots" },
    { key: "MILESTONES" as SmartPresetType, label: "🏁 Milestones Only" },
  ];

  const viewModes = [
    { key: "overview" as DashboardViewMode, label: "Executive Pulse", icon: LayoutGrid },
    { key: "charts" as DashboardViewMode, label: "Charts & Graphs", icon: BarChart2 },
    { key: "portfolio" as DashboardViewMode, label: "Cross-Project Benchmark", icon: Target },
    { key: "blockers" as DashboardViewMode, label: "Impediments & Blockers", icon: AlertTriangle },
    { key: "packages" as DashboardViewMode, label: "Work Packages Explorer", icon: Layers },
  ];

  return (
    <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
      {/* Row 1: Fast Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {viewModes.map((vm) => {
            const Icon = vm.icon;
            const isActive = viewMode === vm.key;
            return (
              <button
                key={vm.key}
                type="button"
                onClick={() => onSelectViewMode(vm.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-sky-400 text-slate-950 shadow-xs"
                    : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{vm.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status / Matching indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
          <span>
            Showing <strong className="text-white">{filteredItemCount}</strong> of{" "}
            <strong className="text-slate-300">{totalItemCount}</strong> items
          </span>
          {isFilterActive && (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="text-[11px] text-amber-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 cursor-pointer"
              title="Reset all smart filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Search, Sprint & Assignee Filters + Smart Presets */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Search & Selectors */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
          <div className="relative w-full sm:w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search deliverables, WBS code..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#141C2E] border border-slate-700 focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sprint Filter */}
          <select
            value={selectedSprintId || ""}
            onChange={(e) => onSelectSprint(e.target.value ? e.target.value : null)}
            className="bg-[#141C2E] border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer max-w-[160px] truncate"
          >
            <option value="">All Sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssigneeId}
            onChange={(e) => onSelectAssignee(e.target.value)}
            className="bg-[#141C2E] border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer max-w-[160px] truncate"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {stakeholders.map((stk) => (
              <option key={stk.id} value={stk.id}>
                {stk.name}
              </option>
            ))}
          </select>
        </div>

        {/* Smart Presets Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
            Presets:
          </span>
          {presets.map((preset) => {
            const isSelected = smartPreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => onSelectSmartPreset(preset.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                    : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                }`}
              >
                <span>{preset.label}</span>
                {preset.count !== undefined && (
                  <span
                    className={`ml-1 text-[9px] px-1 py-0.2 rounded font-bold ${
                      isSelected ? "bg-black/30 text-white" : preset.badgeColor || "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {preset.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
