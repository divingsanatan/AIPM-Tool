import React, { useState } from "react";
import {
  BarChart3,
  Layers,
  Users,
  ShieldAlert,
  Grid,
  GitPullRequest,
  FileText,
  FileCheck2,
  CalendarDays,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Folder,
  Play,
  GitFork,
  ChevronDown,
  ChevronRight,
  Inbox,
  FolderGit2,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { ActiveTab, Project, Sprint, WbsItem, RaidItem, ChangeRequest } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  projects: Project[];
  sprints: Sprint[];
  activeProjectId: string;
  selectedSprintId?: string | null;
  onSelectProject: (id: string) => void;
  onSelectSprint: (sprintId: string | null) => void;
  onOpenCreateProject?: () => void;
  onOpenCreateSprint?: (projectId?: string) => void;
  onOpenEditSprint?: (sprint: Sprint) => void;
  onDeleteSprint?: (sprint: Sprint) => void;
  onOpenEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onOpenCreateWorkItem?: () => void;
  onOpenAiAssistant?: () => void;
  criticalRisksCount?: number;
  blockedWbsCount?: number;
  pendingCrCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  wbsItems?: WbsItem[];
  raidItems?: RaidItem[];
  changeRequests?: ChangeRequest[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  projects,
  sprints,
  activeProjectId,
  selectedSprintId,
  onSelectProject,
  onSelectSprint,
  onOpenCreateProject,
  onOpenCreateSprint,
  onOpenEditSprint,
  onDeleteSprint,
  onOpenEditProject,
  onDeleteProject,
  onOpenCreateWorkItem,
  onOpenAiAssistant,
  criticalRisksCount = 0,
  blockedWbsCount = 0,
  pendingCrCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  wbsItems,
  raidItems,
  changeRequests,
}) => {
  // Collapsible state for the primary project/sprint tree panel
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  // Search within project/sprint tree
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Expanded project folders state
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    "proj-flutter": true,
    "proj-angular": true,
  });
  // Quick create popover in header
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const toggleProject = (projId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projId]: prev[projId] === undefined ? false : !prev[projId],
    }));
  };

  // Filter projects and sprints by treeSearchQuery
  const filteredProjects = projects.filter((p) => {
    if (!treeSearchQuery.trim()) return true;
    const q = treeSearchQuery.toLowerCase();
    const projMatch = p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q);
    const sprintMatch = sprints.some(
      (s) =>
        (s.projectId === p.id || s.projectGroup === p.name) &&
        s.name.toLowerCase().includes(q)
    );
    return projMatch || sprintMatch;
  });

  // Original app menu options restored in compact vertical dock layout
  const dockItems = [
    {
      id: "dashboard" as ActiveTab,
      label: "Dashboard",
      icon: BarChart3,
      isActive: activeTab === "dashboard",
      badgeCount: 0,
      badgeColor: "",
      onClick: () => setActiveTab("dashboard"),
    },
    {
      id: "wbs" as ActiveTab,
      label: "WBS",
      icon: Layers,
      isActive: activeTab === "wbs",
      badgeCount: blockedWbsCount,
      badgeColor: "bg-rose-500",
      onClick: () => {
        setActiveTab("wbs");
        if (isTreeCollapsed) setIsTreeCollapsed(false);
      },
    },
    {
      id: "stakeholders" as ActiveTab,
      label: "People",
      icon: Users,
      isActive: activeTab === "stakeholders",
      badgeCount: 0,
      badgeColor: "",
      onClick: () => setActiveTab("stakeholders"),
    },
    {
      id: "raid" as ActiveTab,
      label: "RAID",
      icon: ShieldAlert,
      isActive: activeTab === "raid",
      badgeCount: criticalRisksCount,
      badgeColor: "bg-rose-500",
      onClick: () => setActiveTab("raid"),
    },
    {
      id: "raci" as ActiveTab,
      label: "RACI",
      icon: Grid,
      isActive: activeTab === "raci",
      badgeCount: 0,
      badgeColor: "",
      onClick: () => setActiveTab("raci"),
    },
    {
      id: "change-management" as ActiveTab,
      label: "Changes",
      icon: GitPullRequest,
      isActive: activeTab === "change-management",
      badgeCount: pendingCrCount,
      badgeColor: "bg-amber-500",
      onClick: () => setActiveTab("change-management"),
    },
    {
      id: "documents" as ActiveTab,
      label: "Docs",
      icon: FileText,
      isActive: activeTab === "documents",
      badgeCount: 0,
      badgeColor: "",
      onClick: () => setActiveTab("documents"),
    },
    {
      id: "reports" as ActiveTab,
      label: "Reports",
      icon: FileCheck2,
      isActive: activeTab === "reports",
      badgeCount: 0,
      badgeColor: "",
      onClick: () => setActiveTab("reports"),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Combined Navigation Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex select-none transition-all duration-200 ease-in-out shrink-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* ========================================================= */}
        {/* 1. SLIM COMPACT ICON DOCK (Smart vertical rail like image) */}
        {/* ========================================================= */}
        <div className="w-16 bg-[#141226] border-r border-[#242142] flex flex-col items-center py-3 justify-between shrink-0 z-30 overflow-y-auto">
          <div className="w-full flex flex-col items-center space-y-3">
            {dockItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative group w-full flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      item.onClick();
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      item.isActive
                        ? "bg-white text-[#141226] shadow-md ring-2 ring-indigo-400/40"
                        : "text-slate-400 hover:text-white hover:bg-[#232042]"
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 stroke-[1.85]" />

                    {/* Notification badge */}
                    {item.badgeCount > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full ${item.badgeColor} text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#141226]`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </button>

                  {/* Icon label underneath matching screenshot */}
                  <span
                    className={`text-[9.5px] font-medium tracking-tight mt-0.5 truncate max-w-[56px] text-center ${
                      item.isActive ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Dock Controls */}
          <div className="w-full flex flex-col items-center pt-2 space-y-2 border-t border-[#242142]/70 mt-2">
            {/* Project / Sprint Tree Toggle */}
            <button
              type="button"
              onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                !isTreeCollapsed
                  ? "bg-[#252248] text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-[#232042]"
              }`}
              title={isTreeCollapsed ? "Show Projects & Sprints Tree" : "Hide Projects & Sprints Tree"}
            >
              {isTreeCollapsed ? (
                <ChevronsRight className="w-4 h-4" />
              ) : (
                <ChevronsLeft className="w-4 h-4" />
              )}
            </button>
            <span className="text-[9px] font-medium text-slate-400">
              {isTreeCollapsed ? "Sprints" : "Collapse"}
            </span>

            {/* PM Avatar */}
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-white text-[10px] font-bold shadow-xs cursor-pointer mt-1"
              title="Project Manager Workspace"
            >
              PM
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. CLICKUP HIERARCHY TREE PANEL (Home, Projects, Sprints) */}
        {/* ========================================================= */}
        {!isTreeCollapsed && (
          <div className="w-64 bg-[#0C101A] border-r border-[#1C2337] flex flex-col h-full shrink-0 z-20">
            {/* Header: Home + Quick Icons */}
            <div className="p-3 border-b border-[#1C2337] bg-[#0A0D16] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Home</h2>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setActiveTab("documents")}
                  className="p-1 hover:text-white hover:bg-[#1A2236] rounded transition-colors cursor-pointer"
                  title="Inbox & Docs"
                >
                  <Inbox className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isSearchOpen ? "bg-[#1E273E] text-white" : "hover:text-white hover:bg-[#1A2236]"
                  }`}
                  title="Search Sprints & Tasks"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Quick filter toggle: show active projects only
                    onSelectProject("all");
                    onSelectSprint(null);
                  }}
                  className="p-1 hover:text-white hover:bg-[#1A2236] rounded transition-colors cursor-pointer"
                  title="Reset Filter"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsTreeCollapsed(true)}
                  className="p-1 hover:text-white hover:bg-[#1A2236] rounded transition-colors cursor-pointer hidden md:flex"
                  title="Collapse Sidebar"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Create '+' Button (ClickUp style) */}
                <div className="relative ml-0.5">
                  <button
                    type="button"
                    onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                    className="w-5 h-5 rounded bg-[#182033] hover:bg-[#25304C] text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#2A3550]"
                    title="Add Task, Sprint, or Project"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick Create Popover */}
                  {isQuickCreateOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#111624] border border-[#252E46] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickCreateOpen(false);
                          if (onOpenCreateWorkItem) onOpenCreateWorkItem();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-[#1E273E] flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>New Task</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickCreateOpen(false);
                          if (onOpenCreateSprint) onOpenCreateSprint(activeProjectId !== "all" ? activeProjectId : undefined);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-[#1E273E] flex items-center gap-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>New Sprint</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickCreateOpen(false);
                          if (onOpenCreateProject) onOpenCreateProject();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-[#1E273E] flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 text-sky-400" />
                        <span>New Project</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Close */}
                {onCloseMobile && (
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="md:hidden p-1 hover:text-white hover:bg-[#1A2236] rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Tree Search Bar (collapsible) */}
            {isSearchOpen && (
              <div className="p-2 border-b border-[#1C2337] bg-[#0A0D16]">
                <div className="flex items-center bg-[#131929] border border-[#242E46] rounded-lg px-2 py-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={treeSearchQuery}
                    onChange={(e) => setTreeSearchQuery(e.target.value)}
                    placeholder="Search projects & sprints..."
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  {treeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTreeSearchQuery("")}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Tree View */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-xs">
              {/* All Tasks - #Aztute Row (Matching screenshot exact layout) */}
              <div
                onClick={() => {
                  onSelectProject("all");
                  onSelectSprint(null);
                  setActiveTab("wbs");
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeProjectId === "all" && !selectedSprintId
                    ? "bg-[#1C2237] text-white font-medium border border-[#2C3754]"
                    : "text-slate-300 hover:bg-[#131A2A]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <GitFork className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-medium text-xs">All Tasks</span>
                  <span className="text-slate-400 font-mono text-[11px]">- #Aztute</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-[#161C2C] px-1.5 py-0.5 rounded">
                  {wbsItems ? wbsItems.length : sprints.reduce((sum, s) => sum + (s.taskCount || 0), 0)}
                </span>
              </div>

              {/* Projects Hierarchy Tree */}
              <div className="space-y-3 pt-1">
                {filteredProjects.map((project) => {
                  const isExpanded = expandedProjects[project.id] !== false;
                  const isProjectSelected = activeProjectId === project.id && !selectedSprintId;
                  const projectSprints = sprints.filter(
                    (s) => s.projectId === project.id || s.projectGroup === project.name
                  );

                  // Dynamically resolve WBS items and RAID items for this project
                  const projectWbs = wbsItems
                    ? wbsItems.filter(
                        (w) =>
                          w.projectId === project.id ||
                          (w.sprintId &&
                            sprints.some(
                              (s) =>
                                s.id === w.sprintId &&
                                (s.projectId === project.id || s.projectGroup === project.name)
                            )) ||
                          (project.id === "proj-flutter" && !w.projectId && !w.sprintId?.includes("angular"))
                      )
                    : [];

                  const projectRaid = raidItems
                    ? raidItems.filter(
                        (r) =>
                          r.projectId === project.id ||
                          (r.sprintId &&
                            sprints.some(
                              (s) =>
                                s.id === r.sprintId &&
                                (s.projectId === project.id || s.projectGroup === project.name)
                            )) ||
                          (project.id === "proj-flutter" && !r.projectId && !r.sprintId?.includes("angular"))
                      )
                    : [];

                  const backlogTasks = projectWbs.filter(
                    (w) => !w.sprintId || !sprints.some((s) => s.id === w.sprintId)
                  );

                  return (
                    <div key={project.id} className="space-y-1">
                      {/* Project Folder Row */}
                      <div
                        onClick={() => {
                          onSelectProject(project.id);
                          onSelectSprint(null);
                        }}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isProjectSelected
                            ? "bg-[#1C2237] text-white font-medium"
                            : "text-slate-300 hover:bg-[#131A2A]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProject(project.id);
                            }}
                            className="text-slate-400 hover:text-white p-0.5 rounded shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate text-xs font-semibold text-slate-200">
                            {project.name}
                          </span>
                          <span
                            className="text-[10px] font-mono text-slate-400 bg-[#161C2C] px-1.5 py-0.2 rounded shrink-0"
                            title={`${projectWbs.length} total work items in project`}
                          >
                            {projectWbs.length}
                          </span>
                          {projectRaid.length > 0 && (
                            <span
                              className="text-[9px] font-mono text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1 py-0.2 rounded shrink-0"
                              title={`${projectRaid.length} RAID items in ${project.name}`}
                            >
                              {projectRaid.length}R
                            </span>
                          )}
                        </div>

                        {/* Hover Quick Actions: Add Sprint, Edit Project, Delete Project */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenCreateSprint) onOpenCreateSprint(project.id);
                            }}
                            className="p-1 hover:bg-[#202942] text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                            title={`Add Sprint to ${project.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {onOpenEditProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditProject(project);
                              }}
                              className="p-1 hover:bg-[#202942] text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
                              title={`Edit ${project.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}

                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteProject(project);
                              }}
                              className="p-1 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title={`Delete ${project.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sprints List Under Project */}
                      {isExpanded && (
                        <div className="border-l border-[#1D253A] ml-4 pl-2 space-y-0.5">
                          {projectSprints.length > 0 ? (
                            projectSprints.map((sprint) => {
                              const isSprintSelected = selectedSprintId === sprint.id;
                              const sprintTasks = wbsItems
                                ? wbsItems.filter((w) => w.sprintId === sprint.id)
                                : [];
                              const sprintTaskCount = wbsItems
                                ? sprintTasks.length
                                : (sprint.taskCount ?? 0);
                              const sprintRaid = raidItems
                                ? raidItems.filter((r) => r.sprintId === sprint.id)
                                : [];

                              return (
                                <div
                                  key={sprint.id}
                                  onClick={() => {
                                    onSelectProject(project.id);
                                    onSelectSprint(sprint.id);
                                    if (onCloseMobile) onCloseMobile();
                                  }}
                                  className={`group/sprint flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                                    isSprintSelected
                                      ? "bg-[#1E253B] text-white font-medium border border-[#333E5F] shadow-xs"
                                      : "text-slate-300 hover:bg-[#131A2A]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                                    {/* Green Circle Play Icon matching screenshot */}
                                    <div className="w-4 h-4 rounded-full border border-emerald-500/80 text-emerald-400 flex items-center justify-center shrink-0">
                                      <Play className="w-2 h-2 fill-current ml-0.5" />
                                    </div>
                                    <span className="truncate text-xs">{sprint.name}</span>
                                  </div>

                                  {/* Actions & Badges */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Task Count Badge */}
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                                        sprintTaskCount > 0
                                          ? "bg-[#E11D48]/20 text-pink-300 border border-pink-500/30"
                                          : "bg-slate-800/40 text-slate-500 border border-slate-700/40"
                                      }`}
                                      title={`${sprintTaskCount} tasks in ${sprint.name}`}
                                    >
                                      {sprintTaskCount}
                                    </span>

                                    {/* RAID items indicator */}
                                    {sprintRaid.length > 0 && (
                                      <span
                                        className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0"
                                        title={`${sprintRaid.length} RAID item${sprintRaid.length > 1 ? "s" : ""} in ${sprint.name}`}
                                      >
                                        {sprintRaid.length}R
                                      </span>
                                    )}

                                    {/* Quick Edit Sprint Button */}
                                    {onOpenEditSprint && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenEditSprint(sprint);
                                        }}
                                        className="opacity-0 group-hover/sprint:opacity-100 p-1 hover:bg-[#202942] text-slate-400 hover:text-sky-300 rounded transition-opacity cursor-pointer"
                                        title="Edit sprint name and details"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}

                                    {/* Quick Delete Sprint Button */}
                                    {onDeleteSprint && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteSprint(sprint);
                                        }}
                                        className="opacity-0 group-hover/sprint:opacity-100 p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                                        title="Delete sprint"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-[11px] text-slate-500 italic py-1 pl-2">
                              No sprints yet
                            </div>
                          )}

                          {/* Backlog / Unassigned Tasks Row if any exist */}
                          {backlogTasks.length > 0 && (
                            <div
                              onClick={() => {
                                onSelectProject(project.id);
                                onSelectSprint("backlog");
                                if (onCloseMobile) onCloseMobile();
                              }}
                              className={`group/sprint flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                                selectedSprintId === "backlog" && activeProjectId === project.id
                                  ? "bg-[#1E253B] text-white font-medium border border-[#333E5F] shadow-xs"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-[#131A2A]"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                                <div className="w-4 h-4 rounded border border-dashed border-slate-500 text-slate-400 flex items-center justify-center shrink-0">
                                  <Inbox className="w-2.5 h-2.5" />
                                </div>
                                <span className="truncate text-xs">Backlog (Unassigned)</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                {backlogTasks.length}
                              </span>
                            </div>
                          )}

                          {/* + Create Sprint Row (ClickUp Style) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenCreateSprint) onOpenCreateSprint(project.id);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#131A2A] rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                            <span>Create Sprint</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Add Project Link */}
              <div className="pt-3 border-t border-[#1C2337] mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCreateProject) onOpenCreateProject();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-400 hover:text-white hover:bg-[#131A2A] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>

            {/* Bottom Active Workspace Indicator */}
            <div className="p-3 bg-[#0A0D16] border-t border-[#1C2337] text-[11px] text-slate-400 flex items-center justify-between group">
              <div className="truncate min-w-0 pr-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Scope:</span>
                </div>
                <span className="font-semibold text-slate-200 truncate block">
                  {activeProjectId === "all"
                    ? "🌐 Portfolio Workspace"
                    : projects.find((p) => p.id === activeProjectId)?.name || "Project View"}
                </span>
                {selectedSprintId && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0" />
                    <p className="text-[10px] text-cyan-300 font-medium truncate">
                      {sprints.find((s) => s.id === selectedSprintId)?.name}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedSprintId && (
                  <button
                    type="button"
                    onClick={() => onSelectSprint(null)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-[#1E273E] rounded transition-colors cursor-pointer"
                    title="Clear sprint scope (view whole project)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed State Restore Button */}
        {isTreeCollapsed && (
          <div className="hidden md:flex items-start pt-3 pl-1">
            <button
              type="button"
              onClick={() => setIsTreeCollapsed(false)}
              className="p-1.5 bg-[#0C101A] border border-[#1C2337] rounded-r-lg text-slate-400 hover:text-white hover:bg-[#1A2236] transition-colors cursor-pointer shadow-md"
              title="Expand Hierarchy Panel"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
