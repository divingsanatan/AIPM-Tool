import React, { useState, useEffect, useRef } from "react";
import {
  WbsItem,
  WbsType,
  WorkItemStatus,
  Stakeholder,
  PriorityLevel,
  StatusConfig,
  Sprint,
  Project,
} from "../types";
import {
  X,
  Maximize2,
  Minimize2,
  Calendar,
  Flag,
  User,
  Paperclip,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Check,
  Search,
  Folder,
  Plus,
  Play,
  PlayCircle,
  Clock,
  DollarSign,
  Layers,
  Milestone,
  CheckSquare,
  AlertCircle,
  FileCode,
  Wand2,
  Trash2,
  FolderPlus,
} from "lucide-react";
import {
  generateNextWbsChildCode,
  suggestChildType,
  getChildTypeLabel,
} from "../utils/wbsRollup";
import { getStatusConfig, getProgressForStatus } from "../utils/statusConfig";
import { DEFAULT_SPRINTS } from "../data/sprintsData";
import { DEFAULT_PROJECTS } from "../data/projectsData";
import { CreateProjectModal } from "./CreateProjectModal";
import { CreateSprintModal } from "./CreateSprintModal";

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: WbsItem, createAnother?: boolean) => void;
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  statusConfigs: StatusConfig[];
  sprints?: Sprint[];
  projects?: Project[];
  initialParentItem?: WbsItem | null;
  onOpenCreateProject?: () => void;
  onOpenCreateSprint?: (projectId?: string) => void;
  onAddNewProject?: (project: Project) => void;
  onAddNewSprint?: (sprint: Sprint) => void;
  activeProjectId?: string;
}

export const CreateWorkItemModal: React.FC<CreateWorkItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  wbsItems,
  stakeholders,
  statusConfigs,
  sprints = DEFAULT_SPRINTS,
  projects = DEFAULT_PROJECTS,
  initialParentItem = null,
  onOpenCreateProject,
  onOpenCreateSprint,
  onAddNewProject,
  onAddNewSprint,
  activeProjectId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"task" | "reminder">("task");

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WbsType>("Task");
  const [status, setStatus] = useState<WorkItemStatus>("Backlog");
  const [priority, setPriority] = useState<PriorityLevel>("Medium");
  const [assignedStakeholderIds, setAssignedStakeholderIds] = useState<string[]>(
    stakeholders[0] ? [stakeholders[0].id] : []
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Sprint & Hierarchy Allocation State - Default to Sprint 6 to match ClickUp workflow
  const [selectedSprintId, setSelectedSprintId] = useState<string>("sprint-6");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    initialParentItem ? initialParentItem.id : null
  );

  // In-modal Sub-modals for Project and Sprint creation
  const [isInternalProjectModalOpen, setIsInternalProjectModalOpen] = useState(false);
  const [isInternalSprintModalOpen, setIsInternalSprintModalOpen] = useState(false);
  const [internalSprintProjectId, setInternalSprintProjectId] = useState<string | undefined>(undefined);

  // Custom fields
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState<number>(16);
  const [actualHours, setActualHours] = useState<number>(0);
  const [plannedBudget, setPlannedBudget] = useState<number>(2400);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isCriticalPath, setIsCriticalPath] = useState<boolean>(false);
  const [wbsCode, setWbsCode] = useState<string>("1.1.1");

  // Checklist & Dependencies
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  // Dropdown Popovers
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  // Search in location popover
  const [locationSearch, setLocationSearch] = useState("");
  const locationRef = useRef<HTMLDivElement>(null);

  // AI drafting state
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Initialize or reset when modal opens or initialParentItem changes
  useEffect(() => {
    if (isOpen) {
      if (initialParentItem) {
        setSelectedParentId(initialParentItem.id);
        const nextType = suggestChildType(initialParentItem.type);
        setType(nextType);
        const nextCode = generateNextWbsChildCode(initialParentItem, wbsItems);
        setWbsCode(nextCode);
      } else {
        const rootItems = wbsItems.filter((i) => !i.parentId);
        const nextCode = `${rootItems.length + 1}.0`;
        setWbsCode(nextCode);
      }
      // Sync progress with status
      const initialProgress = getProgressForStatus("Backlog", statusConfigs);
      setProgressPercent(initialProgress);
    }
  }, [isOpen, initialParentItem, wbsItems, statusConfigs]);

  // Recalculate WBS code and suggested type when parent changes
  const handleSelectParent = (parentId: string | null) => {
    setSelectedParentId(parentId);
    if (parentId) {
      const parent = wbsItems.find((i) => i.id === parentId);
      if (parent) {
        const nextType = suggestChildType(parent.type);
        setType(nextType);
        const nextCode = generateNextWbsChildCode(parent, wbsItems);
        setWbsCode(nextCode);
      }
    } else {
      const rootItems = wbsItems.filter((i) => !i.parentId);
      setWbsCode(`${rootItems.length + 1}.0`);
    }
  };

  // Status selection updates linked progress
  const handleSelectStatus = (newStatus: WorkItemStatus) => {
    setStatus(newStatus);
    const autoProgress = getProgressForStatus(newStatus, statusConfigs);
    setProgressPercent(autoProgress);
    setIsStatusOpen(false);
  };

  // AI Description Generator
  const handleGenerateAiDescription = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const parentDeliverable = wbsItems.find((i) => i.id === selectedParentId);
      const sprintObj = sprints.find((s) => s.id === selectedSprintId);
      const taskName = title.trim() || "Implementation Task";

      const generated = `### Objective & Scope\nImplement ${taskName} to support ${
        parentDeliverable ? parentDeliverable.title : "the core system deliverables"
      } targeted for delivery in ${sprintObj ? sprintObj.name : "the upcoming sprint"}.\n\n### Acceptance Criteria\n- [ ] Functional validation and integration tests pass with 100% coverage.\n- [ ] Architecture aligns with zero-trust security and ISO/PMI quality benchmarks.\n- [ ] Code reviewed, documented, and approved for staging deployment.\n\n### Technical Implementation Notes\n- Integrate logging and telemetry monitoring.\n- Ensure idempotency and backward compatibility across dependent endpoints.`;

      setDescription(generated);
      setIsAiGenerating(false);
    }, 600);
  };

  // Add checklist item
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist((prev) => [
      ...prev,
      { id: `chk-${Date.now()}`, text: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText("");
  };

  // Apply template
  const handleApplyTemplate = (tmpl: {
    title: string;
    desc: string;
    type: WbsType;
    hours: number;
    budget: number;
  }) => {
    setTitle(tmpl.title);
    setDescription(tmpl.desc);
    setType(tmpl.type);
    setEstimatedHours(tmpl.hours);
    setPlannedBudget(tmpl.budget);
    setIsTemplatesOpen(false);
  };

  // Handle Form Submit
  const handleCreate = (createAnother = false) => {
    if (!title.trim()) return;

    const selectedSprint = sprints.find((s) => s.id === selectedSprintId);
    const selectedProj = projects.find(
      (p) => p.id === selectedSprint?.projectId || p.name === selectedSprint?.projectGroup
    );

    const newItem: WbsItem = {
      id: `wbs-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      wbsCode: wbsCode || `${wbsItems.length + 1}.0`,
      title: title.trim(),
      type,
      parentId: selectedParentId || null,
      status,
      priority,
      estimatedHours: Number(estimatedHours) || 0,
      actualHours: Number(actualHours) || 0,
      plannedBudget: Number(plannedBudget) || 0,
      actualCost: Number(actualHours) * (stakeholders.find((s) => s.id === assignedStakeholderIds[0])?.hourlyRate || 100),
      progressPercent,
      assignedStakeholderId: assignedStakeholderIds[0] || "",
      assignedStakeholderIds,
      startDate,
      dueDate,
      isCriticalPath,
      description: description.trim(),
      projectId: selectedProj?.id || selectedSprint?.projectId,
      projectName: selectedProj?.name || selectedSprint?.projectGroup,
      sprintId: selectedSprint?.id,
      sprintName: selectedSprint?.name,
      checklist: checklist.length > 0 ? checklist : undefined,
    };

    onSubmit(newItem, createAnother);

    if (createAnother) {
      setTitle("");
      setDescription("");
      setChecklist([]);
      // increment wbs code
      if (selectedParentId) {
        const parent = wbsItems.find((i) => i.id === selectedParentId);
        if (parent) setWbsCode(generateNextWbsChildCode(parent, [...wbsItems, newItem]));
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentStatusConfig = getStatusConfig(status, statusConfigs);
  const selectedSprint = sprints.find((s) => s.id === selectedSprintId);
  const selectedParent = wbsItems.find((i) => i.id === selectedParentId);

  // Grouped Sprints by Project
  const sprintGroups = sprints.reduce((acc, sprint) => {
    const grp = sprint.projectGroup || "General Sprints";
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(sprint);
    return acc;
  }, {} as Record<string, Sprint[]>);

  // Filtered lists for location selector
  const filteredSprints = sprints.filter((s) =>
    s.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    s.projectGroup.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filteredDeliverables = wbsItems.filter(
    (i) =>
      i.title.toLowerCase().includes(locationSearch.toLowerCase()) ||
      i.wbsCode.toLowerCase().includes(locationSearch.toLowerCase()) ||
      i.type.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className={`relative bg-[#111319] border border-[#232736] rounded-2xl w-full flex flex-col shadow-2xl text-slate-100 transition-all duration-200 overflow-hidden ${
          isExpanded ? "max-w-4xl min-h-[85vh]" : "max-w-2xl max-h-[92vh]"
        }`}
      >
        {/* Top Header & Tab Bar */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-[#1E2333] shrink-0 bg-[#0C0E14]">
          {/* Tabs */}
          <div className="flex items-center space-x-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("task")}
              className={`pb-3 relative transition-colors ${
                activeTab === "task"
                  ? "text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500 after:rounded-full"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Task
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reminder")}
              className={`pb-3 relative transition-colors ${
                activeTab === "reminder"
                  ? "text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500 after:rounded-full"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Reminder
            </button>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1C2030] transition-colors cursor-pointer"
              title={isExpanded ? "Collapse modal" : "Expand modal"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1C2030] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subheader: Location / Sprint & Deliverable Selector + Type Selector */}
        <div className="px-5 py-3 flex items-center gap-2.5 flex-wrap border-b border-[#1A1E2B] bg-[#0E1017]">
          {/* Location & Sprint/Deliverable Allocation Trigger */}
          <div className="relative" ref={locationRef}>
            <button
              type="button"
              onClick={() => {
                setIsLocationOpen(!isLocationOpen);
                setIsTypeOpen(false);
              }}
              className="bg-[#121623] hover:bg-[#181E2F] text-slate-200 px-3 py-1.5 rounded-lg border border-[#242C3F] flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors max-w-sm"
            >
              <span className="w-4 h-4 rounded-full border border-indigo-400 text-indigo-400 flex items-center justify-center shrink-0">
                <Play className="w-2 h-2 fill-current ml-0.5" />
              </span>
              <span className="truncate">
                {selectedSprint ? selectedSprint.name : "Select Sprint"}
                {selectedParent && (
                  <span className="text-slate-400 ml-1 font-mono text-[11px]">
                    · {selectedParent.wbsCode} {selectedParent.title}
                  </span>
                )}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 shrink-0" />
            </button>

            {/* Rich Allocation Dropdown (Matching Screenshot Exactly) */}
            {isLocationOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-84 sm:w-96 bg-[#0D111A] border border-[#212739] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Search Header */}
                <div className="p-2.5 border-b border-[#1E2333] bg-[#0A0D15]">
                  <div className="relative flex items-center bg-[#151927] border border-[#273046] rounded-lg px-2.5 py-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search sprints, epics, features..."
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto p-2 text-xs space-y-3">
                  {/* Recents Section */}
                  <div>
                    <div className="text-[11px] font-bold text-[#64748B] tracking-wider uppercase px-2.5 py-1">
                      RECENTS
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {sprints.slice(0, 3).map((sprint, idx) => {
                        const isSelected = selectedSprintId === sprint.id;
                        // Use green for first and third, purple for second to match screenshot pattern
                        const isGreen = !isSelected && idx % 2 === 0;
                        return (
                          <div
                            key={`recent-${sprint.id}`}
                            onClick={() => {
                              setSelectedSprintId(sprint.id);
                              setIsLocationOpen(false);
                            }}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#1F2244] text-white font-medium border border-[#3A4073]"
                                : "hover:bg-[#151927] text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "border-indigo-400 text-indigo-400"
                                    : isGreen
                                    ? "border-emerald-500/80 text-emerald-400"
                                    : "border-indigo-400/80 text-indigo-400"
                                }`}
                              >
                                <Play className="w-2 h-2 fill-current ml-0.5" />
                              </div>
                              <span className="truncate text-xs">{sprint.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {sprint.taskCount !== undefined && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {sprint.taskCount}
                                </span>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-indigo-300" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sprints Grouped by Projects (SHARED WITH ME & PROJECTS) */}
                  <div>
                    <div className="text-[11px] font-bold text-[#64748B] tracking-wider uppercase px-2.5 py-1 flex items-center justify-between">
                      <span>SHARED WITH ME & PROJECTS</span>
                    </div>

                    <div className="space-y-2 mt-1">
                      {projects.map((proj) => {
                        const projSprints = sprints.filter(
                          (s) => s.projectId === proj.id || s.projectGroup === proj.name
                        );
                        return (
                          <div key={proj.id} className="space-y-1">
                            <div className="flex items-center justify-between px-2.5 py-1 text-xs font-semibold text-slate-200 group">
                              <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-slate-400" />
                                <span>{proj.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenCreateSprint) {
                                    onOpenCreateSprint(proj.id);
                                  } else {
                                    setInternalSprintProjectId(proj.id);
                                    setIsInternalSprintModalOpen(true);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 px-1.5 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Sprint</span>
                              </button>
                            </div>

                            {/* Sprints Tree Under Project */}
                            <div className="border-l border-[#242C3F] ml-4 pl-3.5 space-y-1">
                              {projSprints.length > 0 ? (
                                projSprints.map((sprint) => {
                                  const isSelected = selectedSprintId === sprint.id;
                                  return (
                                    <div
                                      key={sprint.id}
                                      onClick={() => {
                                        setSelectedSprintId(sprint.id);
                                        setIsLocationOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                        isSelected
                                          ? "bg-[#1F2244] text-white font-medium border border-[#3A4073]"
                                          : "hover:bg-[#151927] text-slate-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <div className="w-4 h-4 rounded-full border border-indigo-400 text-indigo-400 flex items-center justify-center shrink-0">
                                          <Play className="w-2 h-2 fill-current ml-0.5" />
                                        </div>
                                        <span className="truncate text-xs">{sprint.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {sprint.taskCount !== undefined && (
                                          <span className="text-[11px] text-slate-400 font-mono">
                                            {sprint.taskCount}
                                          </span>
                                        )}
                                        {isSelected && <Check className="w-4 h-4 text-indigo-300" />}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-[11px] text-slate-500 italic py-1">
                                  No sprints yet. Click +Sprint to add one.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional WBS Deliverable Parent (Milestones, Epics & Features) */}
                  <div className="pt-2 border-t border-[#1E2333]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 font-semibold flex items-center justify-between">
                      <span>WBS Deliverable Parent</span>
                      {selectedParentId && (
                        <button
                          type="button"
                          onClick={() => handleSelectParent(null)}
                          className="text-xs text-sky-400 hover:underline cursor-pointer"
                        >
                          Clear Parent
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 mt-1 max-h-32 overflow-y-auto">
                      {filteredDeliverables
                        .filter((i) => i.type === "Milestone" || i.type === "Epic" || i.type === "Feature")
                        .slice(0, 5)
                        .map((item) => {
                          const isSelected = selectedParentId === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                handleSelectParent(item.id);
                                setIsLocationOpen(false);
                              }}
                              className={`flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-sky-600/20 text-sky-300 font-medium border border-sky-500/30"
                                  : "hover:bg-[#151927] text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-[10px] text-indigo-400 font-bold shrink-0">
                                  {item.wbsCode}
                                </span>
                                <span className="truncate">{item.title}</span>
                              </div>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                                {item.type}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Popover Footer: ClickUp Style + New Project & + New Sprint */}
                <div className="p-2 border-t border-[#1E2333] bg-[#0A0D15] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationOpen(false);
                      if (onOpenCreateProject) {
                        onOpenCreateProject();
                      } else {
                        setIsInternalProjectModalOpen(true);
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#151928] hover:bg-[#1E2438] border border-[#273046] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>New Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationOpen(false);
                      if (onOpenCreateSprint) {
                        onOpenCreateSprint(activeProjectId);
                      } else {
                        setInternalSprintProjectId(activeProjectId || "proj-flutter");
                        setIsInternalSprintModalOpen(true);
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#151928] hover:bg-[#1E2438] border border-[#273046] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>New Sprint</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Type Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsLocationOpen(false);
              }}
              className="bg-[#121623] hover:bg-[#181E2F] text-slate-200 px-3 py-1.5 rounded-lg border border-[#242C3F] flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
            >
              <span className="w-4 h-4 rounded-sm border border-indigo-400 text-indigo-400 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span>{type}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {isTypeOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5">
                {(["Milestone", "Epic", "Feature", "User Story", "Task", "Subtask"] as WbsType[]).map(
                  (t) => (
                    <div
                      key={t}
                      onClick={() => {
                        setType(t);
                        setIsTypeOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                        type === t
                          ? "bg-indigo-600/20 text-indigo-300 font-medium"
                          : "hover:bg-[#1B2030] text-slate-300"
                      }`}
                    >
                      <span>{t}</span>
                      {type === t && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Task Title Input */}
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task Name"
              className="w-full bg-transparent border-0 text-xl sm:text-2xl font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-0 px-0 py-1"
            />
          </div>

          {/* Task Description Input with AI Write Assistant */}
          <div className="relative group">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description, or write with AI"
              rows={isExpanded ? 6 : 3}
              className="w-full bg-transparent border-0 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-0 px-0 py-1 resize-none leading-relaxed"
            />
            {/* AI Assistant Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={isAiGenerating}
                onClick={handleGenerateAiDescription}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>{isAiGenerating ? "Drafting..." : "Write with AI"}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Property Pills Row */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {/* 1. Status Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsStatusOpen(!isStatusOpen);
                  setIsAssigneeOpen(false);
                  setIsPriorityOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${currentStatusConfig.badgeBg} ${currentStatusConfig.badgeText} ${currentStatusConfig.badgeBorder}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusConfig.dotColor}`} />
                <span className="uppercase">{currentStatusConfig.label}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {/* Status Popover */}
              {isStatusOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-1">
                    Workflow Status & Auto Progress
                  </div>
                  {statusConfigs.map((cfg) => (
                    <div
                      key={cfg.key}
                      onClick={() => handleSelectStatus(cfg.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                        status === cfg.key
                          ? `${cfg.badgeBg} ${cfg.badgeText} font-bold`
                          : "hover:bg-[#1B2030] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                        <span>{cfg.label}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">{cfg.progressPercent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Assignee Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAssigneeOpen(!isAssigneeOpen);
                  setIsStatusOpen(false);
                  setIsPriorityOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="bg-[#181B26] hover:bg-[#202534] text-slate-300 px-3 py-1.5 rounded-lg border border-[#2B3145] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {assignedStakeholderIds.length === 0
                    ? "Assignee"
                    : assignedStakeholderIds.length === 1
                    ? stakeholders.find((s) => s.id === assignedStakeholderIds[0])?.name || "Assignee"
                    : `${assignedStakeholderIds.length} Assignees`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Assignee Popover */}
              {isAssigneeOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-1.5 space-y-1 max-h-60 overflow-y-auto">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-1">
                    Assign Stakeholders
                  </div>
                  {stakeholders.map((s) => {
                    const isSelected = assignedStakeholderIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setAssignedStakeholderIds((prev) =>
                            isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30"
                            : "hover:bg-[#1B2030] text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-200 uppercase">
                            {s.name.slice(0, 2)}
                          </div>
                          <div className="truncate">
                            <div>{s.name}</div>
                            <div className="text-[10px] text-slate-400">${s.hourlyRate}/h</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Due Date Pill */}
            <div className="relative flex items-center">
              <label
                htmlFor="createTaskDueDateInput"
                className="bg-[#181B26] hover:bg-[#202534] text-slate-300 px-3 py-1.5 rounded-lg border border-[#2B3145] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{dueDate ? dueDate : "Due date"}</span>
              </label>
              <input
                id="createTaskDueDateInput"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="sr-only"
              />
            </div>

            {/* 4. Priority Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsPriorityOpen(!isPriorityOpen);
                  setIsStatusOpen(false);
                  setIsAssigneeOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="bg-[#181B26] hover:bg-[#202534] text-slate-300 px-3 py-1.5 rounded-lg border border-[#2B3145] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Flag
                  className={`w-3.5 h-3.5 ${
                    priority === "Critical"
                      ? "text-rose-400"
                      : priority === "High"
                      ? "text-amber-400"
                      : priority === "Medium"
                      ? "text-sky-400"
                      : "text-slate-400"
                  }`}
                />
                <span>{priority}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Priority Popover */}
              {isPriorityOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-40 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5">
                  {(["Critical", "High", "Medium", "Low"] as PriorityLevel[]).map((p) => (
                    <div
                      key={p}
                      onClick={() => {
                        setPriority(p);
                        setIsPriorityOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                        priority === p
                          ? "bg-indigo-600/20 text-indigo-300 font-medium"
                          : "hover:bg-[#1B2030] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Flag
                          className={`w-3.5 h-3.5 ${
                            p === "Critical"
                              ? "text-rose-400"
                              : p === "High"
                              ? "text-amber-400"
                              : p === "Medium"
                              ? "text-sky-400"
                              : "text-slate-400"
                          }`}
                        />
                        <span>{p}</span>
                      </div>
                      {priority === p && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. More Options Button (...) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(!isMoreMenuOpen);
                  setIsStatusOpen(false);
                  setIsAssigneeOpen(false);
                  setIsPriorityOpen(false);
                }}
                className="bg-[#181B26] hover:bg-[#202534] text-slate-300 px-2.5 py-1.5 rounded-lg border border-[#2B3145] text-xs font-medium flex items-center justify-center cursor-pointer transition-colors"
                title="More task options"
              >
                <span>•••</span>
              </button>

              {/* More Menu Popover */}
              {isMoreMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomFields(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1B2030] text-slate-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Time Estimate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChecklist(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1B2030] text-slate-300 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Checklist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomFields(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1B2030] text-slate-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Subtasks & Hierarchy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Checklist Section */}
          {showChecklist && (
            <div className="p-3 bg-[#0C0E14] border border-[#1E2333] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Checklist Items
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {checklist.filter((c) => c.completed).length}/{checklist.length}
                </span>
              </div>

              {/* Checklist list */}
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs py-1">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) =>
                        setChecklist((prev) =>
                          prev.map((c) => (c.id === item.id ? { ...c, completed: e.target.checked } : c))
                        )
                      }
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                    <span className={item.completed ? "line-through text-slate-500" : "text-slate-300"}>
                      {item.text}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setChecklist((prev) => prev.filter((c) => c.id !== item.id))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* New item input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                  placeholder="Add a checklist item..."
                  className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Fields Section (Custom Fields & WBS Parameters) */}
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                Fields
              </span>
              <button
                type="button"
                onClick={() => setShowCustomFields(!showCustomFields)}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-[#161925] hover:bg-[#1E2333] px-2.5 py-1 rounded-md border border-[#282F44] transition-colors cursor-pointer"
              >
                {showCustomFields ? "Hide custom fields" : "Show custom fields"}
              </button>
            </div>

            {showCustomFields && (
              <div className="p-3.5 bg-[#0C0E14] border border-[#1E2333] rounded-xl space-y-3 animate-in fade-in duration-150 text-xs">
                {/* WBS Code & Parent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">WBS ID Code</label>
                    <input
                      type="text"
                      value={wbsCode}
                      onChange={(e) => setWbsCode(e.target.value)}
                      className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">
                      Parent Deliverable (Roll-up)
                    </label>
                    <select
                      value={selectedParentId || ""}
                      onChange={(e) => handleSelectParent(e.target.value || null)}
                      className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Root Deliverable (No parent)</option>
                      {wbsItems
                        .filter((i) => i.type === "Milestone" || i.type === "Epic" || i.type === "Feature")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.wbsCode} {item.title} ({item.type})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Hours & Budget Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">Actual Hours</label>
                    <input
                      type="number"
                      value={actualHours}
                      onChange={(e) => setActualHours(Number(e.target.value))}
                      className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">Planned Budget ($)</label>
                    <input
                      type="number"
                      value={plannedBudget}
                      onChange={(e) => setPlannedBudget(Number(e.target.value))}
                      className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Progress % & Critical Path */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1 flex items-center justify-between">
                      <span>Progress Percentage</span>
                      <span className="text-[10px] text-indigo-400">
                        Auto: {currentStatusConfig.progressPercent}%
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={progressPercent}
                      onChange={(e) => setProgressPercent(Number(e.target.value))}
                      className="w-full bg-[#181C28] border border-[#2B3247] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={isCriticalPath}
                        onChange={(e) => setIsCriticalPath(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                      />
                      <span>Tag as Critical Path (directly impacts EVM finish)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-[#1E2333] flex items-center justify-between bg-[#0C0E14] shrink-0">
          {/* Left: Templates Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
              className="px-3 py-1.5 bg-[#181B26] hover:bg-[#202534] text-slate-300 rounded-lg text-xs font-medium border border-[#2B3145] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Templates</span>
            </button>

            {/* Templates Popover */}
            {isTemplatesOpen && (
              <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-1 font-semibold">
                  Engineering & PMI Templates
                </div>
                <div
                  onClick={() =>
                    handleApplyTemplate({
                      title: "Feature: REST & GraphQL Ingress Endpoint",
                      desc: "Develop and test API routing, schema validation, rate-limiting, and error handling for the new service.",
                      type: "Feature",
                      hours: 24,
                      budget: 3600,
                    })
                  }
                  className="p-2 rounded-lg hover:bg-[#1B2030] cursor-pointer"
                >
                  <div className="font-semibold text-white">API Ingress Feature</div>
                  <div className="text-[11px] text-slate-400">Endpoint, auth & test harness</div>
                </div>
                <div
                  onClick={() =>
                    handleApplyTemplate({
                      title: "Security: Zero-Trust IAM & Vault Policy Hardening",
                      desc: "Audit least-privilege policies, configure AWS KMS / HashiCorp Vault key rotation, and implement mTLS.",
                      type: "Task",
                      hours: 18,
                      budget: 2800,
                    })
                  }
                  className="p-2 rounded-lg hover:bg-[#1B2030] cursor-pointer"
                >
                  <div className="font-semibold text-white">Security & IAM Hardening</div>
                  <div className="text-[11px] text-slate-400">KMS key rotation & mTLS policy</div>
                </div>
                <div
                  onClick={() =>
                    handleApplyTemplate({
                      title: "Milestone: Pilot UAT & Architecture Gateway Sign-Off",
                      desc: "Formal stakeholder acceptance testing, compliance sign-off, and production cutover dry-run.",
                      type: "Milestone",
                      hours: 40,
                      budget: 6200,
                    })
                  }
                  className="p-2 rounded-lg hover:bg-[#1B2030] cursor-pointer"
                >
                  <div className="font-semibold text-white">UAT Sign-off Milestone</div>
                  <div className="text-[11px] text-slate-400">Formal PMI Gateway review</div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Attachment, Watchers, and Primary Create Task button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#1C2030] transition-colors cursor-pointer"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#1C2030] transition-colors flex items-center gap-1 cursor-pointer"
              title="Task watchers"
            >
              <Bell className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold text-slate-400">2</span>
            </button>

            {/* Split Create Task Button */}
            <div className="relative inline-flex rounded-lg shadow-md shadow-indigo-600/20">
              <button
                type="button"
                onClick={() => handleCreate(false)}
                disabled={!title.trim()}
                className="bg-[#6366F1] hover:bg-[#5558E6] text-white px-4 py-2 rounded-l-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Create {type}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
                disabled={!title.trim()}
                className="bg-[#5558E6] hover:bg-[#474BD6] text-white px-2 py-2 rounded-r-lg border-l border-indigo-400/30 text-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Create Options Dropdown */}
              {isCreateDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-[#12151F] border border-[#2A3146] rounded-xl shadow-2xl z-50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateDropdownOpen(false);
                      handleCreate(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1B2030] text-white"
                  >
                    Create {type}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateDropdownOpen(false);
                      handleCreate(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1B2030] text-indigo-300"
                  >
                    Create & Add Another
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Project Creation Modal */}
      {isInternalProjectModalOpen && (
        <CreateProjectModal
          isOpen={isInternalProjectModalOpen}
          onClose={() => setIsInternalProjectModalOpen(false)}
          onSubmit={(newProj) => {
            if (onAddNewProject) onAddNewProject(newProj);
            setIsInternalProjectModalOpen(false);
          }}
        />
      )}

      {/* Embedded Sprint Creation Modal */}
      {isInternalSprintModalOpen && (
        <CreateSprintModal
          isOpen={isInternalSprintModalOpen}
          onClose={() => setIsInternalSprintModalOpen(false)}
          onSubmit={(newSprint) => {
            if (onAddNewSprint) onAddNewSprint(newSprint);
            setSelectedSprintId(newSprint.id);
            setIsInternalSprintModalOpen(false);
          }}
          projects={projects}
          defaultProjectId={internalSprintProjectId}
        />
      )}
    </div>
  );
};
