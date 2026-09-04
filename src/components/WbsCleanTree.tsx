import React, { useState, useMemo } from "react";
import { WbsItem, Stakeholder, WorkItemStatus, PriorityLevel } from "../types";
import {
  List,
  LayoutGrid,
  Calendar,
  Network,
  BarChart2,
  Check,
  User,
  UserPlus,
  Zap,
  Clock,
  Flag,
  MoreHorizontal,
  Plus,
  CornerDownRight,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  Filter,
  Columns,
  Sparkles,
} from "lucide-react";
import { getParentId } from "../utils/wbsRollup";
import { getItemPriority } from "../utils/filterUtils";

interface WbsCleanTreeProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  onAddWbsItem: (item: WbsItem) => void;
  onUpdateWbsItem: (item: WbsItem) => void;
  onDeleteWbsItem: (id: string) => void;
  onOpenAddModal: (parentId?: string | null, statusPreset?: WorkItemStatus) => void;
  onOpenEditModal: (item: WbsItem) => void;
}

export type WbsTabType = "List" | "Board" | "Calendar" | "Mind Map" | "Sprint Reporting";

export const WbsCleanTree: React.FC<WbsCleanTreeProps> = ({
  wbsItems,
  stakeholders,
  onAddWbsItem,
  onUpdateWbsItem,
  onDeleteWbsItem,
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const [activeTab, setActiveTab] = useState<WbsTabType>("List");
  const [showDetailedEvm, setShowDetailedEvm] = useState(false);
  const [groupBy, setGroupBy] = useState<"status" | "hierarchy">("status");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Demoable": true,
    "In Progress": true,
    "To Do": true,
    "Blocked": true,
    "Done": true,
    "all": true,
  });
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    "wbs-1": true,
    "wbs-2": true,
    "wbs-2-1": true,
    "wbs-demo-1": true,
    "wbs-demo-2": true,
  });

  // Helper to format short date as M/D/YY (e.g. 8/21/26) matching screenshot
  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return "8/21/26";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yr = String(d.getFullYear()).slice(-2);
    return `${m}/${day}/${yr}`;
  };

  const getStakeholder = (id?: string) => {
    return stakeholders.find((s) => s.id === id);
  };

  const toggleParent = (id: string) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Metric computations for the 3 clean cards
  const totalTasks = wbsItems.length;
  const unfinishedTasks = wbsItems.filter((i) => i.status !== "Done");
  const missingAssigneeTasks = wbsItems.filter((i) => !i.assignedStakeholderId);
  const missingEffortTasks = wbsItems.filter((i) => !i.estimatedHours || i.estimatedHours === 0);

  // Group child items by parentId
  const childrenMap = useMemo(() => {
    const map = new Map<string, WbsItem[]>();
    wbsItems.forEach((item) => {
      const pId = getParentId(item, wbsItems);
      if (pId) {
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId)!.push(item);
      }
    });
    return map;
  }, [wbsItems]);

  // Priority Flag component
  const renderPriorityFlag = (item: WbsItem) => {
    const priority = item.priority || getItemPriority(item);
    let flagColor = "text-slate-500 hover:text-slate-400";
    if (priority === "Critical" || priority === "High") {
      flagColor = "text-rose-400 hover:text-rose-300 fill-rose-400/20";
    } else if (priority === "Medium") {
      flagColor = "text-amber-400 hover:text-amber-300 fill-amber-400/20";
    }

    const cyclePriority = (e: React.MouseEvent) => {
      e.stopPropagation();
      const priorities: PriorityLevel[] = ["Low", "Medium", "High", "Critical"];
      const currentIndex = priorities.indexOf(priority as PriorityLevel);
      const nextPriority = priorities[(currentIndex + 1) % priorities.length];
      onUpdateWbsItem({ ...item, priority: nextPriority });
    };

    return (
      <button
        type="button"
        onClick={cyclePriority}
        className={`p-1 rounded cursor-pointer transition-colors ${flagColor}`}
        title={`Priority: ${priority} (Click to change)`}
      >
        <Flag className="h-3.5 w-3.5" />
      </button>
    );
  };

  // Status Pill Label format
  const getStatusLabel = (status: WorkItemStatus) => {
    switch (status) {
      case "Demoable":
        return "DEMO READY (LOCAL)";
      case "In Progress":
        return "IN PROGRESS";
      case "To Do":
        return "TO DO";
      case "Blocked":
        return "BLOCKED";
      case "Done":
        return "DONE";
      default:
        return String(status).toUpperCase();
    }
  };

  // Status icon
  const renderStatusIcon = (status: WorkItemStatus) => {
    switch (status) {
      case "Demoable":
        return <Clock className="h-3.5 w-3.5 text-amber-400" />;
      case "In Progress":
        return <Clock className="h-3.5 w-3.5 text-blue-400" />;
      case "Done":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "Blocked":
        return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />;
      case "To Do":
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  // Group items by status
  const statusGroups: { status: WorkItemStatus; label: string; items: WbsItem[] }[] = useMemo(() => {
    const statuses: WorkItemStatus[] = ["Demoable", "In Progress", "To Do", "Blocked", "Done"];
    return statuses.map((st) => ({
      status: st,
      label: getStatusLabel(st),
      items: wbsItems.filter((i) => i.status === st),
    }));
  }, [wbsItems]);

  return (
    <div className="bg-[#090D16] border border-[#1E293B] rounded-xl shadow-xl overflow-hidden font-sans">
      {/* 1. Top Sub-Navigation Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-[#1E293B] bg-[#060911] overflow-x-auto text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab("List")}
            className={`flex items-center gap-2 px-3 py-3 font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === "List"
                ? "border-white text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <List className="h-4 w-4 text-white" />
            <span>List</span>
          </button>

          <button
            onClick={() => setActiveTab("Board")}
            className={`flex items-center gap-2 px-3 py-3 font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === "Board"
                ? "border-[#38BDF8] text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4 text-sky-400" />
            <span>Board</span>
          </button>

          <button
            onClick={() => setActiveTab("Calendar")}
            className={`flex items-center gap-2 px-3 py-3 font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === "Calendar"
                ? "border-amber-400 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="h-4 w-4 text-amber-500" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab("Mind Map")}
            className={`flex items-center gap-2 px-3 py-3 font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === "Mind Map"
                ? "border-pink-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="h-4 w-4 text-pink-400" />
            <span>Mind Map</span>
          </button>

          <button
            onClick={() => setActiveTab("Sprint Reporting")}
            className={`flex items-center gap-2 px-3 py-3 font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === "Sprint Reporting"
                ? "border-purple-400 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart2 className="h-4 w-4 text-purple-400" />
            <span>Sprint Reporting</span>
          </button>
        </div>

        {/* View Options Toggle */}
        <div className="flex items-center gap-2 py-1.5 shrink-0 pl-2">
          <button
            onClick={() => setShowDetailedEvm(!showDetailedEvm)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showDetailedEvm
                ? "bg-sky-500/15 text-sky-300 border-sky-500/40 font-bold"
                : "bg-[#141C2E] text-slate-400 border-[#1E293B] hover:text-white"
            }`}
            title="Toggle Detailed Hours & Budget Roll-up Columns"
          >
            <Columns className="h-3 w-3" />
            <span>{showDetailedEvm ? "Detailed EVM" : "Clean View"}</span>
          </button>
        </div>
      </div>

      {/* 2. Notification / Sprint Alert Banner */}
      <div className="bg-[#2D0D15] border-b border-[#4C1D24] px-4 py-2 text-center text-xs text-rose-200 font-medium flex items-center justify-center gap-1.5">
        <span>This sprint has</span>
        <span className="underline decoration-dotted decoration-rose-300/80 font-bold text-white cursor-pointer">
          {unfinishedTasks.length} unfinished tasks
        </span>
      </div>

      {/* 3. Three Metric Summary Cards */}
      <div className="p-4 sm:p-5 bg-[#090D16]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Backlog */}
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-[#064E3B]/50 border border-[#059669]/60 flex items-center justify-center shrink-0 text-emerald-400">
              <Check className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Backlog</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{totalTasks} tasks added</p>
            </div>
          </div>

          {/* Card 2: Assigned */}
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-[#78350F]/50 border border-[#D97706]/60 flex items-center justify-center shrink-0 text-amber-400">
              <UserPlus className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Assigned</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {missingAssigneeTasks.length} tasks missing assignee
              </p>
            </div>
          </div>

          {/* Card 3: Effort */}
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-[#78350F]/50 border border-[#D97706]/60 flex items-center justify-center shrink-0 text-amber-400">
              <Zap className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Effort</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {missingEffortTasks.length} tasks missing effort
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tab Views Router */}
      {activeTab === "List" && (
        <div className="px-4 sm:px-5 pb-5">
          {/* Status Group Sections */}
          {statusGroups.map((group) => {
            const isGroupOpen = expandedSections[group.status] ?? true;

            // Separate into top-level / parent items within this group, or all items in this status
            // To match screenshot: show parent deliverable with its child deliverables indented beneath it
            const parentItemsInGroup = group.items.filter(
              (i) => !getParentId(i, wbsItems) || childrenMap.has(i.id)
            );
            // If empty, don't show empty group unless Demoable or In Progress
            if (group.items.length === 0 && group.status !== "Demoable" && group.status !== "In Progress") {
              return null;
            }

            return (
              <div key={group.status} className="mb-6 last:mb-0">
                {/* 4A. Group Header Pill */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleSection(group.status)}
                    className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
                  >
                    {isGroupOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F172A] border border-[#1E293B] text-slate-200 text-[11px] font-bold tracking-wider">
                    {renderStatusIcon(group.status)}
                    <span>{group.label}</span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono font-medium ml-1">
                    {group.items.length}
                  </span>

                  <div className="flex items-center gap-1 ml-1 text-slate-500 hover:text-slate-300">
                    <button
                      className="p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Group options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenAddModal(null, group.status)}
                      className="p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-white"
                      title={`Add task to ${group.label}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isGroupOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#E2E8F0] border-collapse">
                      {/* 4B. Table Header */}
                      <thead>
                        <tr className="border-b border-[#1E293B]/70 text-[11px] text-slate-400 font-medium">
                          <th className="py-2.5 pl-2 font-normal">Name</th>
                          <th className="py-2.5 px-3 font-normal w-36">Assignee</th>
                          <th className="py-2.5 px-3 font-normal w-28">Due date</th>
                          <th className="py-2.5 px-3 font-normal w-20">Priority</th>
                          {showDetailedEvm && (
                            <>
                              <th className="py-2.5 px-3 font-normal w-28 font-mono">Hours</th>
                              <th className="py-2.5 px-3 font-normal w-28 font-mono">Budget</th>
                            </>
                          )}
                          <th className="py-2.5 pr-3 text-right w-20">
                            <button
                              onClick={() => onOpenAddModal(null, group.status)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </button>
                          </th>
                        </tr>
                      </thead>

                      {/* 4C. Table Rows */}
                      <tbody className="divide-y divide-[#1E293B]/40">
                        {group.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={showDetailedEvm ? 7 : 5}
                              className="py-6 text-center text-slate-500 text-xs italic"
                            >
                              No tasks currently in {group.label}
                            </td>
                          </tr>
                        ) : (
                          // Render items: if an item has children, render parent followed by children
                          group.items.map((item) => {
                            const isChildOfSomeone = !!getParentId(item, wbsItems);
                            const children = childrenMap.get(item.id) || [];
                            const hasChildren = children.length > 0;
                            const isExpanded = expandedParents[item.id] ?? true;
                            const stakeholder = getStakeholder(item.assignedStakeholderId);

                            // If this is a child item and its parent is also in the list, skip direct rendering here
                            // because it will be rendered indented right beneath its parent!
                            if (isChildOfSomeone && group.items.some((i) => i.id === getParentId(item, wbsItems))) {
                              return null;
                            }

                            return (
                              <React.Fragment key={item.id}>
                                {/* Parent / Primary Deliverable Row */}
                                <tr className="group hover:bg-[#0E1526]/80 transition-colors">
                                  {/* Name column */}
                                  <td className="py-2.5 pl-1 pr-3">
                                    <div className="flex items-center gap-2">
                                      {/* Grip dots on hover */}
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 cursor-grab -ml-1">
                                        <GripVertical className="h-3.5 w-3.5" />
                                      </div>

                                      {/* Expand/Collapse Chevron */}
                                      {hasChildren ? (
                                        <button
                                          type="button"
                                          onClick={() => toggleParent(item.id)}
                                          className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      ) : (
                                        <span className="w-4 inline-block" />
                                      )}

                                      {/* Status Icon */}
                                      <div className="shrink-0">{renderStatusIcon(item.status)}</div>

                                      {/* Title */}
                                      <span className="font-semibold text-white text-xs hover:text-sky-300 transition-colors cursor-pointer truncate max-w-md"
                                        onClick={() => onOpenEditModal(item)}
                                      >
                                        {item.title}
                                      </span>

                                      {/* Subtask count badge */}
                                      {hasChildren && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono ml-1">
                                          <CornerDownRight className="h-3 w-3 text-slate-500" />
                                          <span>{children.length}</span>
                                        </span>
                                      )}

                                      {/* Quick hover action buttons */}
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                                        <button
                                          type="button"
                                          onClick={() => onOpenAddModal(item.id, item.status)}
                                          className="p-1 rounded bg-[#141C2E] hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                          title={`Add subtask to ${item.title}`}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onOpenEditModal(item)}
                                          className="p-1 rounded bg-[#141C2E] hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                          title="Edit work item"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Assignee column */}
                                  <td className="py-2.5 px-3">
                                    {stakeholder ? (
                                      <div
                                        onClick={() => onOpenEditModal(item)}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0B0F19] border border-[#1E293B] hover:border-slate-600 text-slate-300 text-[11px] cursor-pointer transition-colors max-w-36 truncate"
                                        title={`${stakeholder.name} (${stakeholder.role})`}
                                      >
                                        <div className="h-4 w-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                                          {stakeholder.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{stakeholder.name}</span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => onOpenEditModal(item)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B0F19] border border-[#1E293B] hover:border-slate-600 text-slate-500 hover:text-slate-300 text-[11px] cursor-pointer transition-colors"
                                        title="Assign team member"
                                      >
                                        <UserPlus className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </td>

                                  {/* Due Date column (Salmon/Red color matching screenshot) */}
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#F87171]">
                                    {formatShortDate(item.dueDate)}
                                  </td>

                                  {/* Priority column */}
                                  <td className="py-2.5 px-3">{renderPriorityFlag(item)}</td>

                                  {/* Detailed EVM columns */}
                                  {showDetailedEvm && (
                                    <>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                                        <span className="text-sky-400 font-semibold">{item.estimatedHours}h</span>{" "}
                                        <span className="text-slate-500">({item.actualHours}h)</span>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                                        <span className="text-emerald-400 font-semibold">
                                          ${(item.plannedBudget || 0).toLocaleString()}
                                        </span>
                                      </td>
                                    </>
                                  )}

                                  {/* Actions column */}
                                  <td className="py-2.5 pr-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onOpenEditModal(item)}
                                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="More actions"
                                      >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Child / Subtasks Indented Beneath Parent */}
                                {hasChildren &&
                                  isExpanded &&
                                  children.map((child) => {
                                    const childStakeholder = getStakeholder(child.assignedStakeholderId);

                                    return (
                                      <tr
                                        key={child.id}
                                        className="group hover:bg-[#0E1526]/60 transition-colors border-t border-[#1E293B]/20"
                                      >
                                        {/* Name column with Indent */}
                                        <td className="py-2 pl-9 pr-3">
                                          <div className="flex items-center gap-2.5">
                                            {/* Dashed Circle status indicator */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextStatus: WorkItemStatus =
                                                  child.status === "Done" ? "In Progress" : "Done";
                                                onUpdateWbsItem({
                                                  ...child,
                                                  status: nextStatus,
                                                  progressPercent: nextStatus === "Done" ? 100 : 50,
                                                });
                                              }}
                                              className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                                              title={`Toggle status (currently ${child.status})`}
                                            >
                                              {child.status === "Done" ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                              ) : (
                                                <CircleDashed className="h-3.5 w-3.5" />
                                              )}
                                            </button>

                                            {/* Subtask Title */}
                                            <span
                                              onClick={() => onOpenEditModal(child)}
                                              className="text-xs text-slate-200 hover:text-white cursor-pointer transition-colors truncate max-w-lg"
                                            >
                                              {child.title}
                                            </span>

                                            {/* Hover Actions */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                                              <button
                                                type="button"
                                                onClick={() => onOpenEditModal(child)}
                                                className="p-0.5 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
                                                title="Edit subtask"
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (confirm(`Delete subtask "${child.title}"?`)) {
                                                    onDeleteWbsItem(child.id);
                                                  }
                                                }}
                                                className="p-0.5 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                                title="Delete subtask"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Assignee column */}
                                        <td className="py-2 px-3">
                                          {childStakeholder ? (
                                            <div
                                              onClick={() => onOpenEditModal(child)}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300 text-[11px] cursor-pointer hover:border-slate-600 transition-colors max-w-36 truncate"
                                            >
                                              <div className="h-3.5 w-3.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[8px] font-bold shrink-0">
                                                {childStakeholder.name.charAt(0)}
                                              </div>
                                              <span className="truncate">{childStakeholder.name}</span>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => onOpenEditModal(child)}
                                              className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
                                              title="Assign team member"
                                            >
                                              <UserPlus className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </td>

                                        {/* Due date column (Salmon/red) */}
                                        <td className="py-2 px-3 font-mono text-[11px] text-[#F87171]">
                                          {formatShortDate(child.dueDate)}
                                        </td>

                                        {/* Priority column */}
                                        <td className="py-2 px-3">{renderPriorityFlag(child)}</td>

                                        {/* Detailed EVM columns */}
                                        {showDetailedEvm && (
                                          <>
                                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                                              {child.estimatedHours}h
                                            </td>
                                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                                              ${(child.plannedBudget || 0).toLocaleString()}
                                            </td>
                                          </>
                                        )}

                                        {/* Actions */}
                                        <td className="py-2 pr-3 text-right">
                                          <button
                                            type="button"
                                            onClick={() => onOpenEditModal(child)}
                                            className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
                                          >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {/* Bottom "+ Add Task" button */}
                    <div className="pt-2 pl-7 border-t border-[#1E293B]/30">
                      <button
                        type="button"
                        onClick={() => onOpenAddModal(null, group.status)}
                        className="inline-flex items-center gap-2 py-1.5 px-2 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer rounded-md hover:bg-[#141C2E]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Board / Kanban View */}
      {activeTab === "Board" && (
        <div className="p-4 sm:p-5 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-w-[850px]">
            {statusGroups.map((col) => (
              <div
                key={col.status}
                className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 flex flex-col h-[520px]"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#1E293B]">
                  <div className="flex items-center gap-1.5">
                    {renderStatusIcon(col.status)}
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {col.label}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141C2E] text-slate-300 border border-slate-700">
                    {col.items.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {col.items.map((item) => {
                    const stk = getStakeholder(item.assignedStakeholderId);
                    return (
                      <div
                        key={item.id}
                        onClick={() => onOpenEditModal(item)}
                        className="p-3 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-sky-500/50 transition-all cursor-pointer shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] text-sky-400">{item.wbsCode}</span>
                          {renderPriorityFlag(item)}
                        </div>
                        <h5 className="text-xs font-semibold text-white line-clamp-2">{item.title}</h5>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-[#1E293B]/40">
                          <span className="text-[#F87171] font-mono">{formatShortDate(item.dueDate)}</span>
                          {stk ? (
                            <span className="truncate max-w-[90px] text-slate-300">{stk.name}</span>
                          ) : (
                            <span className="text-slate-600 italic">Unassigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAddModal(null, col.status)}
                  className="mt-2 py-1.5 w-full rounded border border-dashed border-[#1E293B] hover:border-slate-600 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add Task
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Calendar View */}
      {activeTab === "Calendar" && (
        <div className="p-4 sm:p-5">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>Deliverable Schedule (August / September 2026)</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {wbsItems.length} Milestones & Work Items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {wbsItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenEditModal(item)}
                  className="p-3 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-amber-500/50 transition-colors cursor-pointer flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] text-amber-400">{item.wbsCode}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {item.status}
                      </span>
                    </div>
                    <h5 className="text-xs font-medium text-white truncate max-w-[200px]">
                      {item.title}
                    </h5>
                  </div>
                  <span className="font-mono text-xs text-[#F87171] shrink-0">
                    {formatShortDate(item.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Mind Map View */}
      {activeTab === "Mind Map" && (
        <div className="p-4 sm:p-5">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-5 overflow-x-auto min-h-[400px]">
            <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Network className="h-4 w-4 text-pink-400" />
                <span>Hierarchical WBS Mind Map (PMI 100% Rule Decomposition)</span>
              </h4>
              <span className="text-xs text-slate-400">Click any node to edit deliverable details</span>
            </div>

            <div className="space-y-4">
              {wbsItems
                .filter((i) => !getParentId(i, wbsItems))
                .map((topLevel) => {
                  const directChildren = childrenMap.get(topLevel.id) || [];
                  return (
                    <div
                      key={topLevel.id}
                      className="p-4 rounded-xl bg-[#060911] border border-pink-500/30 space-y-3"
                    >
                      <div
                        onClick={() => onOpenEditModal(topLevel)}
                        className="flex items-center justify-between cursor-pointer hover:text-pink-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-pink-500/20 text-pink-300 border border-pink-500/40">
                            {topLevel.wbsCode}
                          </span>
                          <span className="font-bold text-white text-sm">{topLevel.title}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {topLevel.estimatedHours}h • ${(topLevel.plannedBudget || 0).toLocaleString()}
                        </span>
                      </div>

                      {directChildren.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 pl-4 border-l-2 border-pink-500/40">
                          {directChildren.map((child) => (
                            <div
                              key={child.id}
                              onClick={() => onOpenEditModal(child)}
                              className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] hover:border-pink-500/60 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>{child.wbsCode}</span>
                                <span className="text-[#F87171]">{formatShortDate(child.dueDate)}</span>
                              </div>
                              <div className="text-xs font-medium text-slate-200 truncate">
                                {child.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 8. Sprint Reporting View */}
      {activeTab === "Sprint Reporting" && (
        <div className="p-4 sm:p-5">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-purple-400" />
              <span>Sprint Reporting & PMI Earned Value Management (EVM)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[#060911] border border-[#1E293B]">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Planned Tasks</div>
                <div className="text-lg font-bold text-white mt-1 font-mono">{totalTasks}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  {wbsItems.filter((i) => i.status === "Done").length} completed
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#060911] border border-[#1E293B]">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">In-Flight / Unfinished</div>
                <div className="text-lg font-bold text-rose-400 mt-1 font-mono">{unfinishedTasks.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Active sprint scope</div>
              </div>

              <div className="p-3 rounded-lg bg-[#060911] border border-[#1E293B]">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Rolled-Up Hours</div>
                <div className="text-lg font-bold text-sky-400 mt-1 font-mono">
                  {wbsItems.reduce((acc, i) => acc + (Number(i.estimatedHours) || 0), 0)}h
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">100% rule leaf sum</div>
              </div>

              <div className="p-3 rounded-lg bg-[#060911] border border-[#1E293B]">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Sprint Health Index</div>
                <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">94.2%</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">On Schedule (SPI 1.02)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
