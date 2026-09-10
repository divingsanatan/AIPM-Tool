import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  Menu,
  Upload,
  AlertCircle,
  TrendingUp,
  Cloud,
} from "lucide-react";
import { ActiveTab, EvmMetrics, ProjectSettings, Project, Sprint } from "../types";
import { ProjectSwitcher } from "./ProjectSwitcher";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  projectSettings: ProjectSettings;
  evmMetrics: EvmMetrics;
  onExecuteAiAction?: (action: any) => void;
  projectContextData: any;
  onOpenMobileSidebar?: () => void;
  onUploadDocsClick?: () => void;
  onOpenSyncModal?: () => void;
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
  projects = [],
  sprints = [],
  activeProjectId = "all",
  onSelectProject,
  onOpenCreateProject,
  onOpenCreateSprint,
  onOpenEditProject,
  onPromptDeleteProject,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [aiResponseModal, setAiResponseModal] = useState<{
    query: string;
    reply: string;
    action?: any;
    relevantMetrics?: any;
  } | null>(null);

  const handleAiSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToRun = customQuery || searchQuery;
    if (!queryToRun.trim() || isAiLoading) return;

    setIsAiLoading(true);
    try {
      const res = await fetch("/api/gemini/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToRun,
          projectContext: projectContextData,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to consult Gemini assistant");
      }

      const data = await res.json();
      setAiResponseModal({
        query: queryToRun,
        reply: data.reply || "No response received",
        action: data.recommendedAction,
        relevantMetrics: data.relevantMetrics,
      });
    } catch (err: any) {
      setAiResponseModal({
        query: queryToRun,
        reply: `Error: ${err.message || "Unable to reach AI PM service."}`,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const quickPrompts = [
    "What is our CPI and why is it below 1.0?",
    "Which WBS items are currently Blocked?",
    "Calculate EAC and cost variance impact",
  ];

  return (
    <>
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

        {/* Center: Desktop/Tablet AI Search Bar (hidden on mobile to prevent crushing) */}
        <div className="hidden md:flex relative flex-1 max-w-md lg:max-w-xl min-w-0 mx-2">
          <form onSubmit={(e) => handleAiSearch(e)} className="relative flex items-center w-full">
            <div className="absolute inset-y-0 left-2.5 sm:left-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-400" />
            </div>
            <input
              id="ai-nlp-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Ask AI: "What is our current SPI?"'
              className="w-full bg-[#030712] border border-[#1E293B] rounded-lg py-1.5 pl-8 sm:pl-10 pr-20 sm:pr-24 text-xs focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none text-white placeholder-slate-400 transition-all shadow-inner truncate"
            />
            <div className="absolute inset-y-0 right-1 flex items-center">
              <button
                id="submit-ai-query-btn"
                type="submit"
                disabled={isAiLoading || !searchQuery.trim()}
                className="bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 text-[#030712] px-2 sm:px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                {isAiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile AI Search Toggle Button */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={`md:hidden p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
              isMobileSearchOpen
                ? "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-xs"
                : "bg-[#0F1422] text-slate-400 hover:text-white border-[#232C42]"
            }`}
            title="Ask AI PM"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
          </button>

          {/* Sync Devices Button - Prominently visible on both mobile and desktop */}
          <button
            id="sync-devices-nav-btn"
            onClick={onOpenSyncModal}
            className="bg-sky-500/15 hover:bg-sky-500/25 active:scale-95 text-sky-300 border border-sky-500/40 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Sync projects across phone and desktop"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-bold">Sync</span>
            <span className="hidden md:inline text-sky-300/80">Devices</span>
          </button>

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

      {/* Expandable Mobile Search Bar when user taps AI icon on mobile */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-3 py-2.5 bg-[#070B14] border-b border-[#1E293B] animate-in slide-in-from-top-2 duration-150 shadow-xl space-y-2">
          <form onSubmit={(e) => handleAiSearch(e)} className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Ask AI PM: "What is our current SPI?"'
              className="w-full bg-[#030712] border border-[#1E293B] rounded-lg py-1.5 pl-8 pr-20 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-inner"
              autoFocus
            />
            <button
              type="submit"
              disabled={isAiLoading || !searchQuery.trim()}
              className="absolute right-1 bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 text-[#030712] px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>Ask</span>
            </button>
          </form>
          {/* Quick prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickPrompts.slice(0, 2).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  handleAiSearch(undefined, prompt);
                  setIsMobileSearchOpen(false);
                }}
                className="text-[10px] bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-800 whitespace-nowrap cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Query Response Dialog */}
      {aiResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#060911]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-white uppercase">
                    PMI Sentinel AI Analysis
                  </h3>
                  <p className="text-xs text-slate-300 truncate max-w-md italic font-sans">
                    "{aiResponseModal.query}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiResponseModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#1E293B] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#F8FAFC]">
              {aiResponseModal.relevantMetrics?.highlight && (
                <div className="p-3 rounded-lg bg-[#060911] border border-sky-500/40 text-xs text-sky-400 flex items-center gap-2 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0 text-sky-400" />
                  <span>{aiResponseModal.relevantMetrics.highlight}</span>
                </div>
              )}

              <div className="leading-relaxed whitespace-pre-line text-[#F8FAFC] bg-[#060911] p-4 rounded-lg border border-[#1E293B] font-sans">
                {aiResponseModal.reply}
              </div>

              {aiResponseModal.action && aiResponseModal.action.type !== "NONE" && (
                <div className="p-4 rounded-lg bg-[#060911] border border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                        PROPOSED ACTION
                      </span>
                      <span className="font-semibold text-xs text-white">
                        {aiResponseModal.action.description || aiResponseModal.action.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Apply this recommendation directly to update your project state.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onExecuteAiAction) {
                        onExecuteAiAction(aiResponseModal.action);
                      }
                      setAiResponseModal(null);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Apply Action
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                PMBOK Standard Alignment • Real-time EVM Ingestion
              </span>
              <button
                onClick={() => setAiResponseModal(null)}
                className="px-3.5 py-1.5 bg-[#141C2E] border border-slate-700 hover:bg-slate-800 text-[#F8FAFC] text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
