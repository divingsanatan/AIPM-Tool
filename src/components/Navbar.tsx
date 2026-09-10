import React from "react";
import {
  Menu,
  Upload,
  Layers,
  FolderGit2,
} from "lucide-react";
import { ActiveTab, EvmMetrics, ProjectSettings, Project, Sprint } from "../types";
import { ProjectSwitcher } from "./ProjectSwitcher";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  projectSettings: ProjectSettings;
  evmMetrics: EvmMetrics;
  onExecuteAiAction?: (action: any) => void;
  projectContextData?: any;
  onOpenMobileSidebar?: () => void;
  onUploadDocsClick?: () => void;
  onOpenSyncModal?: () => void;
  onTriggerInstantSync?: () => void;
  isSyncing?: boolean;
  projects?: Project[];
  sprints?: Sprint[];
  activeProjectId?: string;
  onSelectProject?: (id: string) => void;
  onOpenCreateProject?: () => void;
  onOpenCreateSprint?: (projectId?: string) => void;
  onOpenEditProject?: (project: Project) => void;
  onPromptDeleteProject?: (project: Project) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  projectSettings,
  evmMetrics,
  onExecuteAiAction,
  projectContextData,
  onOpenMobileSidebar,
  onUploadDocsClick,
  onOpenSyncModal,
  onTriggerInstantSync,
  isSyncing = false,
  projects = [],
  sprints = [],
  activeProjectId = "all",
  onSelectProject,
  onOpenCreateProject,
  onOpenCreateSprint,
  onOpenEditProject,
  onPromptDeleteProject,
}) => {
  const currentProject = projects.find((p) => p.id === activeProjectId);

  return (
    <header
      id="app-header"
      className="h-14 border-b border-[#1E293B] bg-[#090D16]/95 backdrop-blur-md flex items-center px-2.5 sm:px-4 md:px-6 justify-between shrink-0 gap-1.5 sm:gap-3 z-20"
    >
      {/* Left Side: Mobile Hamburger Menu & Project Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] cursor-pointer shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Project Switcher Dropdown (ClickUp Style) */}
        {projects.length > 0 && onSelectProject && (
          <div className="shrink-0">
            <ProjectSwitcher
              projects={projects}
              sprints={sprints}
              activeProjectId={activeProjectId}
              onSelectProject={onSelectProject}
              onOpenCreateProject={onOpenCreateProject}
              onOpenCreateSprint={onOpenCreateSprint}
              onOpenEditProject={onOpenEditProject}
              onPromptDeleteProject={onPromptDeleteProject}
              onOpenSyncModal={onOpenSyncModal}
            />
          </div>
        )}
      </div>

      {/* Center: Clean Workspace / Project Context Indicator */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#0F172A]/80 border border-[#1E293B] rounded-full text-xs font-medium text-slate-300">
        <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="text-slate-400 text-[11px]">Workspace:</span>
        <span className="text-white font-semibold truncate max-w-[200px] md:max-w-xs">
          {currentProject ? currentProject.name : "All Projects (Global)"}
        </span>
        {currentProject && (
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
            {currentProject.projectCode}
          </span>
        )}
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Upload Docs Button */}
        <button
          onClick={onUploadDocsClick || (() => setActiveTab("documents"))}
          className="bg-[#38BDF8] hover:bg-[#0EA5E9] active:scale-95 text-[#030712] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
          title="Upload Documents"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Upload Docs</span>
        </button>

        {/* Report Period (Desktop only) */}
        <div className="hidden lg:block text-right font-mono border-l border-[#1E293B] pl-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Report Period</p>
          <p className="text-[11px] font-bold text-white">Q3 - WEEK 12</p>
        </div>
      </div>
    </header>
  );
};
