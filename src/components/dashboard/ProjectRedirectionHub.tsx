import React from "react";
import { ActiveTab, Project, Sprint } from "../../types";
import {
  Layers,
  Calendar,
  ShieldAlert,
  Users,
  Grid,
  GitPullRequest,
  FileText,
  FileCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ProjectRedirectionHubProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onRedirectToArea?: (tab: ActiveTab, params?: { projectId?: string; sprintId?: string | null }) => void;
  activeProjectName?: string;
  activeProjectId?: string;
  selectedSprintId?: string | null;
  totalWorkPackages?: number;
  totalRisks?: number;
  totalStakeholders?: number;
  totalChangeRequests?: number;
}

export const ProjectRedirectionHub: React.FC<ProjectRedirectionHubProps> = ({
  onNavigateTab,
  onRedirectToArea,
  activeProjectName = "Project",
  activeProjectId = "all",
  selectedSprintId = null,
  totalWorkPackages = 0,
  totalRisks = 0,
  totalStakeholders = 0,
  totalChangeRequests = 0,
}) => {
  const handleRedirect = (tab: ActiveTab) => {
    if (onRedirectToArea) {
      onRedirectToArea(tab, { projectId: activeProjectId !== "all" ? activeProjectId : undefined, sprintId: selectedSprintId });
    } else {
      onNavigateTab(tab);
    }
  };

  const redirectAreas = [
    {
      tab: "wbs" as ActiveTab,
      title: "WBS Work Decomposition",
      description: "Deep dive into hierarchy, work packages, task timers, and EVM rollups.",
      badge: `${totalWorkPackages} Items`,
      badgeColor: "text-sky-400 bg-sky-950/70 border-sky-800/80",
      icon: Layers,
      accentColor: "text-sky-400 border-sky-500/20 bg-sky-500/10",
      cta: "Inspect WBS Tree",
    },
    {
      tab: "gantt" as ActiveTab,
      title: "Interactive Gantt & Schedule",
      description: "Timeline pacing, dependencies (FS/SS), critical paths, and milestone flags.",
      badge: "Pacing & Float",
      badgeColor: "text-indigo-400 bg-indigo-950/70 border-indigo-800/80",
      icon: Calendar,
      accentColor: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
      cta: "View Timeline",
    },
    {
      tab: "raid" as ActiveTab,
      title: "RAID Risk & Issue Register",
      description: "5×5 exposure matrix, open impediments, assumptions, and mitigation actions.",
      badge: `${totalRisks} Logged`,
      badgeColor: "text-amber-400 bg-amber-950/70 border-amber-800/80",
      icon: ShieldAlert,
      accentColor: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      cta: "Open Risk Log",
    },
    {
      tab: "raci" as ActiveTab,
      title: "RACI Accountability Matrix",
      description: "Audit Responsible, Accountable, Consulted, and Informed per deliverable.",
      badge: "Single-Point Roles",
      badgeColor: "text-emerald-400 bg-emerald-950/70 border-emerald-800/80",
      icon: Grid,
      accentColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      cta: "Check RACI Grid",
    },
    {
      tab: "stakeholders" as ActiveTab,
      title: "Stakeholder Directory & Power Grid",
      description: "Engagement levels, power vs interest quadrants, and rate allocations.",
      badge: `${totalStakeholders} Members`,
      badgeColor: "text-purple-400 bg-purple-950/70 border-purple-800/80",
      icon: Users,
      accentColor: "text-purple-400 border-purple-500/20 bg-purple-500/10",
      cta: "Inspect Stakeholders",
    },
    {
      tab: "change-management" as ActiveTab,
      title: "CCB & Change Management",
      description: "Formal change requests, contingency budget burn, and scope revisions.",
      badge: `${totalChangeRequests} Requests`,
      badgeColor: "text-rose-400 bg-rose-950/70 border-rose-800/80",
      icon: GitPullRequest,
      accentColor: "text-rose-400 border-rose-500/20 bg-rose-500/10",
      cta: "Manage Changes",
    },
    {
      tab: "documents" as ActiveTab,
      title: "Specification & Document Hub",
      description: "Charters, SOWs, AI-parsed WBS documents, and technical specs.",
      badge: "Project Repository",
      badgeColor: "text-teal-400 bg-teal-950/70 border-teal-800/80",
      icon: FileText,
      accentColor: "text-teal-400 border-teal-500/20 bg-teal-500/10",
      cta: "Browse Documents",
    },
    {
      tab: "reports" as ActiveTab,
      title: "PMI Audit & Variance Reports",
      description: "Executive summaries, ANSI/PMI EVM compliance reports, and audit trails.",
      badge: "Instant Briefings",
      badgeColor: "text-amber-300 bg-amber-950/70 border-amber-800/80",
      icon: FileCheck,
      accentColor: "text-amber-300 border-amber-500/20 bg-amber-500/10",
      cta: "Generate Report",
    },
  ];

  return (
    <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
              Fast Project Redirection Hub
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Instant 1-Click Jump
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Quickly navigate directly into any operational area within{" "}
            <strong className="text-slate-200">{activeProjectName}</strong>. Context and active filters are preserved.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {redirectAreas.map((area) => {
          const Icon = area.icon;
          return (
            <div
              key={area.tab}
              onClick={() => handleRedirect(area.tab)}
              className="group p-3.5 rounded-xl bg-[#060911] border border-[#1E293B] hover:border-sky-500/50 hover:bg-[#0D1424] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg border shrink-0 ${area.accentColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold truncate ${area.badgeColor}`}>
                    {area.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white font-mono group-hover:text-sky-300 transition-colors">
                  {area.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 font-sans leading-relaxed">
                  {area.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1E293B] flex items-center justify-between text-xs font-mono font-semibold text-sky-400 group-hover:text-sky-300">
                <span>{area.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
