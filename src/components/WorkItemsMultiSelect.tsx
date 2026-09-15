import React, { useState, useMemo } from "react";
import { WbsItem, Project } from "../types";
import { Search, X, Check, CheckSquare, Square } from "lucide-react";

interface WorkItemsMultiSelectProps {
  workItems: WbsItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  projects?: Project[];
  currentProjectId?: string;
  currentSprintId?: string;
}

export const WorkItemsMultiSelect: React.FC<WorkItemsMultiSelectProps> = ({
  workItems,
  selectedIds,
  onChange,
  projects = [],
  currentProjectId,
  currentSprintId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(selectedIds.filter((x) => x !== id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Map of project id to name/code
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filtered available items
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return workItems.filter((item) => {
      if (projectFilter !== "all" && item.projectId && item.projectId !== projectFilter) {
        return false;
      }
      if (!q) return true;
      const codeMatch = item.wbsCode.toLowerCase().includes(q);
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q) ?? false;
      return codeMatch || titleMatch || descMatch;
    });
  }, [workItems, searchTerm, projectFilter]);

  // Quick select all currently filtered items
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredItems.map((i) => i.id);
    const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
    onChange(combined);
  };

  // Quick select all items in current sprint
  const handleSelectSprintItems = () => {
    if (!currentSprintId) return;
    const sprintItems = workItems.filter((i) => i.sprintId === currentSprintId).map((i) => i.id);
    const combined = Array.from(new Set([...selectedIds, ...sprintItems]));
    onChange(combined);
  };

  const selectedItemsData = useMemo(() => {
    return selectedIds
      .map((id) => workItems.find((w) => w.id === id) || { id, wbsCode: "ID", title: id, status: "Unknown" })
      .filter(Boolean);
  }, [selectedIds, workItems]);

  return (
    <div className="space-y-2.5">
      {/* Selected Items Chips Bar */}
      <div className="rounded-lg border border-[#1E293B] bg-[#060911] p-2.5">
        <div className="flex items-center justify-between mb-1.5 text-[11px]">
          <span className="font-semibold text-slate-300 font-mono">
            Linked Work Items ({selectedIds.length})
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-rose-400 hover:text-rose-300 text-[10px] font-mono hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedIds.length === 0 ? (
          <div className="py-2 px-1 text-slate-500 text-[11px] italic">
            No work items linked. You can link this item to any or multiple tasks, epics, or milestones below.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {selectedItemsData.map((item: any) => {
              const proj = item.projectId ? projectMap.get(item.projectId) : null;
              return (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/60 text-sky-200 text-[11px] font-mono group"
                >
                  <span className="font-bold text-sky-400">{item.wbsCode}</span>
                  <span className="max-w-[140px] truncate text-slate-200" title={item.title}>
                    {item.title}
                  </span>
                  {proj && (
                    <span className="text-[9px] px-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {proj.projectCode || proj.name.slice(0, 8)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(item.id, e)}
                    className="text-sky-400 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove link"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search work items by WBS code, title, or keyword..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {projects.length > 0 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono shrink-0 cursor-pointer"
          >
            <option value="all">All Projects ({workItems.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Action Shortcut Buttons */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono px-1">
        <span>
          Showing {filteredItems.length} available item{filteredItems.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          {currentSprintId && (
            <button
              type="button"
              onClick={handleSelectSprintItems}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              + Select sprint items
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="text-sky-400 hover:underline cursor-pointer"
          >
            + Select all {filteredItems.length} shown
          </button>
        </div>
      </div>

      {/* Selectable Work Items List */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-[#1E293B] bg-[#080D1A] divide-y divide-[#1E293B]/60 text-xs">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            No work items match "{searchTerm}". Try a different search term.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const proj = item.projectId ? projectMap.get(item.projectId) : null;

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-2 sm:px-3 sm:py-2 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-sky-950/40 hover:bg-sky-950/60"
                    : "hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 text-slate-400">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sky-300 text-[11px]">
                        {item.wbsCode}
                      </span>
                      <span
                        className={`truncate font-medium text-xs ${
                          isSelected ? "text-white font-semibold" : "text-slate-300"
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span className="text-slate-500">{item.type}</span>
                      {proj && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400">{proj.name}</span>
                        </>
                      )}
                      {item.progressPercent !== undefined && (
                        <>
                          <span>•</span>
                          <span>{item.progressPercent}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      item.status === "Done" || item.status === "DEMO READY"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : item.status === "Blocked"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : item.status === "In Progress"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
