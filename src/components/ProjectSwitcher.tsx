import React, { useState, useRef, useEffect } from "react";
import { Project, Sprint } from "../types";
import {
  Folder,
  ChevronDown,
  Plus,
  Check,
  Search,
  PlayCircle,
  FolderKanban,
  Layers,
  Sparkles,
  Pencil,
  Trash2,
  Cloud,
} from "lucide-react";

interface ProjectSwitcherProps {
  projects: Project[];
  sprints: Sprint[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  onOpenCreateSprint: (defaultProjectId?: string) => void;
  onOpenEditProject?: (project: Project) => void;
  onPromptDeleteProject?: (project: Project) => void;
  onOpenSyncModal?: () => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  projects,
  sprints,
  activeProjectId,
  onSelectProject,
  onOpenCreateProject,
  onOpenCreateSprint,
  onOpenEditProject,
  onPromptDeleteProject,
  onOpenSyncModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.projectCode.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="project-switcher-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-[#0F1422] hover:bg-[#161D30] border border-[#232C42] hover:border-[#333E5D] text-slate-200 transition-all cursor-pointer text-xs font-medium max-w-[130px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-xs shadow-xs shrink-0"
        title="Switch Workspace Project"
      >
        <span className="flex items-center gap-1.5 shrink-0">
          {activeProjectId === "all" ? (
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
              style={{ backgroundColor: activeProject?.color || "#818CF8" }}
            />
          )}
        </span>
        <span className="truncate font-semibold text-slate-100">
          {activeProjectId === "all" ? "All Projects" : activeProject?.name || "Select Project"}
        </span>
        {activeProjectId !== "all" && activeProject && (
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline shrink-0">
            {activeProject.projectCode}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />
      </button>

      {/* ClickUp-Style Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 xs:w-80 sm:w-88 max-w-[calc(100vw-20px)] bg-[#0D111A] border border-[#232A3B] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#1E2433] bg-[#0A0D15] space-y-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects & spaces..."
                className="w-full bg-[#141824] border border-[#273045] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Quick Mobile Sync Shortcut inside dropdown */}
            {onOpenSyncModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSyncModal();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sync Devices (Phone & Cloud)</span>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                  Sync
                </span>
              </button>
            )}
          </div>

          {/* Projects List */}
          <div className="max-h-72 overflow-y-auto p-2 text-xs space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 font-semibold">
              Workspaces & Projects ({projects.length})
            </div>

            {/* All Projects Option */}
            <div
              onClick={() => {
                onSelectProject("all");
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                activeProjectId === "all"
                  ? "bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30"
                  : "hover:bg-[#161B28] text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">All Projects (Portfolio View)</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Aggregated across {projects.length} projects & {sprints.length} sprints
                  </div>
                </div>
              </div>
              {activeProjectId === "all" && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
            </div>

            {/* Individual Projects */}
            {filteredProjects.map((project) => {
              const isSelected = activeProjectId === project.id;
              const projectSprints = sprints.filter(
                (s) => s.projectId === project.id || s.projectGroup === project.name
              );
              const activeSprint = projectSprints.find((s) => s.status === "Active");

              return (
                <div
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project.id);
                    setIsOpen(false);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30"
                      : "hover:bg-[#161B28] text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span
                      className="w-3 h-3 rounded-full inline-block shrink-0 shadow-xs"
                      style={{ backgroundColor: project.color || "#818CF8" }}
                    />
                    <div className="truncate min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{project.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          [{project.projectCode}]
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400">
                          {projectSprints.length} {projectSprints.length === 1 ? "sprint" : "sprints"}
                        </span>
                        {activeSprint && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-indigo-400 flex items-center gap-1 truncate">
                              <PlayCircle className="w-2.5 h-2.5" />
                              {activeSprint.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* Add sprint to this project button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        onOpenCreateSprint(project.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#232A3B] text-slate-400 hover:text-indigo-300 transition-opacity cursor-pointer"
                      title={`Add Sprint to ${project.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Project Button */}
                    {onOpenEditProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onOpenEditProject(project);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#232A3B] text-slate-400 hover:text-amber-300 transition-opacity cursor-pointer"
                        title={`Edit ${project.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Project Button */}
                    {onPromptDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onPromptDeleteProject(project);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer"
                        title={`Delete ${project.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Footer (ClickUp Style) */}
          <div className="p-2 border-t border-[#1E2433] bg-[#0A0D15] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCreateProject();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141926] hover:bg-[#1E2438] text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCreateSprint(activeProjectId === "all" ? undefined : activeProjectId);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141926] hover:bg-[#1E2438] text-slate-300 hover:text-white border border-[#232A3B] text-xs font-medium cursor-pointer transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Sprint</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
