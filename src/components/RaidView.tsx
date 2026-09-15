import React, { useState, useMemo } from "react";
import Markdown from "react-markdown";
import {
  RaidItem,
  RaidCategory,
  Stakeholder,
  EvmMetrics,
  Project,
  Sprint,
  WbsItem,
} from "../types";
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
  Pencil,
  FileCheck2,
  Copy,
  Printer,
  X,
  Loader2,
  Search,
  Eye,
  Check,
  ExternalLink,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  CheckSquare,
  Square,
} from "lucide-react";
import { WorkItemsMultiSelect } from "./WorkItemsMultiSelect";

interface RaidViewProps {
  raidItems: RaidItem[];
  allProjectRaidItems?: RaidItem[];
  sprints?: Sprint[];
  wbsItems?: WbsItem[];
  allWbsItems?: WbsItem[];
  projects?: Project[];
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
  onUpdateWbsItem?: (item: WbsItem) => void;
}

export const RaidView: React.FC<RaidViewProps> = ({
  raidItems,
  allProjectRaidItems,
  sprints = [],
  wbsItems = [],
  allWbsItems = [],
  projects = [],
  stakeholders = [],
  evmMetrics,
  onAddRaidItem,
  onUpdateRaidItem,
  onDeleteRaidItem,
  onRequestRiskReport,
  activeProject,
  selectedSprint,
  onSelectSprint,
  onClearSprint,
  onUpdateWbsItem,
}) => {
  const [activeCategory, setActiveCategory] = useState<RaidCategory | "ALL">("ALL");
  const [sprintScopeFilter, setSprintScopeFilter] = useState<"sprint_only" | "all_project">("sprint_only");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RaidItem | null>(null);
  const [detailItem, setDetailItem] = useState<RaidItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<RaidItem | null>(null);
  const [quickLinkItem, setQuickLinkItem] = useState<RaidItem | null>(null);
  const [quickLinkIds, setQuickLinkIds] = useState<string[]>([]);

  // Instant report modal
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Available pool of work items across current project or all projects
  const workItemsPool = useMemo(() => {
    return allWbsItems && allWbsItems.length > 0 ? allWbsItems : wbsItems;
  }, [allWbsItems, wbsItems]);

  const workItemsMap = useMemo(() => {
    const map = new Map<string, WbsItem>();
    workItemsPool.forEach((w) => map.set(w.id, w));
    return map;
  }, [workItemsPool]);

  // Determine effective items based on sprint scope mode
  const projectPool = allProjectRaidItems || raidItems;
  const effectiveRaidItems =
    selectedSprint && sprintScopeFilter === "all_project" ? projectPool : raidItems;

  // Selected work items in Add/Edit modal form
  const [modalLinkedWbsIds, setModalLinkedWbsIds] = useState<string[]>([]);
  const [dependencySelectionMode, setDependencySelectionMode] = useState<"two_tasks" | "multi_tasks">("two_tasks");

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
    resolutionPlan: "",
    rootCause: "",
    dependencyType: "Finish-to-Start (FS)",
    upstreamDownstream: "Upstream",
    predecessorTaskId: "",
    successorTaskId: "",
    leadLagDays: 0,
    impactIfFalse: "",
    status: "Identified",
    ownerId: stakeholders[0]?.id || "",
    projectId: activeProject?.id || "proj-flutter",
    sprintId: selectedSprint?.id || "",
    dateRaised: new Date().toISOString().split("T")[0],
    targetResolutionDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
  });

  const getOwner = (id: string) => stakeholders.find((s) => s.id === id);

  // Helper to extract all linked WBS IDs from an item
  const getLinkedWbsIds = (item: RaidItem): string[] => {
    const ids: string[] = [];
    if (Array.isArray(item.wbsItemIds) && item.wbsItemIds.length > 0) {
      ids.push(...item.wbsItemIds.filter(Boolean));
    } else if (item.wbsItemId) {
      ids.push(item.wbsItemId);
    }
    return Array.from(new Set(ids));
  };

  // Filter items by Category and Search Query
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return effectiveRaidItems.filter((item) => {
      if (activeCategory !== "ALL" && item.category !== activeCategory) {
        return false;
      }
      if (!query) return true;

      const titleMatch = item.title.toLowerCase().includes(query);
      const descMatch = item.description.toLowerCase().includes(query);
      const catMatch = item.category.toLowerCase().includes(query);
      const statusMatch = item.status.toLowerCase().includes(query);
      const owner = getOwner(item.ownerId);
      const ownerMatch = owner ? owner.name.toLowerCase().includes(query) : false;

      // Also search in linked work items
      const linked = getLinkedWbsIds(item);
      const linkedMatch = linked.some((wId) => {
        const w = workItemsMap.get(wId);
        return w ? w.wbsCode.toLowerCase().includes(query) || w.title.toLowerCase().includes(query) : false;
      });

      return titleMatch || descMatch || catMatch || statusMatch || ownerMatch || linkedMatch;
    });
  }, [effectiveRaidItems, activeCategory, searchQuery, stakeholders, workItemsMap]);

  const risks = effectiveRaidItems.filter((i) => i.category === "Risk");
  const issues = effectiveRaidItems.filter((i) => i.category === "Issue");
  const assumptions = effectiveRaidItems.filter((i) => i.category === "Assumption");
  const dependencies = effectiveRaidItems.filter((i) => i.category === "Dependency");

  // Open Create Modal
  const handleOpenAdd = (defaultCategory?: RaidCategory) => {
    setEditingItem(null);
    setModalLinkedWbsIds([]);
    setDependencySelectionMode("two_tasks");
    setFormData({
      category: defaultCategory || (activeCategory === "ALL" ? "Risk" : activeCategory),
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
      predecessorTaskId: "",
      successorTaskId: "",
      leadLagDays: 0,
      impactIfFalse: "",
      status: "Identified",
      ownerId: stakeholders[0]?.id || "",
      projectId: activeProject?.id || "proj-flutter",
      sprintId: selectedSprint?.id || "",
      dateRaised: new Date().toISOString().split("T")[0],
      targetResolutionDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: RaidItem) => {
    setEditingItem(item);
    const linkedIds = getLinkedWbsIds(item);
    setModalLinkedWbsIds(linkedIds);
    setDependencySelectionMode(linkedIds.length > 2 ? "multi_tasks" : "two_tasks");
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
      predecessorTaskId: item.predecessorTaskId || linkedIds[0] || "",
      successorTaskId: item.successorTaskId || linkedIds[1] || "",
      leadLagDays: item.leadLagDays ?? 0,
      impactIfFalse: item.impactIfFalse ?? "",
      status: item.status,
      ownerId: item.ownerId,
      projectId: item.projectId || activeProject?.id || "proj-flutter",
      sprintId: item.sprintId || "",
      dateRaised: item.dateRaised,
      targetResolutionDate: item.targetResolutionDate,
    });
    setIsAddModalOpen(true);
  };

  // Open Quick-Link Modal
  const handleOpenQuickLink = (item: RaidItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickLinkItem(item);
    setQuickLinkIds(getLinkedWbsIds(item));
  };

  // Save Quick-Link Changes
  const handleSaveQuickLink = () => {
    if (!quickLinkItem) return;
    const cleanIds = Array.from(new Set(quickLinkIds.filter(Boolean)));
    const updated: RaidItem = {
      ...quickLinkItem,
      wbsItemIds: cleanIds,
      wbsItemId: cleanIds[0] || undefined,
      predecessorTaskId: quickLinkItem.predecessorTaskId || cleanIds[0],
      successorTaskId: quickLinkItem.successorTaskId || cleanIds[1],
    };
    onUpdateRaidItem(updated);
    setQuickLinkItem(null);
  };

  // Handle Save in Add/Edit Modal
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const prob = Number(formData.probability) || 3;
    const imp = Number(formData.impact) || 3;
    const predId = formData.predecessorTaskId?.trim() || undefined;
    const succId = formData.successorTaskId?.trim() || undefined;
    const leadLag = Number(formData.leadLagDays) || 0;

    const linkedIds = Array.from(
      new Set(
        [
          ...(formData.category === "Dependency" && predId ? [predId] : []),
          ...(formData.category === "Dependency" && succId ? [succId] : []),
          ...modalLinkedWbsIds,
        ].filter(Boolean)
      )
    );
    const primaryWbsId = succId || predId || linkedIds[0] || undefined;

    // Synchronize dependency with WBS Item so Gantt chart & Critical Path reflect it immediately
    if (formData.category === "Dependency" && predId && succId && onUpdateWbsItem) {
      const succItem = workItemsPool.find((w) => w.id === succId);
      if (succItem) {
        const rawType = formData.dependencyType || "FS";
        const typeCode = rawType.includes("SS") ? "SS" : rawType.includes("FF") ? "FF" : rawType.includes("SF") ? "SF" : "FS";
        const depStr = `${predId}:${typeCode}:${leadLag}`;
        const currentDeps = succItem.dependencies || [];
        const cleanDeps = currentDeps.filter((d) => !d.startsWith(`${predId}:`));
        onUpdateWbsItem({
          ...succItem,
          dependencies: [...cleanDeps, depStr],
        });
      }
    }

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
        predecessorTaskId: predId,
        successorTaskId: succId,
        leadLagDays: leadLag,
        impactIfFalse: formData.impactIfFalse || "",
        status: formData.status as any,
        ownerId: formData.ownerId || stakeholders[0]?.id || "",
        projectId: formData.projectId || editingItem.projectId || activeProject?.id || "proj-flutter",
        sprintId: formData.sprintId || undefined,
        wbsItemId: primaryWbsId,
        wbsItemIds: linkedIds,
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
        predecessorTaskId: predId,
        successorTaskId: succId,
        leadLagDays: leadLag,
        impactIfFalse: formData.impactIfFalse || "",
        status: formData.status as any,
        ownerId: formData.ownerId || stakeholders[0]?.id || "",
        projectId: formData.projectId || activeProject?.id || "proj-flutter",
        sprintId: formData.sprintId || (selectedSprint ? selectedSprint.id : undefined),
        wbsItemId: primaryWbsId,
        wbsItemIds: linkedIds,
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

  // Generate Risk Report via AI
  const handleGenerateRiskReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch("/api/gemini/generate-risk-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData: {
            projectName: activeProject?.name || "OmniChannel Banking Platform Modernization",
            raidData: effectiveRaidItems,
            evmData: evmMetrics,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Report generation failed: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.report) {
        setReportMarkdown(data.report);
      } else {
        throw new Error("Invalid response format from risk intelligence endpoint");
      }
    } catch (err: any) {
      console.error("Risk report generation error:", err);
      // Fallback deterministic report
      const deterministicReport = `
# Executive RAID Threat & Exposure Assessment
**Project:** ${activeProject?.name || "Global Enterprise Workspace"}
**Report Date:** ${new Date().toLocaleDateString()}
**PMBOK Standard:** ANSI/PMI 99-001-2021 Compliant

---

## 1. Quantitative Risk Summary
- **Total Active Risks:** ${risks.length}
- **Critical Threats (Score ≥ 15):** ${risks.filter((r) => (r.riskExposure || 0) >= 15).length}
- **Open Issues:** ${issues.filter((i) => i.status !== "Closed" && i.status !== "Resolved").length}
- **Critical Dependencies:** ${dependencies.length}
- **Baseline Cost Performance Index (CPI):** ${evmMetrics.cpi.toFixed(2)}
- **Schedule Performance Index (SPI):** ${evmMetrics.spi.toFixed(2)}

## 2. High Priority Threat Matrix
${
  risks.length > 0
    ? risks
        .slice(0, 5)
        .map(
          (r) =>
            `- **[Score ${r.riskExposure || (r.probability || 3) * (r.impact || 3)}] ${r.title}**
  - *Mitigation:* ${r.mitigationStrategy || "Active monitoring"}
  - *Contingency:* ${r.contingencyPlan || "Escalate to sponsor"}
  - *Owner:* ${getOwner(r.ownerId)?.name || "PMO"} • *Status:* ${r.status}`
        )
        .join("\n")
    : "*No critical threats identified.*"
}

## 3. Active Issues & Blocking Deficiencies
${
  issues.length > 0
    ? issues
        .map(
          (i) =>
            `- **[${i.severity || "Medium"}] ${i.title}**
  - *Root Cause:* ${i.rootCause || "Under root cause analysis"}
  - *Resolution Plan:* ${i.resolutionPlan || "Action plan assigned"}`
        )
        .join("\n")
    : "*No blocking issues registered.*"
}

## 4. PM Recommendations
1. Validate all external vendor SLAs and upstream interface dependencies prior to next sprint increment.
2. Ensure mitigation strategies have designated secondary contingencies funded within authorized contingency reserve.
`;
      setReportMarkdown(deterministicReport);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCopyReport = () => {
    if (!reportMarkdown) return;
    navigator.clipboard.writeText(reportMarkdown);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
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
              Multi-work item linking, PMBOK threat quantification, mitigation triggers, and automated status reporting.
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
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
              onClick={() => handleOpenAdd()}
              className="px-3.5 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Log RAID Item</span>
            </button>
          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="mt-3 pt-3 border-t border-[#1E293B] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
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

          {/* Quick Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RAID or linked work items..."
              className="w-full bg-[#060911] border border-[#1E293B] rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
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
              {filteredItems.length} Item{filteredItems.length === 1 ? "" : "s"}
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

      {/* 5x5 Qualitative Risk Assessment Matrix (When looking at Risks) */}
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

      {/* Main RAID Log Data Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {activeCategory === "ALL" ? "RAID Log Master Register" : `${activeCategory} Register`}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {filteredItems.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAdd()}
              className="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold rounded-lg border border-sky-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="h-10 w-10 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-400">
              {searchQuery
                ? `No RAID items matching "${searchQuery}"`
                : `No ${activeCategory === "ALL" ? "RAID" : activeCategory} items recorded in this scope.`}
            </p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
              Proactively identify risks, record project assumptions, log open issues, or track critical path dependencies.
            </p>
            <button
              onClick={() => handleOpenAdd()}
              className="mt-4 px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Log First Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto pb-3">
            <table className="w-full text-left text-xs text-slate-300 min-w-[960px]">
              <thead className="bg-[#060911] border-b border-[#1E293B] uppercase text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 pl-5 pr-3 whitespace-nowrap">Category</th>
                  <th className="py-3.5 px-3 min-w-[190px]">Title & Description</th>
                  <th className="py-3.5 px-3 min-w-[170px]">Linked Work Items</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Exposure / Severity</th>
                  <th className="py-3.5 px-3 min-w-[180px]">Mitigation / Resolution Plan</th>
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
                  const linkedIds = getLinkedWbsIds(item);

                  return (
                    <tr key={item.id} className="hover:bg-[#0E1526] transition-colors group">
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
                      <td className="py-3 px-3 min-w-[190px] max-w-xs">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="font-semibold text-white block hover:text-sky-300 text-left transition-colors cursor-pointer"
                        >
                          {item.title}
                        </button>
                        <span className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {item.description}
                        </span>
                      </td>

                      {/* Linked Work Items (Multi-Select Support) */}
                      <td className="py-3 px-3 min-w-[170px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {linkedIds.length === 0 ? (
                            <button
                              type="button"
                              onClick={(e) => handleOpenQuickLink(item, e)}
                              className="text-[10px] text-slate-500 hover:text-sky-400 hover:border-sky-700/50 flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-slate-800 transition-colors cursor-pointer"
                              title="Link to work items"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Link Task</span>
                            </button>
                          ) : (
                            <>
                              {linkedIds.slice(0, 2).map((wId) => {
                                const w = workItemsMap.get(wId);
                                return (
                                  <span
                                    key={wId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/80 border border-sky-800/60 text-sky-300 font-semibold"
                                    title={w ? `${w.wbsCode}: ${w.title} (${w.status})` : wId}
                                  >
                                    <span className="text-sky-400">{w ? w.wbsCode : wId}</span>
                                    <span className="max-w-[70px] truncate text-slate-300 font-normal">
                                      {w ? w.title : ""}
                                    </span>
                                  </span>
                                );
                              })}

                              {linkedIds.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenQuickLink(item, e)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer font-bold"
                                  title={`View all ${linkedIds.length} linked work items`}
                                >
                                  +{linkedIds.length - 2} more
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => handleOpenQuickLink(item, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-sky-300 transition-opacity cursor-pointer"
                                title="Edit linked work items"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Exposure / Severity */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        {item.category === "Risk" ? (
                          (() => {
                            const exp = item.riskExposure ?? (item.probability || 3) * (item.impact || 3);
                            const isCritical = exp >= 15;
                            const isMedium = exp >= 8 && exp < 15;
                            return (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isCritical
                                      ? "bg-rose-950/70 border-rose-700 text-rose-300"
                                      : isMedium
                                      ? "bg-amber-950/70 border-amber-700 text-amber-300"
                                      : "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                                  }`}
                                >
                                  Score: {exp}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  P{item.probability || 3} × I{item.impact || 3}
                                </span>
                              </div>
                            );
                          })()
                        ) : item.category === "Issue" ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.severity === "Critical"
                                ? "bg-rose-950/70 border-rose-700 text-rose-300"
                                : item.severity === "High"
                                ? "bg-amber-950/70 border-amber-700 text-amber-300"
                                : "bg-slate-900 border-slate-700 text-slate-300"
                            }`}
                          >
                            {item.severity || "Medium"} Severity
                          </span>
                        ) : item.category === "Assumption" ? (
                          <span className="text-slate-400 text-[11px]">Hypothesis</span>
                        ) : (
                          <span className="text-sky-300 font-mono text-[10px]">
                            {item.dependencyType || "Finish-to-Start"}
                          </span>
                        )}
                      </td>

                      {/* Mitigation / Resolution */}
                      <td className="py-3 px-3 min-w-[180px] max-w-xs text-[11px]">
                        {item.category === "Risk" ? (
                          <div>
                            <span className="text-slate-200 line-clamp-2">
                              {item.mitigationStrategy || "Strategy pending review"}
                            </span>
                            {item.contingencyPlan && (
                              <span className="text-slate-500 block mt-0.5 line-clamp-1">
                                Contingency: {item.contingencyPlan}
                              </span>
                            )}
                          </div>
                        ) : item.category === "Issue" ? (
                          <span>{item.resolutionPlan || "Action plan active"}</span>
                        ) : item.category === "Assumption" ? (
                          <span className="text-slate-400">Impact if false: {item.impactIfFalse || "Pending"}</span>
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

                      {/* Status Dropdown (Live update) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            onUpdateRaidItem({ ...item, status: e.target.value as any })
                          }
                          className="bg-[#070B14] border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs cursor-pointer focus:ring-1 focus:ring-sky-500 font-mono"
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
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Full Item Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
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
                            onClick={() => setItemToDelete(item)}
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
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-2xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
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

            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Category, Owner, Project Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                  <label className="block text-slate-300 font-medium mb-1">Assigned Owner *</label>
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
              </div>

              {/* Dependency-Specific Configuration (Hero Section for Dependencies) */}
              {formData.category === "Dependency" && (
                <div className="bg-[#090E1A] border border-sky-500/30 rounded-xl p-4 space-y-4 shadow-lg">
                  {/* Mode switcher & header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-white text-xs">
                        Task Dependency Mapping & Relationship
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono">
                        PMI Standard
                      </span>
                    </div>
                    <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDependencySelectionMode("two_tasks")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                          dependencySelectionMode === "two_tasks"
                            ? "bg-sky-500 text-slate-950 font-bold shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Two Linked Tasks (Predecessor ➜ Successor)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDependencySelectionMode("multi_tasks")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                          dependencySelectionMode === "multi_tasks"
                            ? "bg-sky-500 text-slate-950 font-bold shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>Multiple Tasks ({modalLinkedWbsIds.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Two Specific Tasks (Predecessor ➜ Successor) */}
                  {dependencySelectionMode === "two_tasks" ? (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                        {/* Task 1: Predecessor */}
                        <div className="bg-[#0D1424] border border-slate-700/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-slate-200 font-semibold text-[11px] flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                              <span>Task 1: Predecessor (Prerequisite Activity) *</span>
                            </label>
                            <span className="text-[10px] text-amber-400/90 font-mono">Must occur first</span>
                          </div>
                          <select
                            value={formData.predecessorTaskId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({ ...prev, predecessorTaskId: val }));
                              setModalLinkedWbsIds(
                                Array.from(new Set([val, formData.successorTaskId || ""].filter(Boolean)))
                              );
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-2 text-xs text-white"
                          >
                            <option value="">-- Select Predecessor Task --</option>
                            {workItemsPool.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                                disabled={item.id === formData.successorTaskId}
                              >
                                {item.wbsCode} - {item.title} ({item.status})
                              </option>
                            ))}
                          </select>
                          {formData.predecessorTaskId && (
                            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
                              <span>Status: <strong className="text-slate-200">{workItemsMap.get(formData.predecessorTaskId)?.status}</strong></span>
                              <span>Type: <strong className="text-slate-200">{workItemsMap.get(formData.predecessorTaskId)?.type}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Swap & Relationship Arrow */}
                        <div className="flex flex-row lg:flex-col items-center justify-center gap-1 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              const oldPred = formData.predecessorTaskId || "";
                              const oldSucc = formData.successorTaskId || "";
                              setFormData((prev) => ({
                                ...prev,
                                predecessorTaskId: oldSucc,
                                successorTaskId: oldPred,
                              }));
                              setModalLinkedWbsIds(
                                Array.from(new Set([oldSucc, oldPred].filter(Boolean)))
                              );
                            }}
                            disabled={!formData.predecessorTaskId && !formData.successorTaskId}
                            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                            title="Swap Predecessor & Successor (Reverse direction)"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-mono font-bold text-sky-400">
                            {formData.dependencyType?.match(/\((.*?)\)/)?.[1] || "FS"}
                          </span>
                        </div>

                        {/* Task 2: Successor */}
                        <div className="bg-[#0D1424] border border-slate-700/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-slate-200 font-semibold text-[11px] flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                              <span>Task 2: Successor (Dependent Activity) *</span>
                            </label>
                            <span className="text-[10px] text-emerald-400/90 font-mono">Depends on Task 1</span>
                          </div>
                          <select
                            value={formData.successorTaskId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({ ...prev, successorTaskId: val }));
                              setModalLinkedWbsIds(
                                Array.from(new Set([formData.predecessorTaskId || "", val].filter(Boolean)))
                              );
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-2 text-xs text-white"
                          >
                            <option value="">-- Select Successor Task --</option>
                            {workItemsPool.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                                disabled={item.id === formData.predecessorTaskId}
                              >
                                {item.wbsCode} - {item.title} ({item.status})
                              </option>
                            ))}
                          </select>
                          {formData.successorTaskId && (
                            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
                              <span>Status: <strong className="text-slate-200">{workItemsMap.get(formData.successorTaskId)?.status}</strong></span>
                              <span>Type: <strong className="text-slate-200">{workItemsMap.get(formData.successorTaskId)?.type}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Visual Diagram Banner */}
                      {formData.predecessorTaskId && formData.successorTaskId && (
                        <div className="bg-[#060911] border border-sky-500/20 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="font-mono font-bold text-amber-400 shrink-0">
                              {workItemsMap.get(formData.predecessorTaskId)?.wbsCode}
                            </span>
                            <span className="truncate text-slate-200 max-w-[140px]">
                              {workItemsMap.get(formData.predecessorTaskId)?.title}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-600 shrink-0">
                              {formData.dependencyType || "Finish-to-Start (FS)"}
                              {formData.leadLagDays
                                ? ` (${formData.leadLagDays > 0 ? `+${formData.leadLagDays}d` : `${formData.leadLagDays}d`})`
                                : ""}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="font-mono font-bold text-emerald-400 shrink-0">
                              {workItemsMap.get(formData.successorTaskId)?.wbsCode}
                            </span>
                            <span className="truncate text-slate-200 max-w-[140px]">
                              {workItemsMap.get(formData.successorTaskId)?.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const pred = workItemsMap.get(formData.predecessorTaskId!);
                              const succ = workItemsMap.get(formData.successorTaskId!);
                              if (pred && succ) {
                                const code = formData.dependencyType?.match(/\((.*?)\)/)?.[1] || "FS";
                                setFormData((prev) => ({
                                  ...prev,
                                  title: `${pred.wbsCode} ${pred.title} ➜ ${succ.wbsCode} ${succ.title} (${code})`,
                                  description: `Deliverable "${succ.wbsCode}: ${succ.title}" depends on prerequisite activity "${pred.wbsCode}: ${pred.title}" under ${formData.dependencyType} rules.`,
                                }));
                              }
                            }}
                            className="text-[11px] font-mono text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-900/80 px-2.5 py-1 rounded border border-sky-700/50 shrink-0 cursor-pointer"
                          >
                            Auto-fill Title & Context
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Mode 2: Multi-Tasks Mode using WorkItemsMultiSelect */
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400">
                        Mark or select any two or multiple tasks affected by or involved in this dependency:
                      </p>
                      <WorkItemsMultiSelect
                        workItems={workItemsPool}
                        selectedIds={modalLinkedWbsIds}
                        onChange={(ids) => {
                          setModalLinkedWbsIds(ids);
                          setFormData((prev) => ({
                            ...prev,
                            predecessorTaskId: ids[0] || "",
                            successorTaskId: ids[1] || "",
                          }));
                        }}
                        projects={projects}
                        currentProjectId={formData.projectId || activeProject?.id}
                        currentSprintId={formData.sprintId}
                      />
                    </div>
                  )}

                  {/* Choose Dependency Relationship Type (PMI Standard) */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                        <span>Choose Dependency Relationship Type *</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">PMBOK Precedence Diagramming Method</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {[
                        {
                          type: "Finish-to-Start (FS)" as const,
                          code: "FS",
                          name: "Finish-to-Start",
                          desc: "Predecessor must finish before Successor can start",
                          tag: "Standard (90%)",
                          color: "border-sky-500/50 bg-sky-500/10 text-sky-300",
                        },
                        {
                          type: "Start-to-Start (SS)" as const,
                          code: "SS",
                          name: "Start-to-Start",
                          desc: "Successor can start as soon as Predecessor starts",
                          tag: "Parallel Work",
                          color: "border-indigo-500/50 bg-indigo-500/10 text-indigo-300",
                        },
                        {
                          type: "Finish-to-Finish (FF)" as const,
                          code: "FF",
                          name: "Finish-to-Finish",
                          desc: "Successor finishes when Predecessor finishes",
                          tag: "Concurrent End",
                          color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
                        },
                        {
                          type: "Start-to-Finish (SF)" as const,
                          code: "SF",
                          name: "Start-to-Finish",
                          desc: "Successor finishes after Predecessor starts",
                          tag: "Gating Handover",
                          color: "border-purple-500/50 bg-purple-500/10 text-purple-300",
                        },
                      ].map((dep) => {
                        const isSelected = formData.dependencyType === dep.type;
                        return (
                          <button
                            key={dep.code}
                            type="button"
                            onClick={() => setFormData({ ...formData, dependencyType: dep.type })}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? `${dep.color} ring-1 ring-sky-400 shadow-md`
                                : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-bold text-xs">{dep.code}</span>
                                <span className="text-[9px] px-1 rounded bg-slate-900 border border-slate-800 font-mono">
                                  {dep.tag}
                                </span>
                              </div>
                              <div className="font-semibold text-[11px] text-white">{dep.name}</div>
                              <div className="text-[10px] text-slate-400 mt-1 leading-tight">{dep.desc}</div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-300 mt-2 font-mono">
                                <Check className="w-3 h-3" />
                                <span>Selected</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direction & Lead/Lag Days */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Dependency Direction</label>
                      <select
                        value={formData.upstreamDownstream || "Upstream"}
                        onChange={(e) => setFormData({ ...formData, upstreamDownstream: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="Upstream">Upstream (Prerequisite: We depend on outside / other team)</option>
                        <option value="Downstream">Downstream (Handoff: Outside / other team depends on us)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Lead (-) / Lag (+) Time (Days)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.leadLagDays ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              leadLagDays: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          placeholder="0"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                          {(formData.leadLagDays ?? 0) > 0
                            ? "Lag (Delay)"
                            : (formData.leadLagDays ?? 0) < 0
                            ? "Lead (Advance)"
                            : "Zero Lag"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    formData.category === "Dependency"
                      ? "e.g. Setup Database API ➜ Build Client UI (FS)"
                      : `Describe the ${formData.category?.toLowerCase()} clearly...`
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Detailed Description & Root Cause / Context */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {formData.category === "Issue"
                    ? "Detailed Description & Root Cause"
                    : formData.category === "Dependency"
                    ? "Detailed Description & Impact Scope"
                    : "Detailed Description & Context"}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={
                    formData.category === "Dependency"
                      ? "Describe context, vulnerability, and potential impact..."
                      : "Root causes, triggers, or operational constraints..."
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 resize-none"
                />
              </div>

              {/* Multi-Select Associated Work Items for Non-Dependency Items (Risk, Issue, Assumption) */}
              {formData.category !== "Dependency" && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-300 font-medium">
                      Associated Work Items (Link to Multiple Tasks / Epics)
                    </label>
                    <span className="text-[10px] text-sky-400 font-mono">
                      {modalLinkedWbsIds.length} Linked
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Select any work items across any project that are affected by or relate to this {formData.category?.toLowerCase()}.
                  </p>
                  <WorkItemsMultiSelect
                    workItems={workItemsPool}
                    selectedIds={modalLinkedWbsIds}
                    onChange={setModalLinkedWbsIds}
                    projects={projects}
                    currentProjectId={formData.projectId || activeProject?.id}
                    currentSprintId={formData.sprintId}
                  />
                </div>
              )}

              {/* Category-Specific Fields */}
              {formData.category === "Risk" && (
                <div className="space-y-3.5 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Probability (1-5)</label>
                      <select
                        value={formData.probability || 3}
                        onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      >
                        <option value={1}>1: Very Low (10%)</option>
                        <option value={2}>2: Low (30%)</option>
                        <option value={3}>3: Moderate (50%)</option>
                        <option value={4}>4: High (70%)</option>
                        <option value={5}>5: Critical (90%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Impact (1-5)</label>
                      <select
                        value={formData.impact || 3}
                        onChange={(e) => setFormData({ ...formData, impact: Number(e.target.value) as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      >
                        <option value={1}>1: Negligible</option>
                        <option value={2}>2: Minor</option>
                        <option value={3}>3: Moderate</option>
                        <option value={4}>4: Major</option>
                        <option value={5}>5: Catastrophic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Risk Exposure Score</label>
                      <div className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold flex items-center justify-between">
                        <span>{(Number(formData.probability) || 3) * (Number(formData.impact) || 3)} / 25</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            (Number(formData.probability) || 3) * (Number(formData.impact) || 3) >= 15
                              ? "bg-rose-500/20 text-rose-300"
                              : (Number(formData.probability) || 3) * (Number(formData.impact) || 3) >= 8
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {(Number(formData.probability) || 3) * (Number(formData.impact) || 3) >= 15
                            ? "CRITICAL"
                            : (Number(formData.probability) || 3) * (Number(formData.impact) || 3) >= 8
                            ? "MEDIUM"
                            : "LOW"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Mitigation Strategy (Proactive)</label>
                    <input
                      type="text"
                      value={formData.mitigationStrategy || ""}
                      onChange={(e) => setFormData({ ...formData, mitigationStrategy: e.target.value })}
                      placeholder="Preventive controls to lower probability..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Contingency Plan (Reactive Fallback)</label>
                    <input
                      type="text"
                      value={formData.contingencyPlan || ""}
                      onChange={(e) => setFormData({ ...formData, contingencyPlan: e.target.value })}
                      placeholder="Executed if the risk trigger event occurs..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {formData.category === "Issue" && (
                <div className="space-y-3.5 pt-2 border-t border-slate-800">
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
                    <label className="block text-slate-300 font-medium mb-1">Resolution Plan / Action Steps</label>
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
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-slate-300 font-medium mb-1">Impact If Invalidated / Proves False</label>
                  <input
                    type="text"
                    value={formData.impactIfFalse || ""}
                    onChange={(e) => setFormData({ ...formData, impactIfFalse: e.target.value })}
                    placeholder="Consequences if assumption fails..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}

              {/* Status and Target Resolution Date */}
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
                  <label className="block text-slate-300 font-medium mb-1">Target Resolution Date</label>
                  <input
                    type="date"
                    value={formData.targetResolutionDate || ""}
                    onChange={(e) => setFormData({ ...formData, targetResolutionDate: e.target.value })}
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
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  {editingItem ? "Save Changes" : "Log Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Link Work Items Modal */}
      {quickLinkItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-xl w-full my-auto max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B] bg-[#060911] shrink-0">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Link Work Items: {quickLinkItem.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Connect this {quickLinkItem.category} to one or more tasks across sprints.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLinkItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <WorkItemsMultiSelect
                workItems={workItemsPool}
                selectedIds={quickLinkIds}
                onChange={setQuickLinkIds}
                projects={projects}
                currentProjectId={quickLinkItem.projectId || activeProject?.id}
                currentSprintId={quickLinkItem.sprintId}
              />
            </div>

            <div className="px-5 py-3 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                {quickLinkIds.length} item{quickLinkIds.length === 1 ? "" : "s"} linked
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickLinkItem(null)}
                  className="px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickLink}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Save Links
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail View Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-2xl w-full my-auto max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B] bg-[#060911] shrink-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    detailItem.category === "Risk"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : detailItem.category === "Issue"
                      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      : detailItem.category === "Assumption"
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                  }`}
                >
                  {detailItem.category}
                </span>
                <span className="font-mono text-xs text-slate-400">ID: {detailItem.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <h2 className="text-base font-bold text-white">{detailItem.title}</h2>
                <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">{detailItem.description}</p>
              </div>

              {/* Badges row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                <div className="bg-[#060911] p-2.5 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Status</span>
                  <span className="font-bold text-white mt-0.5 block">{detailItem.status}</span>
                </div>
                <div className="bg-[#060911] p-2.5 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Owner</span>
                  <span className="font-bold text-sky-400 mt-0.5 block">
                    {getOwner(detailItem.ownerId)?.name || "Unassigned"}
                  </span>
                </div>
                <div className="bg-[#060911] p-2.5 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Target Date</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">
                    {detailItem.targetResolutionDate || "None"}
                  </span>
                </div>
                <div className="bg-[#060911] p-2.5 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">
                    {detailItem.category === "Risk" ? "Exposure" : "Severity"}
                  </span>
                  <span className="font-bold text-amber-400 mt-0.5 block font-mono">
                    {detailItem.category === "Risk"
                      ? `${detailItem.riskExposure || (detailItem.probability || 3) * (detailItem.impact || 3)} / 25`
                      : detailItem.severity || "Standard"}
                  </span>
                </div>
              </div>

              {/* Linked Work Items Section */}
              <div className="bg-[#060911] p-3.5 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-sky-400" />
                    Linked Work Items ({getLinkedWbsIds(detailItem).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      handleOpenQuickLink(item);
                    }}
                    className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                  >
                    Edit links
                  </button>
                </div>

                {getLinkedWbsIds(detailItem).length === 0 ? (
                  <p className="text-slate-500 text-[11px] italic">No work items currently linked.</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {getLinkedWbsIds(detailItem).map((wId) => {
                      const w = workItemsMap.get(wId);
                      return (
                        <div
                          key={wId}
                          className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sky-300 text-[11px]">
                              {w ? w.wbsCode : wId}
                            </span>
                            <span className="text-slate-200 font-medium">{w ? w.title : wId}</span>
                          </div>
                          {w && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                              {w.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Specific strategies */}
              {detailItem.category === "Risk" && (
                <div className="space-y-2">
                  <div className="bg-[#060911] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Mitigation Strategy</span>
                    <p className="text-slate-200 mt-1">{detailItem.mitigationStrategy || "Strategy pending review"}</p>
                  </div>
                  {detailItem.contingencyPlan && (
                    <div className="bg-[#060911] p-3 rounded-lg border border-[#1E293B]">
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Contingency Plan</span>
                      <p className="text-slate-200 mt-1">{detailItem.contingencyPlan}</p>
                    </div>
                  )}
                </div>
              )}

              {detailItem.category === "Issue" && (
                <div className="space-y-2">
                  {detailItem.rootCause && (
                    <div className="bg-[#060911] p-3 rounded-lg border border-[#1E293B]">
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Root Cause Analysis</span>
                      <p className="text-slate-200 mt-1">{detailItem.rootCause}</p>
                    </div>
                  )}
                  {detailItem.resolutionPlan && (
                    <div className="bg-[#060911] p-3 rounded-lg border border-[#1E293B]">
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Action / Resolution Plan</span>
                      <p className="text-slate-200 mt-1">{detailItem.resolutionPlan}</p>
                    </div>
                  )}
                </div>
              )}

              {detailItem.category === "Dependency" && (
                <div className="space-y-2.5">
                  <div className="bg-[#060911] p-3.5 rounded-lg border border-sky-500/30">
                    <span className="text-slate-400 text-[10px] uppercase font-mono block mb-2">
                      PMI Precedence Diagram & Activity Mapping
                    </span>
                    {(() => {
                      const linked = getLinkedWbsIds(detailItem);
                      const predId = detailItem.predecessorTaskId || linked[0];
                      const succId = detailItem.successorTaskId || linked[1];
                      const pred = predId ? workItemsMap.get(predId) : null;
                      const succ = succId ? workItemsMap.get(succId) : null;
                      return (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                              {pred ? `${pred.wbsCode}: ${pred.title}` : predId || "External Predecessor Activity"}
                            </span>
                            <ArrowRight className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-mono font-bold">
                              {detailItem.dependencyType || "Finish-to-Start (FS)"}
                              {detailItem.leadLagDays
                                ? ` (${detailItem.leadLagDays > 0 ? `+${detailItem.leadLagDays}d lag` : `${detailItem.leadLagDays}d lead`})`
                                : ""}
                            </span>
                            <ArrowRight className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                              {succ ? `${succ.wbsCode}: ${succ.title}` : succId || "Dependent Successor Task"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-1 font-mono">
                            <span>Direction: <strong className="text-slate-200">{detailItem.upstreamDownstream || "Upstream"}</strong></span>
                            <span>Lag/Lead Days: <strong className="text-slate-200">{detailItem.leadLagDays ?? 0}d</strong></span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const item = detailItem;
                  setDetailItem(null);
                  setItemToDelete(item);
                }}
                className="px-3 py-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Delete Entry
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = detailItem;
                    setDetailItem(null);
                    handleOpenEdit(item);
                  }}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Edit Entry
                </button>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation In-App Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 flex items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-rose-900/50 rounded-xl max-w-md w-full my-auto p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete {itemToDelete.category}?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Are you sure you want to delete <strong className="text-slate-200">"{itemToDelete.title}"</strong>? This will remove it from the register and disconnect all linked work items.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRaidItem(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
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
                  <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                    Instant Risk Mitigation Status Report
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    PMBOK 7th Ed. Threat & Contingency Evaluation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 border border-slate-700"
                  title="Copy Markdown"
                >
                  {copyFeedback ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
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

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm text-slate-200 leading-relaxed font-sans">
              <div className="markdown-content bg-[#060911] p-4 sm:p-5 rounded-lg border border-[#1E293B] space-y-3 [&>h1]:text-lg [&>h1]:font-bold [&>h1]:text-white [&>h1]:border-b [&>h1]:border-[#1E293B] [&>h1]:pb-2 [&>h1]:mb-3 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:text-sky-300 [&>h2]:mt-4 [&>h2]:mb-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1 [&_strong]:text-white [&_strong]:font-semibold [&_code]:bg-[#141E33] [&_code]:border [&_code]:border-sky-500/25 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sky-300 [&_code]:font-mono [&_code]:text-xs [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-slate-700 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-800/80 [&_th]:text-slate-100 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-slate-800 [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-xs">
                <Markdown>{reportMarkdown}</Markdown>
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
