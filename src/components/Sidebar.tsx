import React from "react";
import {
  BarChart3,
  ListTree,
  Users,
  ShieldAlert,
  Grid3X3,
  GitPullRequest,
  FileText,
  FileCheck2,
  X,
} from "lucide-react";
import { ActiveTab, EvmMetrics, ProjectSettings } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  projectSettings: ProjectSettings;
  evmMetrics: EvmMetrics;
  criticalRisksCount: number;
  blockedWbsCount: number;
  pendingCrCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  projectSettings,
  evmMetrics,
  criticalRisksCount,
  blockedWbsCount,
  pendingCrCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navGroups = [
    {
      group: "Project Management",
      items: [
        { id: "dashboard" as ActiveTab, label: "Dashboard", icon: BarChart3, badge: null },
        {
          id: "wbs" as ActiveTab,
          label: "WBS Planner",
          icon: ListTree,
          badge: blockedWbsCount > 0 ? `${blockedWbsCount} Blocked` : null,
          badgeColor: "bg-amber-500/20 text-amber-400",
        },
        {
          id: "stakeholders" as ActiveTab,
          label: "Stakeholders & Cost",
          icon: Users,
          badge: null,
        },
      ],
    },
    {
      group: "PMI Controls",
      items: [
        {
          id: "raid" as ActiveTab,
          label: "RAID Log",
          icon: ShieldAlert,
          badge: criticalRisksCount > 0 ? `${criticalRisksCount}` : null,
          badgeColor: "bg-red-500/20 text-red-400",
        },
        { id: "raci" as ActiveTab, label: "RACI Matrix", icon: Grid3X3, badge: null },
        {
          id: "change-management" as ActiveTab,
          label: "Change Logs",
          icon: GitPullRequest,
          badge: pendingCrCount > 0 ? `${pendingCrCount} Pending` : null,
          badgeColor: "bg-purple-500/20 text-purple-400",
        },
      ],
    },
    {
      group: "Artifacts & Reports",
      items: [
        { id: "documents" as ActiveTab, label: "Documents", icon: FileText, badge: null },
        { id: "reports" as ActiveTab, label: "Reports & Audit", icon: FileCheck2, badge: null },
      ],
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

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 bg-[#090D16] border-r border-[#1E293B] flex flex-col transition-transform duration-200 ease-in-out shrink-0 select-none ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#060911]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38bdf8] animate-pulse"></span>
              <h1 className="text-xs font-bold tracking-widest text-[#38BDF8] uppercase">
                PMI Sentinel AI
              </h1>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
              Project Governance Engine
            </p>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#1E293B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto text-xs">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="text-[10px] uppercase text-[#94A3B8] px-3 py-1 font-bold tracking-wider font-mono">
                {group.group}
              </div>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? "bg-[#1E293B] text-white font-semibold border border-slate-700/60 shadow-xs"
                        : "text-[#94A3B8] hover:bg-[#111827] hover:text-white font-medium"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          isActive ? "bg-[#38BDF8] shadow-[0_0_6px_#38bdf8]" : "bg-transparent"
                        }`}
                      />
                      <span className={isActive ? "text-white" : "text-slate-300"}>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          item.badgeColor || "bg-[#030712] text-[#94A3B8] border border-slate-800"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* PM Profile Card at Bottom */}
        <div className="p-3.5 bg-[#060911] border-t border-[#1E293B]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8] flex items-center justify-center text-xs font-bold text-[#030712] shrink-0 shadow-xs">
              {projectSettings.projectManager
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "PM"}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-[#F8FAFC] truncate">
                {projectSettings.projectManager}, PMP
              </p>
              <p className="text-[9px] text-[#94A3B8] truncate font-mono">
                {projectSettings.projectCode} • Lead PM
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
