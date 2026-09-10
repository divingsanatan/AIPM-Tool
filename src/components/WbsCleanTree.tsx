import React, { useState, useMemo } from "react";
import { WbsItem, Stakeholder, WorkItemStatus, PriorityLevel, WbsType, StatusConfig } from "../types";
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
  Users,
  Layers,
  Inbox,
  Sliders,
} from "lucide-react";
import {
  getParentId,
  suggestChildType,
  getChildTypeLabel,
  getHierarchyLevelInfo,
  getWbsTypeFriendlyName,
  getCompactNomenclature,
  getItemAssignees,
} from "../utils/wbsRollup";
import { getItemPriority } from "../utils/filterUtils";
import {
  DEFAULT_STATUS_CONFIGS,
  getStatusConfig,
  getProgressForStatus,
} from "../utils/statusConfig";
import { StatusManagerModal } from "./StatusManagerModal";

interface WbsCleanTreeProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  onAddWbsItem: (item: WbsItem) => void;
  onUpdateWbsItem: (item: WbsItem) => void;
  onDeleteWbsItem: (id: string) => void;
  onOpenAddModal: (parentId?: string | null, statusPreset?: WorkItemStatus, parentItem?: WbsItem) => void;
  onOpenEditModal: (item: WbsItem) => void;
  statusConfigs?: StatusConfig[];
  onUpdateStatusConfigs?: (newConfigs: StatusConfig[]) => void;
  onSyncAllTasks?: () => void;
  onApplyStatusProgressToTasks?: (statusKey: string, newProgress: number) => void;
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
  statusConfigs = DEFAULT_STATUS_CONFIGS,
  onUpdateStatusConfigs,
  onSyncAllTasks,
  onApplyStatusProgressToTasks,
}) => {
  const [activeTab, setActiveTab] = useState<WbsTabType>("List");
  const [showDetailedEvm, setShowDetailedEvm] = useState(false);
  const [groupBy, setGroupBy] = useState<"status" | "hierarchy">("status");
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [focusedStatusForConfig, setFocusedStatusForConfig] = useState<string | undefined>(undefined);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Done": true,
    "Demoable": true,
    "Blocked": true,
    "In Progress": true,
    "To Do": true,
    "Backlog": true,
    "all": true,
  });
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    "wbs-1": true,
    "wbs-2": true,
    "wbs-2-1": true,
    "wbs-2-2": true,
    "wbs-demo-1": true,
    "wbs-demo-2": true,
  });

  const [nomenclatureStyle, setNomenclatureStyle] = useState<"smart" | "micro">("smart");
  const [quickAssignItemId, setQuickAssignItemId] = useState<string | null>(null);
  const [quickAssignSearch, setQuickAssignSearch] = useState("");
  const [quickAssignFilter, setQuickAssignFilter] = useState<"all" | "unassigned">("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<WbsType | "ALL">("ALL");

  const handleToggleAssignee = (item: WbsItem, stakeholderId: string) => {
    const currentAssignees =
      item.assignedStakeholderIds && item.assignedStakeholderIds.length > 0
        ? [...item.assignedStakeholderIds]
        : item.assignedStakeholderId
        ? [item.assignedStakeholderId]
        : [];

    let nextIds: string[];
    if (currentAssignees.includes(stakeholderId)) {
      nextIds = currentAssignees.filter((id) => id !== stakeholderId);
    } else {
      nextIds = [...currentAssignees, stakeholderId];
    }

    const updated: WbsItem = {
      ...item,
      assignedStakeholderIds: nextIds,
      assignedStakeholderId: nextIds[0] || undefined,
      contributorStakeholderIds: nextIds.slice(1),
    };
    onUpdateWbsItem(updated);
  };

  const handleSetLeadAssignee = (item: WbsItem, stakeholderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentAssignees =
      item.assignedStakeholderIds && item.assignedStakeholderIds.length > 0
        ? [...item.assignedStakeholderIds]
        : item.assignedStakeholderId
        ? [item.assignedStakeholderId]
        : [];
    const nextIds = [stakeholderId, ...currentAssignees.filter((id) => id !== stakeholderId)];
    const updated: WbsItem = {
      ...item,
      assignedStakeholderIds: nextIds,
      assignedStakeholderId: stakeholderId,
      contributorStakeholderIds: nextIds.slice(1),
    };
    onUpdateWbsItem(updated);
  };

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

  // Leaf work packages (items with no children, whose estimates constitute 100% of project work)
  const leafItems = useMemo(() => {
    return wbsItems.filter((i) => !childrenMap.has(i.id) || childrenMap.get(i.id)!.length === 0);
  }, [wbsItems, childrenMap]);

  // Dynamic Total Effort: Sum of time estimates added to all WBS (in hours)
  const totalEffortHours = useMemo(() => {
    return Math.round(
      leafItems.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0)
    );
  }, [leafItems]);

  // Total actual hours logged across work packages
  const totalActualHours = useMemo(() => {
    return Math.round(
      leafItems.reduce((sum, i) => sum + (Number(i.actualHours) || 0), 0)
    );
  }, [leafItems]);

  // Tasks missing effort estimate (0 or missing hours)
  const missingEffortTasks = useMemo(() => {
    return leafItems.filter((i) => !i.estimatedHours || i.estimatedHours === 0);
  }, [leafItems]);

  // Backlog items: explicitly marked with status "Backlog"
  const backlogItems = useMemo(() => {
    return wbsItems.filter((i) => {
      const conf = getStatusConfig(i.status, statusConfigs);
      return conf.key.toLowerCase() === "backlog";
    });
  }, [wbsItems, statusConfigs]);

  // Metric computations for the 3 clean cards
  const totalTasks = wbsItems.length;
  const unfinishedTasks = useMemo(() => wbsItems.filter((i) => i.status !== "Done"), [wbsItems]);

  // Check if an item has assignees (supporting both single lead & multi-stakeholders)
  const isItemAssigned = (item: WbsItem) =>
    Boolean(
      item.assignedStakeholderId ||
        (item.assignedStakeholderIds && item.assignedStakeholderIds.length > 0)
    );

  const missingAssigneeTasks = useMemo(() => {
    return wbsItems.filter((i) => !isItemAssigned(i));
  }, [wbsItems]);

  const assignedTasksCount = totalTasks - missingAssigneeTasks.length;

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
    const cfg = getStatusConfig(status, statusConfigs);
    return cfg.label;
  };

  // Status icon
  const renderStatusIcon = (status: WorkItemStatus) => {
    const cfg = getStatusConfig(status, statusConfigs);
    if (cfg.key === "Done") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    } else if (cfg.key === "Demoable") {
      return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    } else if (cfg.key === "Blocked") {
      return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />;
    } else if (cfg.key === "In Progress") {
      return <Clock className="h-3.5 w-3.5 text-blue-400" />;
    } else if (cfg.key === "To Do") {
      return <Clock className="h-3.5 w-3.5 text-slate-400" />;
    } else if (cfg.key === "Backlog") {
      return <Layers className="h-3.5 w-3.5 text-indigo-400" />;
    }
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />;
  };

  // Intelligent quick-status transition with automatic progress marking
  const handleQuickStatusChange = (item: WbsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    let nextStatus: WorkItemStatus = "In Progress";

    if (item.status === "Backlog") {
      nextStatus = "To Do";
    } else if (item.status === "To Do") {
      nextStatus = "In Progress";
    } else if (item.status === "In Progress") {
      nextStatus = "Demoable";
    } else if (item.status === "Demoable") {
      nextStatus = "Done";
    } else if (item.status === "Blocked") {
      nextStatus = "In Progress";
    } else if (item.status === "Done") {
      nextStatus = "In Progress";
    } else {
      nextStatus = "Done";
    }

    // Automatically mark progress linked to the status
    const nextProgress = getProgressForStatus(nextStatus, statusConfigs);

    onUpdateWbsItem({
      ...item,
      status: nextStatus,
      progressPercent: nextProgress,
    });
  };

  // Recursive deliverable and task row renderer supporting arbitrary hierarchy depth
  const renderDeliverableRow = (
    item: WbsItem,
    depth = 0,
    currentSectionStatus: WorkItemStatus
  ): React.ReactNode => {
    const children = childrenMap.get(item.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedParents[item.id] ?? true;
    const stakeholder = getStakeholder(item.assignedStakeholderId);
    const parentId = getParentId(item, wbsItems);
    const parentItem = parentId ? wbsItems.find((i) => i.id === parentId) : null;
    const blockedChildrenCount = children.filter((c) => c.status === "Blocked").length;
    const nom = getCompactNomenclature(item.type);
    const itemAssignees = getItemAssignees(item, stakeholders);

    return (
      <React.Fragment key={item.id}>
        <tr
          className={`group transition-colors ${
            depth === 0
              ? "hover:bg-[#0E1526]/80"
              : "hover:bg-[#0E1526]/60 bg-[#0B0F19]/40 border-t border-[#1E293B]/20"
          }`}
        >
          {/* Name column */}
          <td className="py-2.5 pr-3" style={{ paddingLeft: `${8 + depth * 18}px` }}>
            <div className="flex items-center gap-2">
              {/* Grip dots on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 cursor-grab -ml-1 shrink-0">
                <GripVertical className="h-3.5 w-3.5" />
              </div>

              {/* Expand/Collapse Chevron */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleParent(item.id)}
                  className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer shrink-0"
                  title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 inline-block shrink-0" />
              )}

              {/* Status Indicator / Quick Advance Button */}
              <button
                type="button"
                onClick={(e) => handleQuickStatusChange(item, e)}
                className="shrink-0 p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Status: ${item.status} (Click to advance/toggle)`}
              >
                {renderStatusIcon(item.status)}
              </button>

              {/* Space-Saving Nomenclature Badge */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setNomenclatureStyle((prev) => (prev === "smart" ? "micro" : "smart"));
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shrink-0 border select-none cursor-pointer transition-all hover:scale-105 shadow-xs ${nom.bgColor} ${nom.color} ${nom.borderColor}`}
                title={`${nom.fullTitle} • WBS ${item.wbsCode} • Click to toggle badge size`}
              >
                <span className="text-[11px] leading-none">{nom.symbol}</span>
                <span>{nomenclatureStyle === "smart" ? nom.short : nom.code}</span>
              </span>

              {/* WBS Code */}
              <span className="text-[11px] font-mono text-slate-400 shrink-0 font-medium">
                {item.wbsCode}
              </span>

              {/* Title & Hierarchy Breadcrumb */}
              <div className="min-w-0 flex-1">
                {depth === 0 && parentItem && (
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mb-0.5 truncate">
                    <CornerDownRight className="h-2.5 w-2.5 text-slate-600 shrink-0" />
                    <span className="truncate">
                      Part of {parentItem.wbsCode} {parentItem.title}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`font-semibold text-xs hover:text-sky-300 transition-colors cursor-pointer truncate max-w-md ${
                      item.status === "Done" ? "text-slate-400 line-through" : "text-white"
                    }`}
                    onClick={() => onOpenEditModal(item)}
                  >
                    {item.title}
                  </span>

                  {/* Subtask count badge */}
                  {hasChildren && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-mono px-1.5 py-0.2 rounded bg-slate-800/60 border border-slate-700/40">
                      <CornerDownRight className="h-2.5 w-2.5 text-slate-500" />
                      <span>{children.length}</span>
                    </span>
                  )}

                  {/* Blocked subtasks alert badge */}
                  {blockedChildrenCount > 0 && item.status !== "Blocked" && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-300 font-mono px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/30 font-medium">
                      <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                      <span>{blockedChildrenCount} blocked</span>
                    </span>
                  )}

                  {/* Status pill if different from parent section */}
                  {item.status !== currentSectionStatus && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${
                        item.status === "Blocked"
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : item.status === "In Progress"
                          ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          : item.status === "Done"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : item.status === "Demoable"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-slate-700/40 text-slate-300 border-slate-600/40"
                      }`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick hover action buttons */}
              {(() => {
                const childType = suggestChildType(item.type);
                const childLabel = childType === "User Story" ? "Story" : childType;
                return (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedParents((prev) => ({ ...prev, [item.id]: true }));
                        onOpenAddModal(item.id, item.status, item);
                      }}
                      className="p-1 rounded bg-[#141C2E] hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                      title={`Create ${childLabel} under [${item.wbsCode}] ${item.title}`}
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
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${item.title}"?`)) {
                          onDeleteWbsItem(item.id);
                        }
                      }}
                      className="p-1 rounded bg-[#141C2E] hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                      title="Delete work item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })()}
            </div>
          </td>

          {/* Assignee column */}
          <td className="py-2.5 px-3 relative">
            {itemAssignees.length === 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickAssignSearch("");
                  setQuickAssignItemId(quickAssignItemId === item.id ? null : item.id);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0F19] border border-dashed border-[#1E293B] hover:border-sky-500/60 hover:text-sky-300 text-slate-500 text-[11px] cursor-pointer transition-colors shadow-xs"
                title="Assign team member(s)"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Assign</span>
              </button>
            ) : itemAssignees.length === 1 ? (
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickAssignSearch("");
                    setQuickAssignItemId(quickAssignItemId === item.id ? null : item.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0B0F19] border border-[#1E293B] hover:border-sky-500/60 text-slate-200 text-[11px] cursor-pointer transition-colors max-w-44 group/assignee"
                  title={`${itemAssignees[0].name} (${itemAssignees[0].role}) • Click to add or manage team assignees`}
                >
                  <div className="h-4 w-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                    {itemAssignees[0].name.charAt(0)}
                  </div>
                  <span className="truncate">{itemAssignees[0].name}</span>
                  <div className="h-3.5 w-3.5 rounded bg-slate-800 group-hover/assignee:bg-sky-950 flex items-center justify-center text-slate-400 group-hover/assignee:text-sky-300 ml-0.5 shrink-0 transition-colors" title="Add more assignees">
                    <Plus className="h-2.5 w-2.5" />
                  </div>
                </button>
              </div>
            ) : (
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickAssignSearch("");
                    setQuickAssignItemId(quickAssignItemId === item.id ? null : item.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0B0F19] border border-[#1E293B] hover:border-sky-500/60 text-slate-200 text-[11px] cursor-pointer transition-colors group/assignee"
                  title={`Assigned Stakeholders:\n${itemAssignees
                    .map((s, idx) => `${idx === 0 ? "★ Lead: " : "• "}${s.name} (${s.role})`)
                    .join("\n")}\nClick to add/remove assignees`}
                >
                  <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                    {itemAssignees.slice(0, 3).map((stk, idx) => (
                      <div
                        key={stk.id}
                        className={`inline-block h-4.5 w-4.5 rounded-full ring-1 ring-[#090D16] flex items-center justify-center text-[8.5px] font-bold shrink-0 ${
                          idx === 0
                            ? "bg-sky-500/30 text-sky-300"
                            : "bg-purple-500/30 text-purple-300"
                        }`}
                        title={stk.name}
                      >
                        {stk.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-sky-300 truncate max-w-[110px]">
                    {itemAssignees[0].name.split(" ")[0]} +{itemAssignees.length - 1}
                  </span>
                  <div className="h-3.5 w-3.5 rounded bg-slate-800 group-hover/assignee:bg-sky-950 flex items-center justify-center text-slate-400 group-hover/assignee:text-sky-300 ml-0.5 shrink-0 transition-colors" title="Manage assignees">
                    <Plus className="h-2.5 w-2.5" />
                  </div>
                </button>
              </div>
            )}

            {/* Quick Assign Dropdown Popover */}
            {quickAssignItemId === item.id && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickAssignItemId(null);
                  }}
                />
                <div
                  className="absolute left-0 top-full mt-1 w-72 bg-[#0F172A] border border-slate-700 rounded-lg shadow-2xl p-2.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                    <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-sky-400" />
                      <span>Assign Multiple Stakeholders</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickAssignItemId(null)}
                      className="text-slate-400 hover:text-white text-xs p-0.5 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Teammate Filter Search */}
                  <div className="mb-1.5">
                    <input
                      type="text"
                      value={quickAssignSearch}
                      onChange={(e) => setQuickAssignSearch(e.target.value)}
                      placeholder="Filter by name or role..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500 font-sans"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                    {stakeholders
                      .filter((s) => {
                        if (!quickAssignSearch.trim()) return true;
                        const q = quickAssignSearch.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          s.role.toLowerCase().includes(q) ||
                          s.department.toLowerCase().includes(q)
                        );
                      })
                      .map((stk) => {
                        const isAssigned = itemAssignees.some((a) => a.id === stk.id);
                        const isLead = itemAssignees[0]?.id === stk.id;

                        return (
                          <div
                            key={stk.id}
                            onClick={() => handleToggleAssignee(item, stk.id)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                              isAssigned
                                ? "bg-sky-950/60 border border-sky-700/60 text-white"
                                : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => {}}
                                className="rounded border-slate-700 text-sky-500 focus:ring-0 bg-slate-900 cursor-pointer h-3.5 w-3.5 shrink-0"
                              />
                              <div
                                className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                  isLead
                                    ? "bg-sky-500 text-slate-950 font-extrabold"
                                    : isAssigned
                                    ? "bg-sky-900 text-sky-200"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {stk.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-medium truncate">{stk.name}</div>
                                <div className="text-[9px] text-slate-400 truncate">{stk.role}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {isAssigned && (
                                isLead ? (
                                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold flex items-center gap-0.5">
                                    ★ Lead
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleSetLeadAssignee(item, stk.id, e)}
                                    className="text-[8px] text-slate-400 hover:text-sky-300 px-1 py-0.2 rounded hover:bg-slate-800 transition-colors"
                                    title="Make Primary Lead"
                                  >
                                    Make Lead
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono">
                        {itemAssignees.length} assigned
                      </span>
                      {itemAssignees.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateWbsItem({
                              ...item,
                              assignedStakeholderIds: [],
                              assignedStakeholderId: undefined,
                              contributorStakeholderIds: [],
                            });
                          }}
                          className="text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickAssignItemId(null)}
                      className="px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-[10px] transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </td>

          {/* Due Date column (Salmon/Red) */}
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
                </span>{" "}
                <span className="text-slate-500 text-[10px]">
                  (${item.actualCost ? item.actualCost.toLocaleString() : 0})
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

        {/* Recursive Rendering of Children */}
        {hasChildren &&
          isExpanded &&
          children.map((child) => renderDeliverableRow(child, depth + 1, currentSectionStatus))}
      </React.Fragment>
    );
  };

  // Group items by status dynamically using statusConfigs (supporting custom statuses and automatic progress)
  // Default order:
  // 1. DONE (at the top - 100%)
  // 2. DEMO READY (60%)
  // 3. BLOCKED (50%)
  // 4. IN PROGRESS (40%)
  // 5. TO DO (0%)
  // 6. BACKLOG (0% - at bottom)
  // 7+. Custom Statuses
  const statusGroups: {
    key: string;
    status: WorkItemStatus;
    label: string;
    progressPercent: number;
    items: WbsItem[];
    dotColor: string;
    description?: string;
    badgeBg?: string;
    badgeText?: string;
    badgeBorder?: string;
    isDefault?: boolean;
  }[] = useMemo(() => {
    const list = statusConfigs && statusConfigs.length > 0 ? statusConfigs : DEFAULT_STATUS_CONFIGS;

    const baseItems =
      quickAssignFilter === "unassigned"
        ? wbsItems.filter((i) => !isItemAssigned(i))
        : wbsItems;

    return list.map((conf) => {
      const items = baseItems.filter((i) => {
        const itemConfig = getStatusConfig(i.status, list);
        return itemConfig.key.toLowerCase() === conf.key.toLowerCase();
      });

      return {
        key: conf.key,
        status: conf.key as WorkItemStatus,
        label: conf.label,
        progressPercent: conf.progressPercent,
        items,
        dotColor: conf.dotColor,
        description: conf.description,
        badgeBg: conf.badgeBg,
        badgeText: conf.badgeText,
        badgeBorder: conf.badgeBorder,
        isDefault: conf.isDefault,
      };
    });
  }, [wbsItems, quickAssignFilter, statusConfigs]);

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
          <div
            id="wbs-kpi-card-backlog"
            onClick={() => {
              setExpandedSections((prev) => ({ ...prev, Backlog: true }));
              const el = document.getElementById("wbs-section-Backlog");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="bg-[#0B0F19] border border-[#1E293B] hover:border-indigo-500/50 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs transition-colors cursor-pointer"
            title="Click to jump to Backlog items"
          >
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                backlogItems.length === 0
                  ? "bg-[#064E3B]/50 border border-[#059669]/60 text-emerald-400"
                  : "bg-indigo-950/60 border border-indigo-500/50 text-indigo-400"
              }`}
            >
              {backlogItems.length === 0 ? (
                <Check className="h-5 w-5 stroke-[2.5]" />
              ) : (
                <Layers className="h-5 w-5 stroke-[2.2]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Backlog</h4>
                {backlogItems.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {backlogItems.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {backlogItems.length === 0 ? (
                  <>
                    <span className="text-emerald-400 font-medium">0 in backlog</span>{" "}
                    <span className="text-slate-500 font-normal">({totalTasks} total tasks)</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-200 font-mono">{backlogItems.length}</span>{" "}
                    {backlogItems.length === 1 ? "task" : "tasks"} in backlog{" "}
                    <span className="text-slate-500 font-normal">({totalTasks} total)</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Card 2: Assigned */}
          <div
            id="wbs-kpi-card-assigned"
            onClick={() => {
              setQuickAssignFilter((prev) => (prev === "unassigned" ? "all" : "unassigned"));
            }}
            className={`bg-[#0B0F19] border rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs transition-colors cursor-pointer ${
              quickAssignFilter === "unassigned"
                ? "border-amber-500/80 bg-amber-950/15 ring-1 ring-amber-500/40"
                : "border-[#1E293B] hover:border-amber-500/50"
            }`}
            title="Click to toggle filter for unassigned tasks"
          >
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                missingAssigneeTasks.length === 0
                  ? "bg-[#064E3B]/50 border border-[#059669]/60 text-emerald-400"
                  : "bg-[#78350F]/50 border border-[#D97706]/60 text-amber-400"
              }`}
            >
              {missingAssigneeTasks.length === 0 ? (
                <Check className="h-5 w-5 stroke-[2.5]" />
              ) : (
                <UserPlus className="h-5 w-5 stroke-[2.5]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Assigned</h4>
                {quickAssignFilter === "unassigned" ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 uppercase">
                    Filter Active
                  </span>
                ) : (
                  missingAssigneeTasks.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {missingAssigneeTasks.length}
                    </span>
                  )
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {missingAssigneeTasks.length === 0 ? (
                  <span className="text-emerald-400 font-medium">All {totalTasks} tasks assigned</span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-200 font-mono">{missingAssigneeTasks.length}</span>{" "}
                    tasks missing assignee{" "}
                    <span className="text-slate-500 font-normal">({assignedTasksCount} assigned)</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Card 3: Effort */}
          <div
            id="wbs-kpi-card-effort"
            onClick={() => setShowDetailedEvm((prev) => !prev)}
            className={`bg-[#0B0F19] border rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs transition-colors cursor-pointer ${
              showDetailedEvm
                ? "border-sky-500/80 bg-sky-950/15 ring-1 ring-sky-500/40"
                : "border-[#1E293B] hover:border-amber-500/50"
            }`}
            title="Click to toggle Detailed EVM & Hours columns in the table"
          >
            <div className="h-10 w-10 rounded-lg bg-[#78350F]/50 border border-[#D97706]/60 flex items-center justify-center shrink-0 text-amber-400">
              <Zap className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Effort</h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalEffortHours.toLocaleString()}h
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                <span className="font-bold text-amber-300 font-mono">{totalEffortHours.toLocaleString()} hrs</span>{" "}
                total estimated{" "}
                <span className="text-slate-500 font-normal">
                  {missingEffortTasks.length > 0
                    ? `(${missingEffortTasks.length} unestimated)`
                    : `(${totalActualHours.toLocaleString()}h logged)`}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Unassigned Filter Banner */}
      {quickAssignFilter === "unassigned" && (
        <div className="px-4 sm:px-5 py-2 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-amber-400" />
            <span>
              Showing tasks missing an assignee (<strong>{missingAssigneeTasks.length}</strong> tasks)
            </span>
          </div>
          <button
            onClick={() => setQuickAssignFilter("all")}
            className="text-[11px] font-semibold text-amber-300 hover:text-white underline cursor-pointer"
          >
            Clear filter / Show all
          </button>
        </div>
      )}

      {/* 4. Tab Views Router */}
      {activeTab === "List" && (
        <div className="px-4 sm:px-5 pb-5">
          {/* Smart Space-Saving WBS Hierarchy Ribbon & Nomenclature Controls */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Hierarchy:
              </span>
              {[
                { type: "Milestone" as WbsType, symbol: "◆", acronym: "M", label: "Milestone", count: wbsItems.filter((i) => i.type === "Milestone").length, dot: "bg-amber-400", color: "text-amber-300", border: "border-amber-500/30" },
                { type: "Epic" as WbsType, symbol: "⚡", acronym: "E", label: "Epic", count: wbsItems.filter((i) => i.type === "Epic").length, dot: "bg-purple-400", color: "text-purple-300", border: "border-purple-500/30" },
                { type: "Feature" as WbsType, symbol: "✦", acronym: "F", label: "Feature", count: wbsItems.filter((i) => i.type === "Feature").length, dot: "bg-blue-400", color: "text-blue-300", border: "border-blue-500/30" },
                { type: "User Story" as WbsType, symbol: "📖", acronym: "S", label: "Story", count: wbsItems.filter((i) => i.type === "User Story").length, dot: "bg-emerald-400", color: "text-emerald-300", border: "border-emerald-500/30" },
                { type: "Task" as WbsType, symbol: "☑", acronym: "T", label: "Task", count: wbsItems.filter((i) => i.type === "Task").length, dot: "bg-cyan-400", color: "text-cyan-300", border: "border-cyan-500/30" },
                { type: "Subtask" as WbsType, symbol: "↳", acronym: "sub", label: "Subtask", count: wbsItems.filter((i) => i.type === "Subtask").length, dot: "bg-slate-400", color: "text-slate-300", border: "border-slate-600/30" },
              ].map((lvl, index, arr) => (
                <React.Fragment key={lvl.type}>
                  <button
                    type="button"
                    onClick={() => setSelectedLevelFilter(selectedLevelFilter === lvl.type ? "ALL" : lvl.type)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer text-[11px] font-medium border ${
                      selectedLevelFilter === lvl.type
                        ? "bg-slate-800 border-sky-400 text-white shadow-xs ring-1 ring-sky-400/50"
                        : "hover:bg-slate-900 border-[#1E293B] text-slate-300 hover:text-white"
                    }`}
                    title={`Filter view by ${lvl.label}s (Click to toggle)`}
                  >
                    <span className="text-xs leading-none">{lvl.symbol}</span>
                    <span className={lvl.color}>{lvl.label}</span>
                    <span className="font-mono text-[10px] text-slate-500">({lvl.count})</span>
                  </button>
                  {index < arr.length - 1 && <span className="text-slate-600 text-[10px]">›</span>}
                </React.Fragment>
              ))}
              {selectedLevelFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter("ALL")}
                  className="text-[10px] text-sky-400 hover:underline ml-1 cursor-pointer font-medium"
                >
                  Reset filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-mono">Nomenclature:</span>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setNomenclatureStyle("smart")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    nomenclatureStyle === "smart"
                      ? "bg-sky-600 text-white font-semibold shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Clear Names: ◆ Milestone, ⚡ Epic, ✦ Feature, 📖 Story, ☑ Task, ↳ Subtask"
                >
                  Smart Names
                </button>
                <button
                  type="button"
                  onClick={() => setNomenclatureStyle("micro")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    nomenclatureStyle === "micro"
                      ? "bg-sky-600 text-white font-semibold shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Ultra-compact Micro Codes: ◆ M, ⚡ E, ✦ F, 📖 S, ☑ T, ↳ sub"
                >
                  Micro (M/E/F/S/T)
                </button>
              </div>

              {/* Status & Progress Rules Config Button */}
              <button
                type="button"
                onClick={() => {
                  setFocusedStatusForConfig(undefined);
                  setIsStatusManagerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs ml-1"
                title="Configure custom workflow statuses and automatic progress percentages"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Status & Progress Rules</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/30 text-white">
                  {statusConfigs.length}
                </span>
              </button>
            </div>
          </div>

          {/* Status Group Sections */}
          {statusGroups.map((group) => {
            const isGroupOpen = expandedSections[group.key] ?? true;

            // Filter items by level if selectedLevelFilter is active
            const visibleItems = selectedLevelFilter === "ALL"
              ? group.items
              : group.items.filter((i) => i.type === selectedLevelFilter);

            return (
              <div key={group.key} id={`wbs-section-${group.key}`} className="mb-6 last:mb-0">
                {/* 4A. Group Header Pill with Automatic Progress Indicator */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <button
                    onClick={() => toggleSection(group.key)}
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
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 ml-0.5">
                      {group.progressPercent}%
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono font-medium ml-1">
                    {group.items.length}
                  </span>

                  {group.description && (
                    <span className="hidden md:inline-block text-[11px] text-slate-500 ml-1.5 font-normal italic">
                      — {group.description}
                    </span>
                  )}

                  <div className="flex items-center gap-1 ml-1 text-slate-500 hover:text-slate-300">
                    <button
                      onClick={() => {
                        setFocusedStatusForConfig(group.key);
                        setIsStatusManagerOpen(true);
                      }}
                      className="p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-sky-300"
                      title={`Configure ${group.label} progress rule (${group.progressPercent}%) & options`}
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
                    <table className="w-full text-left text-xs text-[#E2E8F0] border-collapse min-w-[620px]">
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
                              {group.key === "Backlog"
                                ? "No tasks currently in Backlog"
                                : `No tasks currently in ${group.label}`}
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            // Find all items that should appear at the top-level of this status group
                            const topLevelItems = visibleItems.filter((item) => {
                              const pId = getParentId(item, wbsItems);
                              if (!pId) return true;
                              // If parent is not in this group's items, treat this item as top-level in this section
                              return !visibleItems.some((i) => i.id === pId);
                            });

                            return topLevelItems.map((item) =>
                              renderDeliverableRow(item, 0, group.status)
                            );
                          })()
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
                        <span>{group.key === "Backlog" ? "Add to Backlog" : "Add Task"}</span>
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
          <div className="flex items-start gap-3 min-w-max pb-2">
            {statusGroups.map((col) => (
              <div
                key={col.key}
                className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 flex flex-col h-[520px] w-72 shrink-0"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#1E293B]">
                  <div className="flex items-center gap-1.5">
                    {renderStatusIcon(col.status)}
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {col.label}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {col.progressPercent}%
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141C2E] text-slate-300 border border-slate-700">
                    {col.items.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {col.items.map((item) => {
                    const nom = getCompactNomenclature(item.type);
                    const itemAssignees = getItemAssignees(item, stakeholders);
                    return (
                      <div
                        key={item.id}
                        onClick={() => onOpenEditModal(item)}
                        className="p-3 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-sky-500/50 transition-all cursor-pointer shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${nom.bgColor} ${nom.color} ${nom.borderColor}`}>
                              <span className="text-[10px] leading-none">{nom.symbol}</span>
                              <span>{nom.short}</span>
                            </span>
                            <span className="font-mono text-[10px] text-sky-400">{item.wbsCode}</span>
                          </div>
                          {renderPriorityFlag(item)}
                        </div>
                        <h5 className="text-xs font-semibold text-white line-clamp-2">{item.title}</h5>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-[#1E293B]/40">
                          <span className="text-[#F87171] font-mono">{formatShortDate(item.dueDate)}</span>
                          {itemAssignees.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-1">
                                {itemAssignees.slice(0, 2).map((s) => (
                                  <span key={s.id} className="h-3.5 w-3.5 rounded-full bg-sky-500/30 text-[8px] flex items-center justify-center text-sky-300 font-bold">
                                    {s.name.charAt(0)}
                                  </span>
                                ))}
                              </div>
                              <span className="truncate max-w-[80px] text-slate-300 text-[10px]">
                                {itemAssignees.length === 1 ? itemAssignees[0].name : `${itemAssignees.length} assigned`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[10px]">Unassigned</span>
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

            {/* Add Status Column Action Tile */}
            <div
              onClick={() => {
                setFocusedStatusForConfig(undefined);
                setIsStatusManagerOpen(true);
              }}
              className="bg-[#0B0F19]/40 border-2 border-dashed border-[#1E293B] hover:border-purple-500/60 rounded-xl p-4 flex flex-col items-center justify-center gap-3 h-[520px] transition-all cursor-pointer group text-slate-500 hover:text-purple-300 w-72 shrink-0"
            >
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-300 group-hover:text-white">
                  Add Status Column
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Custom status & auto progress %
                </p>
              </div>
            </div>
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
                  {totalEffortHours.toLocaleString()}h
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

      {/* Custom Status & Progress Manager Modal */}
      <StatusManagerModal
        isOpen={isStatusManagerOpen}
        onClose={() => {
          setIsStatusManagerOpen(false);
          setFocusedStatusForConfig(undefined);
        }}
        statusConfigs={statusConfigs}
        onUpdateConfigs={(newConfigs) => {
          if (onUpdateStatusConfigs) {
            onUpdateStatusConfigs(newConfigs);
          }
        }}
        onApplyStatusProgressToTasks={onApplyStatusProgressToTasks}
        onSyncAllTasks={onSyncAllTasks}
        wbsItems={wbsItems}
        initialSelectedStatusKey={focusedStatusForConfig}
      />
    </div>
  );
};
