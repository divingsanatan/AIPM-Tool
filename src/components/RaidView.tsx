import React, { useState } from "react";
import { RaidItem, RaidCategory, Stakeholder, EvmMetrics, Project, Sprint, WbsItem } from "../types";
import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Link2,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Trash2,
  Edit2,
  Pencil,
  FileCheck2,
  Copy,
  Printer,
  X,
  Loader2,
} from "lucide-react";

interface RaidViewProps {
  raidItems: RaidItem[];
  allProjectRaidItems?: RaidItem[];
  sprints?: Sprint[];
  wbsItems?: WbsItem[];
  stakeholders: Stakeholder[];
  evmMetrics: EvmMetrics;
  onAddRaidItem: (item: RaidItem) => void;
  onUpdateRaidItem: (item: RaidItem) => void;
  onDeleteRaidItem: (id: string) => void;
  onRequestRiskReport: () => void;
  activeProject?: Project | null;
  selectedSprint?: Sprint | null;
  onSelectSprint?: (sprintId: string | null) => void;
  onClearSprint?: () => void;
}

export const RaidView: React.FC<RaidViewProps> = ({
  raidItems,
  allProjectRaidItems,
  sprints,
  wbsItems,
  stakeholders,
  evmMetrics,
  onAddRaidItem,
  onUpdateRaidItem,
  onDeleteRaidItem,
  onRequestRiskReport,
  activeProject,
  selectedSprint,
  onSelectSprint,
  onClearSprint,
}) => {
  const [activeCategory, setActiveCategory] = useState<RaidCategory | "ALL">("ALL");
  const [sprintScopeFilter, setSprintScopeFilter] = useState<"sprint_only" | "all_project">("sprint_only");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RaidItem | null>(null);

  // Instant report modal
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Determine effective items based on sprint scope mode
  const projectPool = allProjectRaidItems || raidItems;
  const effectiveRaidItems =
    selectedSprint && sprintScopeFilter === "all_project" ? projectPool : raidItems;

  // Form state
  const [formData, setFormData] = useState<Partial<RaidItem>>({
    category: "Risk",
    title: "",
    description: "",
    probability: 3,
    impact: 3,
    severity: "Medium",
    mitigationStrategy: "",
    contingencyPlan: "",
    dependencyType: "Finish-to-Start (FS)",
    upstreamDownstream: "Upstream",
    impactIfFalse: "",
    status: "Identified",
    ownerId: stakeholders[0]?.id || "",
    sprintId: selectedSprint?.id || "",
    wbsItemId: "",
    dateRaised: new Date().toISOString().split("T")[0],
    targetResolutionDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
  });

  const getOwner = (id: string) => stakeholders.find((s) => s.id === id);

  const filteredItems = effectiveRaidItems.filter((item) => {
    if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
    return true;
  });

  const risks = effectiveRaidItems.filter((i) => i.category === "Risk");
  const issues = effectiveRaidItems.filter((i) => i.category === "Issue");
  const assumptions = effectiveRaidItems.filter((i) => i.category === "Assumption");
  const dependencies = effectiveRaidItems.filter((i) => i.category === "Dependency");

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      category: activeCategory === "ALL" ? "Risk" : activeCategory,
      title: "",
      description: "",
      probability: 3,
      impact: 3,
      severity: "Medium",
      mitigationStrategy: "",
      contingencyPlan: "",
      resolutionPlan: "",
      rootCause: "",
      dependencyType: "Finish-to-Start (FS)",
      upstreamDownstream: "Upstream",
      impactIfFalse: "",
      status: "Identified",
      ownerId: stakeholders[0]?.id || "",
      sprintId: selectedSprint?.id || "",
      wbsItemId: "",
      dateRaised: new Date().toISOString().split("T")[0],
      targetResolutionDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: RaidItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      title: item.title,
      description: item.description,
      probability: item.probability ?? 3,
      impact: item.impact ?? 3,
      severity: item.severity ?? "Medium",
      mitigationStrategy: item.mitigationStrategy ?? "",
      contingencyPlan: item.contingencyPlan ?? "",
      resolutionPlan: item.resolutionPlan ?? "",
      rootCause: item.rootCause ?? "",
      dependencyType: item.dependencyType ?? "Finish-to-Start (FS)",
      upstreamDownstream: item.upstreamDownstream ?? "Upstream",
      impactIfFalse: item.impactIfFalse ?? "",
      status: item.status,
      ownerId: item.ownerId,
      sprintId: item.sprintId || "",
      wbsItemId: item.wbsItemId || "",
      dateRaised: item.dateRaised,
      targetResolutionDate: item.targetResolutionDate,
    });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const prob = Number(formData.probability) || 3;
    const imp = Number(formData.impact) || 3;

    if (editingItem) {
      const updated: RaidItem = {
        ...editingItem,
        category: formData.category as RaidCategory,
        title: formData.title.trim(),
        description: formData.description || "",
        probability: prob as any,
        impact: imp as any,
        riskExposure: prob * imp,
        severity: formData.severity as any,
        mitigationStrategy: formData.mitigationStrategy || "",
        contingencyPlan: formData.contingencyPlan || "",
        resolutionPlan: formData.resolutionPlan || "",
        rootCause: formData.rootCause || "",
        dependencyType: formData.dependencyType as any,
        upstreamDownstream: formData.upstreamDownstream as any,
        impactIfFalse: formData.impactIfFalse || "",
        status: formData.status as any,
        ownerId: formData.ownerId || stakeholders[0]?.id || "",
        sprintId: formData.sprintId || undefined,
        wbsItemId: formData.wbsItemId || undefined,
        dateRaised: formData.dateRaised || editingItem.dateRaised,
        targetResolutionDate: formData.targetResolutionDate || editingItem.targetResolutionDate,
      };
      onUpdateRaidItem(updated);
    } else {
      const newItem: RaidItem = {
        id: `raid-${Date.now()}`,
        category: formData.category as RaidCategory,
        title: formData.title.trim(),
        description: formData.description || "",
        probability: prob as any,
        impact: imp as any,
        riskExposure: prob * imp,
        severity: formData.severity as any,
        mitigationStrategy: formData.mitigationStrategy || "",
        contingencyPlan: formData.contingencyPlan || "",
        resolutionPlan: formData.resolutionPlan || "",
        rootCause: formData.rootCause || "",
        dependencyType: formData.dependencyType as any,
        upstreamDownstream: formData.upstreamDownstream as any,
        impactIfFalse: formData.impactIfFalse || "",
        status: formData.status as any,
        ownerId: formData.ownerId || stakeholders[0]?.id || "",
        projectId: activeProject?.id || "proj-flutter",
        sprintId: formData.sprintId || (selectedSprint ? selectedSprint.id : undefined),
        wbsItemId: formData.wbsItemId || undefined,
        dateRaised: formData.dateRaised || new Date().toISOString().split("T")[0],
        targetResolutionDate:
          formData.targetResolutionDate ||
          new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
      };
      onAddRaidItem(newItem);
    }
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleGenerateRiskReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch("/api/gemini/generate-risk-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raidData: raidItems,
          projectInfo: { name: "OmniChannel Banking Platform Modernization" },
          evmData: evmMetrics,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate risk report");
      const data = await res.json();
      setReportMarkdown(data.reportMarkdown);
    } catch (err: any) {
      alert(`Report Generation Failed: ${err.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Integrated RAID Log & Risk Intelligence
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                Risks • Assumptions • Issues • Dependencies
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Comprehensive PMBOK threat management, probability-impact quantification, mitigation triggers, and automated reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="instant-risk-report-btn"
              onClick={handleGenerateRiskReport}
              disabled={isGeneratingReport}
              className="px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#38BDF8]" />
                  <span>Generate Risk Report</span>
                </>
              )}
            </button>

            <button
              id="add-raid-item-btn"
              onClick={handleOpenAdd}
              className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log RAID Item</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-3 pt-3 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono">
            {[
              { id: "ALL", label: `All (${effectiveRaidItems.length})`, icon: ShieldAlert },
              { id: "Risk", label: `Risks (${risks.length})`, icon: ShieldAlert },
              { id: "Assumption", label: `Assumptions (${assumptions.length})`, icon: HelpCircle },
              { id: "Issue", label: `Issues (${issues.length})`, icon: AlertTriangle },
              { id: "Dependency", label: `Dependencies (${dependencies.length})`, icon: Link2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-2.5 py-1 rounded text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-[#38BDF8] text-[#0F172A] font-bold shadow-xs"
                      : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Scope Information Bar */}
      {activeProject && (
        <div className="bg-[#0D1527] border border-[#1E2E50] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
            <span className="text-slate-300 font-medium">
              Filtered Scope:{" "}
              <strong className="text-white">{activeProject.name}</strong>
              {selectedSprint && (
                <>
                  {" › "}
                  <span className="text-emerald-300 font-semibold">{selectedSprint.name}</span>
                </>
              )}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {effectiveRaidItems.length} Item{effectiveRaidItems.length === 1 ? "" : "s"}
            </span>
            {selectedSprint && (
              <span className="text-[11px] text-slate-400 font-mono">
                ({raidItems.length} assigned to sprint • {projectPool.length} in project)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            {selectedSprint && (
              <div className="flex items-center bg-[#070B14] p-0.5 rounded-lg border border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setSprintScopeFilter("sprint_only")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
                    sprintScopeFilter === "sprint_only"
                      ? "bg-emerald-600 text-white shadow-xs font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {selectedSprint.name} Only ({raidItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSprintScopeFilter("all_project")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
                    sprintScopeFilter === "all_project"
                      ? "bg-amber-600 text-white shadow-xs font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Project RAID ({projectPool.length})
                </button>
              </div>
            )}

            {selectedSprint && onClearSprint && (
              <button
                type="button"
                onClick={onClearSprint}
                className="px-2.5 py-1 rounded bg-[#162340] hover:bg-[#1E3058] text-slate-300 hover:text-white border border-[#253966] transition-colors cursor-pointer"
              >
                Clear Sprint Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5x5 Risk Heatmap Matrix (When looking at Risks) */}
      {(activeCategory === "ALL" || activeCategory === "Risk") && (
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                5x5 Qualitative Risk Assessment Matrix
              </h3>
              <p className="text-[10px] text-[#94A3B8]">
                Probability (1 to 5) vs Impact (1 to 5) Exposure Grid (PMBOK Standard).
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Risk Exposure = Probability × Impact
            </span>
          </div>

          {/* 5x5 Heatmap Grid */}
          <div className="mt-4 overflow-x-auto pb-1">
            <div className="min-w-[540px] grid grid-cols-6 gap-1 text-center font-mono text-xs">
              <div className="p-2 text-slate-500 font-semibold text-[11px] flex items-center justify-center">
                P \ I
              </div>
              <div className="p-2 bg-slate-950 text-slate-400 font-bold rounded">1: Very Low</div>
              <div className="p-2 bg-slate-950 text-slate-400 font-bold rounded">2: Low</div>
              <div className="p-2 bg-slate-950 text-slate-400 font-bold rounded">3: Moderate</div>
              <div className="p-2 bg-slate-950 text-slate-400 font-bold rounded">4: High</div>
              <div className="p-2 bg-slate-950 text-slate-400 font-bold rounded">5: Critical</div>

              {[5, 4, 3, 2, 1].map((prob) => (
                <React.Fragment key={prob}>
                  <div className="p-2 bg-slate-950 text-slate-400 font-bold flex items-center justify-center rounded">
                    P{prob}
                  </div>
                  {[1, 2, 3, 4, 5].map((imp) => {
                    const exposure = prob * imp;
                    const matchingRisks = risks.filter(
                      (r) => (r.probability || 3) === prob && (r.impact || 3) === imp
                    );
                    const isCritical = exposure >= 15;
                    const isMedium = exposure >= 8 && exposure < 15;

                    return (
                      <div
                        key={imp}
                        className={`p-2.5 rounded border transition-all flex flex-col items-center justify-center min-h-[56px] ${
                          isCritical
                            ? "bg-rose-950/40 border-rose-800/60 text-rose-300"
                            : isMedium
                            ? "bg-amber-950/30 border-amber-800/50 text-amber-300"
                            : "bg-slate-950/50 border-slate-800 text-slate-400"
                        }`}
                      >
                        <span className="text-[10px] font-bold opacity-60">Score {exposure}</span>
                        {matchingRisks.length > 0 && (
                          <span className="mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                            {matchingRisks.length} {matchingRisks.length === 1 ? "Risk" : "Risks"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RAID Log Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No RAID items in current filter</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {selectedSprint
                  ? `No items are assigned specifically to ${selectedSprint.name}. ${
                      projectPool.length > 0
                        ? `There are ${projectPool.length} RAID item(s) logged across the broader project.`
                        : ""
                    }`
                  : "No items match the selected category."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {selectedSprint && projectPool.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSprintScopeFilter("all_project")}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  View All {projectPool.length} Project RAID Items
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Log New RAID Item
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 min-w-[840px]">
              <thead className="bg-[#060911] border-b border-[#1E293B] uppercase text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 pl-5 pr-3 whitespace-nowrap">Category</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Title & Root Cause / Description</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Exposure / Severity</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Mitigation / Resolution Plan</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Assigned Owner</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Sprint / Scope</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Created Date</th>
                  <th className="py-3.5 pr-5 pl-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/70">
                {filteredItems.map((item) => {
                  const owner = getOwner(item.ownerId);

                  return (
                    <tr key={item.id} className="hover:bg-[#0E1526] transition-colors">
                      {/* Category badge */}
                      <td className="py-3 pl-5 pr-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border inline-block ${
                            item.category === "Risk"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              : item.category === "Issue"
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                              : item.category === "Assumption"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Title & Desc */}
                      <td className="py-3 px-3 min-w-[200px] max-w-xs">
                        <span className="font-semibold text-white block">{item.title}</span>
                        <span className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {item.description}
                        </span>
                      </td>

                      {/* Exposure / Severity */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        {item.category === "Risk" ? (
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
                                (item.riskExposure || 0) >= 15
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : (item.riskExposure || 0) >= 8
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              Score {item.riskExposure} (P{item.probability} × I{item.impact})
                            </span>
                          </div>
                        ) : item.category === "Issue" ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
                              item.severity === "Critical"
                                ? "bg-rose-600 text-white"
                                : item.severity === "High"
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {item.severity} Severity
                          </span>
                        ) : item.category === "Dependency" ? (
                          <span className="text-slate-300 text-[11px]">
                            {item.dependencyType || "Finish-to-Start"}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Assumption</span>
                        )}
                      </td>

                      {/* Mitigation Strategy */}
                      <td className="py-3 px-3 min-w-[200px] max-w-xs text-slate-300 text-[11px]">
                        {item.category === "Risk" ? (
                          <div>
                            <span className="font-medium text-slate-200 block">
                              {item.mitigationStrategy || "Strategy pending review"}
                            </span>
                            {item.contingencyPlan && (
                              <span className="text-slate-500 block mt-0.5">
                                Contingency: {item.contingencyPlan}
                              </span>
                            )}
                          </div>
                        ) : item.category === "Issue" ? (
                          <span>{item.resolutionPlan || "Action plan active"}</span>
                        ) : item.category === "Assumption" ? (
                          <span className="text-slate-400">Impact if false: {item.impactIfFalse}</span>
                        ) : (
                          <span>{item.upstreamDownstream} dependency</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-3 text-slate-200 whitespace-nowrap">
                        {owner ? (
                          <div>
                            <span className="font-medium block">{owner.name}</span>
                            <span className="text-[10px] text-slate-400">{owner.role}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            onUpdateRaidItem({ ...item, status: e.target.value as any })
                          }
                          className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs cursor-pointer focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Identified">Identified</option>
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Mitigated">Mitigated</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Closed">Closed</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Validated">Validated</option>
                        </select>
                      </td>

                      {/* Sprint / Scope */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.sprintId ? (
                          (() => {
                            const sp = sprints?.find((s) => s.id === item.sprintId);
                            const isCurrent = selectedSprint?.id === item.sprintId;
                            return (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border inline-flex items-center gap-1 ${
                                  isCurrent
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-[#141C2E] text-sky-300 border-slate-800"
                                }`}
                                title={sp ? `${sp.name} (${sp.startDate} to ${sp.endDate})` : item.sprintId}
                              >
                                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                                {sp ? sp.name : item.sprintId}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 inline-flex items-center gap-1">
                            Project-Wide
                          </span>
                        )}
                      </td>

                      {/* Creation Date */}
                      <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {item.dateRaised || item.targetResolutionDate || new Date().toISOString().split("T")[0]}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-5 pl-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit RAID Item"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete ${item.category} "${item.title}"?`)) {
                                onDeleteRaidItem(item.id);
                              }
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete RAID Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit RAID Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <div className="flex items-center gap-2">
                {editingItem ? (
                  <Pencil className="w-4 h-4 text-sky-400" />
                ) : (
                  <Plus className="w-4 h-4 text-emerald-400" />
                )}
                <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                  {editingItem ? `Edit ${editingItem.category}: ${editingItem.title}` : "Log RAID Item"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">RAID Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as RaidCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Risk">Risk</option>
                    <option value="Assumption">Assumption</option>
                    <option value="Issue">Issue</option>
                    <option value="Dependency">Dependency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Owner</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {stakeholders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sprint and WBS Work Item Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Sprint</label>
                  <select
                    value={formData.sprintId || ""}
                    onChange={(e) => setFormData({ ...formData, sprintId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  >
                    <option value="">Project-wide (All Sprints)</option>
                    {sprints?.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} ({sp.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Associated WBS Work Item</label>
                  <select
                    value={formData.wbsItemId || ""}
                    onChange={(e) => setFormData({ ...formData, wbsItemId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono truncate"
                  >
                    <option value="">None (Project-wide item)</option>
                    {wbsItems?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code || w.wbsCode} - {w.title.slice(0, 30)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Cloud latency degradation during peak batch hours"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Detailed Description & Root Cause</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe context, vulnerability, and potential impact..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

              {/* Category-Specific Form Attributes */}
              {formData.category === "Risk" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Probability (1: Very Low to 5: Critical)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Impact (1: Very Low to 5: Critical)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={formData.impact}
                        onChange={(e) => setFormData({ ...formData, impact: Number(e.target.value) as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Proactive Mitigation Strategy</label>
                    <input
                      type="text"
                      value={formData.mitigationStrategy}
                      onChange={(e) => setFormData({ ...formData, mitigationStrategy: e.target.value })}
                      placeholder="Preventative actions, automated throttling, redundancy..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Contingency Plan (Trigger Plan)</label>
                    <input
                      type="text"
                      value={formData.contingencyPlan}
                      onChange={(e) => setFormData({ ...formData, contingencyPlan: e.target.value })}
                      placeholder="Fallback mechanisms if risk materializes..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </>
              )}

              {formData.category === "Issue" && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Severity</label>
                      <select
                        value={formData.severity || "Medium"}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Root Cause Analysis</label>
                      <input
                        type="text"
                        value={formData.rootCause || ""}
                        onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                        placeholder="Identified origin or root defect..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Resolution Plan / Action Plan</label>
                    <input
                      type="text"
                      value={formData.resolutionPlan || ""}
                      onChange={(e) => setFormData({ ...formData, resolutionPlan: e.target.value })}
                      placeholder="Active steps taken to resolve this issue..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {formData.category === "Assumption" && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Impact If Invalidated / Proves False</label>
                  <input
                    type="text"
                    value={formData.impactIfFalse || ""}
                    onChange={(e) => setFormData({ ...formData, impactIfFalse: e.target.value })}
                    placeholder="Consequences to timeline, scope or budget if assumption fails..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}

              {formData.category === "Dependency" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Direction</label>
                    <select
                      value={formData.upstreamDownstream || "Upstream"}
                      onChange={(e) => setFormData({ ...formData, upstreamDownstream: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="Upstream">Upstream (We depend on them)</option>
                      <option value="Downstream">Downstream (They depend on us)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Dependency Type</label>
                    <select
                      value={formData.dependencyType || "Finish-to-Start (FS)"}
                      onChange={(e) => setFormData({ ...formData, dependencyType: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="Finish-to-Start (FS)">Finish-to-Start (FS)</option>
                      <option value="Start-to-Start (SS)">Start-to-Start (SS)</option>
                      <option value="Finish-to-Finish (FF)">Finish-to-Finish (FF)</option>
                      <option value="Start-to-Finish (SF)">Start-to-Finish (SF)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Status and Creation Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  >
                    <option value="Identified">Identified</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Mitigated">Mitigated</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Closed">Closed</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Validated">Validated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Creation Date (Auto)</label>
                  <input
                    type="date"
                    value={formData.dateRaised || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFormData({ ...formData, dateRaised: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#1E293B] flex justify-end gap-2.5 shrink-0 bg-[#060911]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  {editingItem ? "Save Changes" : "Log Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Instant Risk Mitigation Status Report Modal */}
      {reportMarkdown && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-3xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-5 sm:px-6 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#060911] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-mono">Instant Risk Mitigation Status Report</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">PMBOK 7th Ed. Threat & Contingency Evaluation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(reportMarkdown);
                    alert("Report copied to clipboard!");
                  }}
                  className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 border border-slate-700"
                  title="Copy Markdown"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 border border-slate-700"
                  title="Print Report"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportMarkdown(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm text-slate-200 leading-relaxed font-sans prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap font-sans bg-[#060911] p-4 sm:p-5 rounded-lg border border-[#1E293B]">
                {reportMarkdown}
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">
                Generated via Gemini 3.8 Flash • Certified PMP Risk Standard
              </span>
              <button
                type="button"
                onClick={() => setReportMarkdown(null)}
                className="px-4 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
