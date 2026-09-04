import React from "react";
import {
  Filter,
  X,
  RotateCcw,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  Layers,
  BarChart3,
} from "lucide-react";
import { GlobalFilterState, Stakeholder, PriorityLevel, WorkItemStatus, ActiveTab } from "../types";

interface GlobalFilterBarProps {
  filterState: GlobalFilterState;
  onFilterChange: (updates: Partial<GlobalFilterState>) => void;
  onResetFilters: () => void;
  stakeholders: Stakeholder[];
  totalItemCount: number;
  filteredItemCount: number;
  activeTab: ActiveTab;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  stakeholders,
  totalItemCount,
  filteredItemCount,
  activeTab,
  onNavigateTab,
}) => {
  const hasActiveFilters =
    filterState.status !== "ALL" ||
    filterState.assigneeId !== "ALL" ||
    filterState.priority !== "ALL" ||
    Boolean(filterState.searchQuery && filterState.searchQuery.trim());

  const activeFilterCount = [
    filterState.status !== "ALL",
    filterState.assigneeId !== "ALL",
    filterState.priority !== "ALL",
    Boolean(filterState.searchQuery && filterState.searchQuery.trim()),
  ].filter(Boolean).length;

  const statuses: { label: string; value: string }[] = [
    { label: "All Statuses", value: "ALL" },
    { label: "To Do", value: "To Do" },
    { label: "In Progress", value: "In Progress" },
    { label: "Demoable", value: "Demoable" },
    { label: "Blocked", value: "Blocked" },
    { label: "Done", value: "Done" },
  ];

  const priorities: { label: string; value: string; color: string }[] = [
    { label: "All Priorities", value: "ALL", color: "text-slate-300" },
    { label: "Critical", value: "Critical", color: "text-rose-400" },
    { label: "High", value: "High", color: "text-amber-400" },
    { label: "Medium", value: "Medium", color: "text-sky-400" },
    { label: "Low", value: "Low", color: "text-slate-400" },
  ];

  const getAssigneeName = (id: string) => {
    if (id === "ALL") return "All Assignees";
    if (id === "UNASSIGNED") return "Unassigned";
    const found = stakeholders.find((s) => s.id === id);
    return found ? found.name : "Unknown Assignee";
  };

  return (
    <div
      id="persistent-global-filter-bar"
      className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Persistent Global Filter
              </span>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#060911] text-[#38BDF8] border border-[#1E293B]">
                Dashboard & WBS Synchronized
              </span>
              {hasActiveFilters && (
                <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  {activeFilterCount} Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Filter deliverables across the executive telemetry and granular WBS breakdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {hasActiveFilters && (
            <button
              id="clear-global-filters-btn"
              onClick={onResetFilters}
              className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#141C2E] hover:bg-slate-800 text-rose-300 hover:text-rose-200 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset all filters to show all items"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Quick tab switcher link */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab(activeTab === "dashboard" ? "wbs" : "dashboard")}
              className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {activeTab === "dashboard" ? (
                <>
                  <Layers className="h-3 w-3 text-sky-400" />
                  <span>Inspect in WBS Planner</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : (
                <>
                  <BarChart3 className="h-3 w-3 text-sky-400" />
                  <span>View in Dashboard</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            id="global-filter-status"
            value={filterState.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className={`w-full bg-[#060911] border rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-hidden focus:border-sky-400 transition-colors ${
              filterState.status !== "ALL"
                ? "border-sky-400 text-white font-semibold"
                : "border-[#1E293B] text-slate-300"
            }`}
          >
            {statuses.map((st) => (
              <option key={st.value} value={st.value} className="bg-[#0B0F19] text-white">
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Assignee / Stakeholder
          </label>
          <select
            id="global-filter-assignee"
            value={filterState.assigneeId}
            onChange={(e) => onFilterChange({ assigneeId: e.target.value })}
            className={`w-full bg-[#060911] border rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-hidden focus:border-sky-400 transition-colors ${
              filterState.assigneeId !== "ALL"
                ? "border-sky-400 text-white font-semibold"
                : "border-[#1E293B] text-slate-300"
            }`}
          >
            <option value="ALL" className="bg-[#0B0F19] text-white">
              All Assignees
            </option>
            <option value="UNASSIGNED" className="bg-[#0B0F19] text-slate-400 italic">
              -- Unassigned --
            </option>
            {stakeholders.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0B0F19] text-white">
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>

        {/* Priority Level Filter */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Priority Level
          </label>
          <select
            id="global-filter-priority"
            value={filterState.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value })}
            className={`w-full bg-[#060911] border rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-hidden focus:border-sky-400 transition-colors ${
              filterState.priority !== "ALL"
                ? "border-sky-400 text-white font-semibold"
                : "border-[#1E293B] text-slate-300"
            }`}
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#0B0F19] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Search */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Search WBS / Deliverables
          </label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
            <input
              id="global-filter-search"
              type="text"
              value={filterState.searchQuery || ""}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              placeholder="Filter by code or title..."
              className="w-full bg-[#060911] border border-[#1E293B] hover:border-slate-700 focus:border-sky-400 focus:outline-hidden rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 font-mono transition-colors"
            />
            {filterState.searchQuery && (
              <button
                onClick={() => onFilterChange({ searchQuery: "" })}
                className="absolute right-2 top-2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Chips & Match Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E293B] text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400">Match count:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded ${
              filteredItemCount === 0
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : hasActiveFilters
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-[#060911] text-slate-300 border border-[#1E293B]"
            }`}
          >
            {filteredItemCount} of {totalItemCount} items
          </span>

          {/* Active Chips */}
          {filterState.status !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141C2E] border border-sky-500/30 text-sky-300">
              Status: <span className="font-semibold text-white">{filterState.status}</span>
              <button
                onClick={() => onFilterChange({ status: "ALL" })}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filterState.assigneeId !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141C2E] border border-sky-500/30 text-sky-300">
              Assignee:{" "}
              <span className="font-semibold text-white">
                {getAssigneeName(filterState.assigneeId)}
              </span>
              <button
                onClick={() => onFilterChange({ assigneeId: "ALL" })}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filterState.priority !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141C2E] border border-sky-500/30 text-sky-300">
              Priority: <span className="font-semibold text-white">{filterState.priority}</span>
              <button
                onClick={() => onFilterChange({ priority: "ALL" })}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filterState.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141C2E] border border-sky-500/30 text-sky-300">
              Search: <span className="font-semibold text-white">"{filterState.searchQuery}"</span>
              <button
                onClick={() => onFilterChange({ searchQuery: "" })}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <span className="text-[10px] text-slate-400 italic">
            Filters persist across Dashboard & WBS tabs
          </span>
        )}
      </div>
    </div>
  );
};
