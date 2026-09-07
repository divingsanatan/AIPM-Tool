import React, { useState, useRef, useMemo } from "react";
import {
  WbsItem,
  WbsType,
  WorkItemStatus,
  Stakeholder,
  ProjectDocument,
  PriorityLevel,
  GlobalFilterState,
  StatusConfig,
} from "../types";
import {
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Upload,
  FileText,
  Loader2,
  DollarSign,
  User,
  Flag,
  X,
  UploadCloud,
  FileCheck,
  Calculator,
  GitBranch,
  ArrowUpRight,
  PlusCircle,
  Info,
} from "lucide-react";
import {
  generateNextWbsChildCode,
  suggestChildType,
  getChildTypeLabel,
  getHierarchyLevelInfo,
  getWbsTypeFriendlyName,
  getParentId,
} from "../utils/wbsRollup";
import { getItemPriority } from "../utils/filterUtils";
import {
  DEFAULT_STATUS_CONFIGS,
  getStatusConfig,
  getProgressForStatus,
} from "../utils/statusConfig";
import { WbsCleanTree } from "./WbsCleanTree";
import { MultiStakeholderSelect } from "./MultiStakeholderSelect";

interface WbsViewProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  documents: ProjectDocument[];
  onAddWbsItem: (item: WbsItem) => void;
  onUpdateWbsItem: (item: WbsItem) => void;
  onDeleteWbsItem: (id: string) => void;
  onBatchAddWbsItems: (items: WbsItem[]) => void;
  globalFilter?: GlobalFilterState;
  onUpdateGlobalFilter?: (updates: Partial<GlobalFilterState>) => void;
  statusConfigs?: StatusConfig[];
  onUpdateStatusConfigs?: (configs: StatusConfig[]) => void;
  onSyncAllTasks?: () => void;
  onApplyStatusProgressToTasks?: (statusKey: string, newProgress: number) => void;
}

export const WbsView: React.FC<WbsViewProps> = ({
  wbsItems,
  stakeholders,
  documents,
  onAddWbsItem,
  onUpdateWbsItem,
  onDeleteWbsItem,
  onBatchAddWbsItems,
  globalFilter,
  onUpdateGlobalFilter,
  statusConfigs = DEFAULT_STATUS_CONFIGS,
  onUpdateStatusConfigs,
  onSyncAllTasks,
  onApplyStatusProgressToTasks,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    "wbs-1": true,
    "wbs-1-1": true,
    "wbs-2": true,
    "wbs-2-1": true,
    "wbs-2-1-1": true,
    "wbs-2-1-1-1": true,
    "wbs-2-1-1-1-1": true,
    "wbs-2-2": true,
    "wbs-3": true,
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WbsItem | null>(null);
  const [isAiDocParserOpen, setIsAiDocParserOpen] = useState(false);
  const [docTextToParse, setDocTextToParse] = useState("");
  const [docTitleToParse, setDocTitleToParse] = useState("");
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<WbsItem[] | null>(null);
  const [isDocDragging, setIsDocDragging] = useState(false);
  const [droppedDocFile, setDroppedDocFile] = useState<{ name: string; size: number } | null>(null);
  const wbsFileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessWbsDocFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text !== undefined) {
        setDocTextToParse(text);
        if (!docTitleToParse.trim()) {
          const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          const formattedTitle = baseName
            .split(" ")
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          setDocTitleToParse(formattedTitle);
        }
        setDroppedDocFile({ name: file.name, size: file.size });
      }
    };
    reader.readAsText(file);
  };

  // New item form state
  const [formData, setFormData] = useState<Partial<WbsItem>>({
    title: "",
    wbsCode: "",
    type: "Task",
    status: "To Do",
    priority: "Medium",
    parentId: null,
    estimatedHours: 40,
    actualHours: 0,
    plannedBudget: 5000,
    actualCost: 0,
    progressPercent: 0,
    assignedStakeholderId: stakeholders[0]?.id || "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    isCriticalPath: false,
    description: "",
  });

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStakeholder = (id?: string) => {
    return stakeholders.find((s) => s.id === id);
  };

  // Automated Roll-up Summary Statistics
  const directChildrenCountMap = new Map<string, number>();
  wbsItems.forEach((item) => {
    const pId = getParentId(item, wbsItems);
    if (pId) {
      directChildrenCountMap.set(pId, (directChildrenCountMap.get(pId) || 0) + 1);
    }
  });

  const leafItems = wbsItems.filter((i) => !directChildrenCountMap.has(i.id));
  const parentItems = wbsItems.filter((i) => (directChildrenCountMap.get(i.id) || 0) > 0);

  const totalRolledHours = leafItems.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
  const totalRolledBudget = leafItems.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
  const totalActualHours = leafItems.reduce((sum, i) => sum + (Number(i.actualHours) || 0), 0);
  const totalActualCost = leafItems.reduce((sum, i) => sum + (Number(i.actualCost) || 0), 0);

  const handleOpenAddSubtask = (parentItem: WbsItem) => {
    const nextCode = generateNextWbsChildCode(parentItem, wbsItems);
    const nextType = suggestChildType(parentItem.type);
    const defaultStatus: WorkItemStatus = "To Do";
    setFormData({
      title: "",
      wbsCode: nextCode,
      type: nextType,
      status: defaultStatus,
      priority: parentItem.priority || "Medium",
      parentId: parentItem.id,
      estimatedHours: 20,
      actualHours: 0,
      plannedBudget: 3000,
      actualCost: 0,
      progressPercent: getProgressForStatus(defaultStatus, statusConfigs),
      assignedStakeholderId: parentItem.assignedStakeholderId || stakeholders[0]?.id || "",
      startDate: parentItem.startDate || new Date().toISOString().split("T")[0],
      dueDate: parentItem.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      isCriticalPath: parentItem.isCriticalPath || false,
      description: "",
    });
    setExpandedParents((prev) => ({ ...prev, [parentItem.id]: true }));
    setIsAddModalOpen(true);
  };

  // Status badges using dynamic status configuration
  const getStatusBadge = (status: WorkItemStatus) => {
    const cfg = getStatusConfig(status, statusConfigs);
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
        <span>{cfg.label}</span>
        <span className="text-[10px] font-mono opacity-80">({cfg.progressPercent}%)</span>
      </span>
    );
  };

  // Priority badges
  const getPriorityBadge = (priority?: PriorityLevel) => {
    const level = priority || "Medium";
    switch (level) {
      case "Critical":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Critical
          </span>
        );
      case "High":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            High
          </span>
        );
      case "Medium":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30">
            Medium
          </span>
        );
      case "Low":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-700/40 text-slate-300 border border-slate-600/40">
            Low
          </span>
        );
    }
  };

  // Level badges
  const getTypeBadge = (type: WbsType) => {
    const map: Record<WbsType, string> = {
      Milestone: "bg-purple-900/60 text-purple-300 border-purple-700/60 font-bold",
      Epic: "bg-indigo-900/60 text-indigo-300 border-indigo-700/60 font-semibold",
      Feature: "bg-blue-900/60 text-blue-300 border-blue-700/60",
      "User Story": "bg-cyan-900/60 text-cyan-300 border-cyan-700/60",
      Task: "bg-slate-800 text-slate-300 border-slate-700",
      Subtask: "bg-slate-850 text-slate-400 border-slate-750",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] border font-mono ${map[type] || "bg-slate-800"}`}>
        {type}
      </span>
    );
  };

  const activeStatus = globalFilter?.status !== undefined ? globalFilter.status : filterStatus;
  const activeAssignee = globalFilter?.assigneeId || "ALL";
  const activePriority = globalFilter?.priority || "ALL";
  const activeSearch = (globalFilter?.searchQuery !== undefined && globalFilter.searchQuery.length > 0)
    ? globalFilter.searchQuery
    : searchQuery;

  const isGlobalFilterActive =
    activeStatus !== "ALL" ||
    activeAssignee !== "ALL" ||
    activePriority !== "ALL" ||
    Boolean(activeSearch.trim().length > 0);

  const isDirectMatch = (item: WbsItem) => {
    if (activeStatus !== "ALL" && item.status !== activeStatus) return false;
    if (activeAssignee !== "ALL") {
      const allItemAssigneeIds = [
        ...(item.assignedStakeholderIds || []),
        ...(item.assignedStakeholderId ? [item.assignedStakeholderId] : []),
        ...(item.contributorStakeholderIds || []),
      ];
      if (activeAssignee === "UNASSIGNED") {
        if (allItemAssigneeIds.length > 0) return false;
      } else if (!allItemAssigneeIds.includes(activeAssignee)) {
        return false;
      }
    }
    if (activePriority !== "ALL") {
      if (getItemPriority(item) !== activePriority) return false;
    }
    if (filterType !== "ALL" && item.type !== filterType) return false;
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCode = item.wbsCode.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDesc) return false;
    }
    return true;
  };

  const matchingItemIds = useMemo(() => {
    return new Set(wbsItems.filter(isDirectMatch).map((i) => i.id));
  }, [wbsItems, activeStatus, activeAssignee, activePriority, filterType, activeSearch]);

  const hasMatchingDescendant = (itemId: string): boolean => {
    const children = wbsItems.filter((i) => getParentId(i, wbsItems) === itemId);
    for (const child of children) {
      if (matchingItemIds.has(child.id) || hasMatchingDescendant(child.id)) {
        return true;
      }
    }
    return false;
  };

  // Filtered items passed to tree & views
  const filteredItems = useMemo(() => {
    if (isGlobalFilterActive || filterType !== "ALL") {
      return wbsItems.filter(
        (item) => matchingItemIds.has(item.id) || hasMatchingDescendant(item.id)
      );
    }
    return wbsItems;
  }, [wbsItems, isGlobalFilterActive, filterType, matchingItemIds]);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.wbsCode?.trim()) return;

    const assigned = getStakeholder(formData.assignedStakeholderId);
    const hourlyRate = assigned?.hourlyRate || 125;
    const actualHours = Number(formData.actualHours) || 0;
    const actualCost = actualHours * hourlyRate;

    const newItem: WbsItem = {
      id: `wbs-${Date.now()}`,
      wbsCode: formData.wbsCode.trim(),
      title: formData.title.trim(),
      type: formData.type as WbsType,
      parentId: formData.parentId || null,
      status: formData.status as WorkItemStatus,
      priority: (formData.priority as PriorityLevel) || "Medium",
      estimatedHours: Number(formData.estimatedHours) || 0,
      actualHours: actualHours,
      plannedBudget: Number(formData.plannedBudget) || 0,
      actualCost: actualCost,
      progressPercent: Number(formData.progressPercent) || 0,
      assignedStakeholderId: formData.assignedStakeholderId || (formData.assignedStakeholderIds?.[0] || undefined),
      assignedStakeholderIds: formData.assignedStakeholderIds && formData.assignedStakeholderIds.length > 0
        ? formData.assignedStakeholderIds
        : formData.assignedStakeholderId
        ? [formData.assignedStakeholderId]
        : [],
      contributorStakeholderIds: formData.assignedStakeholderIds && formData.assignedStakeholderIds.length > 1
        ? formData.assignedStakeholderIds.slice(1)
        : [],
      startDate: formData.startDate || new Date().toISOString().split("T")[0],
      dueDate: formData.dueDate || new Date().toISOString().split("T")[0],
      isCriticalPath: Boolean(formData.isCriticalPath),
      description: formData.description || "",
    };

    onAddWbsItem(newItem);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const assigned = getStakeholder(editingItem.assignedStakeholderId);
    const hourlyRate = assigned?.hourlyRate || 125;
    const actualHours = Number(editingItem.actualHours) || 0;
    const updatedActualCost = actualHours * hourlyRate;

    const updated: WbsItem = {
      ...editingItem,
      estimatedHours: Number(editingItem.estimatedHours) || 0,
      plannedBudget: Number(editingItem.plannedBudget) || 0,
      actualCost: updatedActualCost,
      assignedStakeholderId: editingItem.assignedStakeholderId || (editingItem.assignedStakeholderIds?.[0] || undefined),
      assignedStakeholderIds: editingItem.assignedStakeholderIds && editingItem.assignedStakeholderIds.length > 0
        ? editingItem.assignedStakeholderIds
        : editingItem.assignedStakeholderId
        ? [editingItem.assignedStakeholderId]
        : [],
      contributorStakeholderIds: editingItem.assignedStakeholderIds && editingItem.assignedStakeholderIds.length > 1
        ? editingItem.assignedStakeholderIds.slice(1)
        : [],
    };

    onUpdateWbsItem(updated);
    setEditingItem(null);
  };

  // Document parser call
  const handleParseDocument = async () => {
    if (!docTextToParse.trim() || isParsingDoc) return;
    setIsParsingDoc(true);

    try {
      const res = await fetch("/api/gemini/parse-wbs-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: docTextToParse,
          documentTitle: docTitleToParse || "Project Work Breakdown",
        }),
      });

      if (!res.ok) throw new Error("Failed to parse document with Gemini");
      const data = await res.json();
      const items: WbsItem[] = (data.items || []).map((raw: any, idx: number) => ({
        id: `wbs-parsed-${Date.now()}-${idx}`,
        wbsCode: raw.wbsCode || `9.${idx + 1}`,
        title: raw.title || "Parsed Deliverable",
        type: (raw.type as WbsType) || "Task",
        parentId: raw.parentId || null,
        status: (raw.status as WorkItemStatus) || "To Do",
        estimatedHours: Number(raw.estimatedHours) || 40,
        actualHours: Number(raw.actualHours) || 0,
        plannedBudget: Number(raw.plannedBudget) || 4000,
        actualCost: Number(raw.actualCost) || 0,
        progressPercent: Number(raw.progressPercent) || 0,
        assignedStakeholderId: stakeholders[idx % stakeholders.length]?.id,
        startDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        description: raw.description || "",
      }));

      setParsedPreview(items);
    } catch (err: any) {
      alert(`Error parsing document: ${err.message}`);
    } finally {
      setIsParsingDoc(false);
    }
  };

  const handleConfirmParsedImport = () => {
    if (parsedPreview && parsedPreview.length > 0) {
      onBatchAddWbsItems(parsedPreview);
      setParsedPreview(null);
      setDocTextToParse("");
      setIsAiDocParserOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Import / Add buttons */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Work Breakdown Structure (WBS)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                100% Rule Decomposition
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Hierarchical management of Milestones, Epics, Features, User Stories, Tasks, and Subtasks with real-time labor tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="ai-parse-wbs-doc-btn"
              onClick={() => setIsAiDocParserOpen(true)}
              className="px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>Import WBS from Document</span>
            </button>
            <button
              id="add-wbs-item-btn"
              onClick={() => {
                setFormData({
                  title: "",
                  wbsCode: `${wbsItems.length + 1}.0`,
                  type: "Task",
                  status: "To Do",
                  parentId: null,
                  estimatedHours: 40,
                  actualHours: 0,
                  plannedBudget: 6000,
                  actualCost: 0,
                  progressPercent: 0,
                  assignedStakeholderId: stakeholders[0]?.id || "",
                  startDate: new Date().toISOString().split("T")[0],
                  dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
                  isCriticalPath: false,
                  description: "",
                });
                setIsAddModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Work Item</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-3 pt-3 border-t border-[#1E293B] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[#94A3B8] font-bold text-[10px] uppercase font-mono flex items-center gap-1">
              <Filter className="h-3 w-3 text-[#38BDF8]" /> Status:
            </span>
            {["ALL", "Done", "Demoable", "Blocked", "In Progress", "To Do", "Backlog"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  if (onUpdateGlobalFilter) {
                    onUpdateGlobalFilter({ status: st });
                  }
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  activeStatus === st
                    ? "bg-[#38BDF8] text-[#0F172A] font-bold shadow-xs"
                    : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800"
                }`}
              >
                {st === "Demoable" ? "Demo Ready" : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#060911] border border-[#1E293B] text-[#E2E8F0] rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#38BDF8] font-mono"
            >
              <option value="ALL">All Levels</option>
              <option value="Milestone">Milestone</option>
              <option value="Epic">Epic</option>
              <option value="Feature">Feature</option>
              <option value="User Story">User Story</option>
              <option value="Task">Task</option>
              <option value="Subtask">Subtask</option>
            </select>

            <div className="relative flex-1 md:w-56">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search WBS..."
                value={activeSearch}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onUpdateGlobalFilter) {
                    onUpdateGlobalFilter({ searchQuery: e.target.value });
                  }
                }}
                className="w-full bg-[#060911] border border-[#1E293B] rounded pl-8 pr-3 py-1 text-xs text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              />
            </div>
          </div>
        </div>
      </div>



      {/* Clean WBS Tree & Deliverables Dashboard */}
      <WbsCleanTree
        wbsItems={filteredItems}
        stakeholders={stakeholders}
        onAddWbsItem={onAddWbsItem}
        onUpdateWbsItem={onUpdateWbsItem}
        onDeleteWbsItem={onDeleteWbsItem}
        statusConfigs={statusConfigs}
        onUpdateStatusConfigs={onUpdateStatusConfigs}
        onSyncAllTasks={onSyncAllTasks}
        onApplyStatusProgressToTasks={onApplyStatusProgressToTasks}
        onOpenAddModal={(parentId, statusPreset, parentItemArg) => {
          const parentItem = parentItemArg || (parentId ? wbsItems.find((i) => i.id === parentId) : null);
          if (parentItem) {
            handleOpenAddSubtask(parentItem);
            return;
          }
          const topMilestones = wbsItems.filter((i) => !getParentId(i, wbsItems));
          const effectiveStatus = statusPreset || "To Do";
          setFormData({
            title: "",
            wbsCode: `${topMilestones.length + 1}.0`,
            type: "Milestone",
            status: effectiveStatus,
            priority: "Medium",
            parentId: null,
            estimatedHours: 40,
            actualHours: 0,
            plannedBudget: 6000,
            actualCost: 0,
            progressPercent: getProgressForStatus(effectiveStatus, statusConfigs),
            assignedStakeholderId: stakeholders[0]?.id || "",
            startDate: new Date().toISOString().split("T")[0],
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
            isCriticalPath: false,
            description: "",
          });
          setIsAddModalOpen(true);
        }}
        onOpenEditModal={(item) => {
          setEditingItem(item);
        }}
      />

      {/* Add New WBS Item Modal */}
      {isAddModalOpen && (() => {
        const currentParent = formData.parentId ? wbsItems.find((i) => i.id === formData.parentId) : null;
        const currentTypeInfo = getHierarchyLevelInfo(formData.type as WbsType);
        const formTitle = currentParent
          ? `Create New ${formData.type === "User Story" ? "Story" : formData.type}`
          : `Create New ${formData.type === "User Story" ? "Story" : formData.type}`;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
            <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${currentTypeInfo.badgeBg}`}>
                    {currentTypeInfo.shortLabel}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white font-mono truncate">
                      {formTitle}
                    </h3>
                    {currentParent ? (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono truncate">
                        <span>Hierarchy: {currentParent.type}</span>
                        <span className="text-sky-400">➔</span>
                        <span className="text-white font-medium truncate">[{currentParent.wbsCode}] {currentParent.title}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">Top-Level Project Deliverable / Milestone</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNew} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
                {currentParent && (
                  <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-800/40 text-xs text-sky-200 flex items-start gap-2">
                    <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <span>Hierarchical Child Creation: </span>
                      <strong className="text-white">
                        {currentParent.type} ➔ {formData.type === "User Story" ? "Story" : formData.type}
                      </strong>
                      . This work item will be attached directly under <code className="bg-slate-900 px-1 py-0.5 rounded text-sky-300">[{currentParent.wbsCode}] {currentParent.title}</code> with automated 100% PMI cost and schedule roll-up.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Parent Deliverable / Hierarchy Attachment
                  </label>
                  <select
                    value={formData.parentId || ""}
                    onChange={(e) => {
                      const selectedParentId = e.target.value || null;
                      const parentItem = selectedParentId ? wbsItems.find((i) => i.id === selectedParentId) : null;
                      if (parentItem) {
                        const nextCode = generateNextWbsChildCode(parentItem, wbsItems);
                        const nextType = suggestChildType(parentItem.type);
                        setFormData({
                          ...formData,
                          parentId: parentItem.id,
                          wbsCode: nextCode,
                          type: nextType,
                          startDate: parentItem.startDate || formData.startDate,
                          dueDate: parentItem.dueDate || formData.dueDate,
                        });
                      } else {
                        const topLevels = wbsItems.filter((i) => !getParentId(i, wbsItems));
                        setFormData({
                          ...formData,
                          parentId: null,
                          wbsCode: `${topLevels.length + 1}.0`,
                          type: "Milestone",
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  >
                    <option value="">None (Top-Level Milestone / Project Phase)</option>
                    {wbsItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.wbsCode}] {item.title} ({item.type})
                      </option>
                    ))}
                  </select>
                  {formData.parentId ? (
                    <div className="mt-1.5 p-2 rounded-md bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-300 flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-sky-400" />
                      <span>
                        <strong>Automated 100% Roll-up Active:</strong> Estimated Hours and Planned Budget entered here will automatically sum into its parent deliverable and all ancestors.
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5 p-2 rounded-md bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300 flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-purple-400" />
                      <span>
                        Top-Level Milestone: Will act as a primary summary level. Child deliverables added beneath it will automatically roll up their estimates.
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">WBS Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.wbsCode}
                      onChange={(e) => setFormData({ ...formData, wbsCode: e.target.value })}
                      placeholder="e.g. 2.1.2"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">PMI Level Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as WbsType })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="Milestone">Milestone (Level 1: Project Phase / Gateway)</option>
                      <option value="Epic">Epic (Level 2: Major Strategic Deliverable)</option>
                      <option value="Feature">Feature (Level 3: Functional System Capability)</option>
                      <option value="User Story">User Story / Story (Level 4: Deliverable Slice)</option>
                      <option value="Task">Task (Level 5: Work Package)</option>
                      <option value="Subtask">Subtask (Level 6: Granular Implementation Step)</option>
                    </select>
                  </div>
                </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Work Item Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Configure AWS KMS Key Ring & Encryption Policy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                    <span>Workflow Status *</span>
                    <span className="text-[10px] text-sky-400 font-normal">
                      Auto: {getStatusConfig(formData.status, statusConfigs).progressPercent}%
                    </span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as WorkItemStatus;
                      const autoProgress = getProgressForStatus(newStatus, statusConfigs);
                      setFormData({
                        ...formData,
                        status: newStatus,
                        progressPercent: autoProgress,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {statusConfigs.map((cfg) => (
                      <option key={cfg.key} value={cfg.key}>
                        {cfg.label} ({cfg.progressPercent}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority Level *</label>
                  <select
                    value={formData.priority || "Medium"}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Multi-Stakeholder Assignee Picker */}
              <div>
                <MultiStakeholderSelect
                  stakeholders={stakeholders}
                  selectedIds={
                    formData.assignedStakeholderIds && formData.assignedStakeholderIds.length > 0
                      ? formData.assignedStakeholderIds
                      : formData.assignedStakeholderId
                      ? [formData.assignedStakeholderId]
                      : []
                  }
                  onChange={(ids) => {
                    setFormData({
                      ...formData,
                      assignedStakeholderIds: ids,
                      assignedStakeholderId: ids[0] || "",
                      contributorStakeholderIds: ids.slice(1),
                    });
                  }}
                  label="Assigned Stakeholders (Multiple members can be assigned)"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Est. Hours</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Act. Hours</label>
                  <input
                    type="number"
                    value={formData.actualHours}
                    onChange={(e) => setFormData({ ...formData, actualHours: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Planned Budget ($)</label>
                  <input
                    type="number"
                    value={formData.plannedBudget}
                    onChange={(e) => setFormData({ ...formData, plannedBudget: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                    <span>Progress %</span>
                    <span className="text-[10px] text-sky-400 font-normal">
                      Linked: {getStatusConfig(formData.status, statusConfigs).progressPercent}%
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.progressPercent}
                    onChange={(e) => setFormData({ ...formData, progressPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="criticalPathCheckbox"
                  checked={formData.isCriticalPath}
                  onChange={(e) => setFormData({ ...formData, isCriticalPath: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="criticalPathCheckbox" className="text-slate-300 font-medium cursor-pointer">
                  Tag as Critical Path item (directly impacts target project completion)
                </label>
              </div>

              <div className="pt-3.5 border-t border-[#1E293B] flex justify-end gap-2.5 shrink-0 bg-[#060911]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Create {formData.type === "User Story" ? "Story" : formData.type}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Edit WBS Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono">Edit WBS Item: {editingItem.wbsCode}</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {(() => {
                const directChildren = wbsItems.filter((i) => getParentId(i, wbsItems) === editingItem.id);
                const isParentNode = directChildren.length > 0;

                return (
                  <>
                    {/* Node Type Callout */}
                    {isParentNode ? (
                      <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-600/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono">
                              Σ AUTOMATED SUMMARY NODE
                            </span>
                            <span className="text-slate-300 text-xs font-semibold">
                              {directChildren.length} Child Deliverables
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenAddSubtask(editingItem);
                              setEditingItem(null);
                            }}
                            className="px-2 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Subtask</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Per PMI 100% Rule, Estimated Hours (<strong>{editingItem.estimatedHours}h</strong>) and Planned Budget (<strong>${(editingItem.plannedBudget || 0).toLocaleString()}</strong>) are automatically rolled up from child work packages.
                        </p>
                        {/* Subtask list preview */}
                        <div className="space-y-1.5 pt-2 border-t border-sky-800/40 max-h-32 overflow-y-auto pr-1">
                          <div className="text-[10px] uppercase font-mono text-sky-400 font-bold">Child Items:</div>
                          {directChildren.map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-sky-400 font-semibold">{child.wbsCode}</span>
                                <span className="text-slate-200 truncate">{child.title}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                                <span className="text-slate-300">{child.estimatedHours}h</span>
                                <span className="text-emerald-400">${(child.plannedBudget || 0).toLocaleString()}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(child)}
                                  className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer underline"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                            LOWEST WORK ITEM (DATA ENTRY NODE)
                          </span>
                        </div>
                        <p className="text-slate-300">
                          Enter time estimates and budget below. Because this is the lowest work package level, all values automatically roll up through parent epics and milestones.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={editingItem.title}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                          <span>Workflow Status</span>
                          <span className="text-[10px] text-sky-400 font-normal">
                            Auto: {getStatusConfig(editingItem.status, statusConfigs).progressPercent}%
                          </span>
                        </label>
                        <select
                          value={editingItem.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as WorkItemStatus;
                            const autoProgress = getProgressForStatus(newStatus, statusConfigs);
                            setEditingItem({
                              ...editingItem,
                              status: newStatus,
                              progressPercent: autoProgress,
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        >
                          {statusConfigs.map((cfg) => (
                            <option key={cfg.key} value={cfg.key}>
                              {cfg.label} ({cfg.progressPercent}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Priority Level</label>
                        <select
                          value={editingItem.priority || getItemPriority(editingItem)}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              priority: e.target.value as PriorityLevel,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                          <span>Progress %</span>
                          <span className="text-[10px] text-sky-400 font-normal">
                            Linked: {getStatusConfig(editingItem.status, statusConfigs).progressPercent}%
                          </span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editingItem.progressPercent}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, progressPercent: Number(e.target.value) })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Multi-Stakeholder Assignee Picker */}
                    <div>
                      <MultiStakeholderSelect
                        stakeholders={stakeholders}
                        selectedIds={
                          editingItem.assignedStakeholderIds && editingItem.assignedStakeholderIds.length > 0
                            ? editingItem.assignedStakeholderIds
                            : editingItem.assignedStakeholderId
                            ? [editingItem.assignedStakeholderId]
                            : []
                        }
                        onChange={(ids) => {
                          setEditingItem({
                            ...editingItem,
                            assignedStakeholderIds: ids,
                            assignedStakeholderId: ids[0] || "",
                            contributorStakeholderIds: ids.slice(1),
                          });
                        }}
                        label="Assigned Stakeholders (Multiple members can be assigned)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Actual Hours Logged</label>
                        <input
                          type="number"
                          value={editingItem.actualHours}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, actualHours: Number(e.target.value) })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Target Due Date</label>
                        <input
                          type="date"
                          value={editingItem.dueDate}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, dueDate: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Estimates: Editable for lowest items, Auto-calculated note for parent nodes */}
                    {!isParentNode ? (
                      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div>
                          <label className="block text-emerald-400 font-medium mb-1 flex items-center gap-1">
                            <span>Estimated Hours (Direct Entry)</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editingItem.estimatedHours}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, estimatedHours: Number(e.target.value) })
                            }
                            className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-emerald-300 font-mono focus:border-emerald-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-emerald-400 font-medium mb-1 flex items-center gap-1">
                            <span>Planned Budget ($)</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editingItem.plannedBudget}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, plannedBudget: Number(e.target.value) })
                            }
                            className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-emerald-300 font-mono focus:border-emerald-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-sky-950/20 border border-sky-800/40">
                        <div>
                          <label className="block text-sky-400 font-medium mb-1">
                            Estimated Hours (Automated Sum)
                          </label>
                          <div className="bg-slate-950/80 border border-sky-900 rounded-lg px-3 py-2 text-sky-300 font-mono font-bold flex items-center justify-between">
                            <span>Σ {editingItem.estimatedHours} hrs</span>
                            <span className="text-[10px] text-slate-400 font-normal">Rolled Up</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sky-400 font-medium mb-1">
                            Planned Budget (Automated Sum)
                          </label>
                          <div className="bg-slate-950/80 border border-sky-900 rounded-lg px-3 py-2 text-sky-300 font-mono font-bold flex items-center justify-between">
                            <span>Σ ${(editingItem.plannedBudget || 0).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Rolled Up</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Provide scope details, impediments, or criteria..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3.5 border-t border-[#1E293B] flex justify-end gap-2.5 shrink-0 bg-[#060911]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Document Parser Dialog */}
      {isAiDocParserOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-2xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-mono">AI WBS Document Deconstruction</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Paste or select a specification, SOW, or WBS draft to extract Milestones, Epics, Tasks & budget.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiDocParserOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Select from existing project docs */}
              {documents.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <label className="block text-slate-300 font-semibold mb-2">
                    Quick-load from Attached Project Documents:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setDocTitleToParse(doc.title);
                          setDocTextToParse(doc.content);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-400" />
                        <span className="truncate max-w-[200px]">{doc.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drag and Drop Zone for AI Parser */}
              <input
                ref={wbsFileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.markdown,.json,.csv,.doc,.docx,.pdf,.rtf"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessWbsDocFile(e.target.files[0]);
                  }
                }}
              />

              {!droppedDocFile ? (
                <div
                  onClick={() => wbsFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDocDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDocDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDocDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessWbsDocFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                    isDocDragging
                      ? "border-sky-400 bg-sky-500/10 scale-[1.01]"
                      : "border-slate-800 hover:border-sky-500/50 bg-slate-950/60 hover:bg-slate-950"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      isDocDragging ? "bg-sky-500/20 text-sky-400" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isDocDragging
                        ? "Drop your project file here"
                        : "Drag and drop a project file (.md, .txt, .json, .csv), or browse"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      AI will automatically deconstruct your scope into Milestones, Epics, Tasks, and Budgets
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-[220px]">
                          {droppedDocFile.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Loaded
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {droppedDocFile.size < 1024
                          ? `${droppedDocFile.size} B`
                          : `${(droppedDocFile.size / 1024).toFixed(1)} KB`} • Ready to parse
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => wbsFileInputRef.current?.click()}
                      className="text-[11px] font-mono text-sky-400 hover:text-sky-300 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDroppedDocFile(null);
                        if (wbsFileInputRef.current) wbsFileInputRef.current.value = "";
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-rose-400 px-2 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitleToParse}
                  onChange={(e) => setDocTitleToParse(e.target.value)}
                  placeholder="e.g. SOW Milestone Specification v1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Document Content (Markdown, Bulleted scope, or text specification)
                </label>
                <textarea
                  rows={7}
                  value={docTextToParse}
                  onChange={(e) => setDocTextToParse(e.target.value)}
                  placeholder="Paste your project charter, requirements, or WBS outline here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Parsed Preview */}
              {parsedPreview && (
                <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-800/60 space-y-2">
                  <div className="flex items-center justify-between text-blue-300 font-bold">
                    <span>Parsed {parsedPreview.length} WBS Items Ready to Import</span>
                    <span className="text-emerald-400 font-mono">100% Rule Aligned</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-slate-300 text-[11px] font-mono divide-y divide-slate-800">
                    {parsedPreview.map((item, i) => (
                      <div key={i} className="py-1 flex items-center justify-between">
                        <span>
                          {item.wbsCode} - {item.title} ({item.type})
                        </span>
                        <span className="text-blue-400 font-bold">${item.plannedBudget}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-[#1E293B] flex items-center justify-between shrink-0 bg-[#060911]">
              <span className="text-[11px] text-slate-500 font-mono">PMI WBS Practice Standard</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiDocParserOpen(false)}
                  className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                {parsedPreview ? (
                  <button
                    type="button"
                    onClick={handleConfirmParsedImport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Add to WBS</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isParsingDoc || !docTextToParse.trim()}
                    onClick={handleParseDocument}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                  >
                    {isParsingDoc ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Deconstructing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Parse with Gemini</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
