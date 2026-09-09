import React, { useState, useMemo } from "react";
import { ChangeRequest, Stakeholder, Sprint, WbsItem, Project } from "../types";
import {
  GitPullRequest,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Trash2,
  Edit2,
  X,
  Layers,
  Timer,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export interface ChangeManagementViewProps {
  changeRequests: ChangeRequest[];
  stakeholders: Stakeholder[];
  sprints?: Sprint[];
  wbsItems?: WbsItem[];
  projects?: Project[];
  activeProjectId?: string;
  selectedSprintId?: string | null;
  onSelectSprint?: (sprintId: string | null) => void;
  onAddChangeRequest: (cr: ChangeRequest) => void;
  onUpdateChangeRequest: (cr: ChangeRequest) => void;
  onDeleteChangeRequest: (id: string) => void;
}

export const ChangeManagementView: React.FC<ChangeManagementViewProps> = ({
  changeRequests,
  stakeholders,
  sprints = [],
  wbsItems = [],
  projects = [],
  activeProjectId = "all",
  selectedSprintId,
  onSelectSprint,
  onAddChangeRequest,
  onUpdateChangeRequest,
  onDeleteChangeRequest,
}) => {
  const [viewMode, setViewMode] = useState<"auto" | "table" | "cards">("auto");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Pending CCB" | "Approved" | "Rejected">("ALL");
  const [sprintFilter, setSprintFilter] = useState<string>(selectedSprintId || "ALL");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCr, setEditingCr] = useState<ChangeRequest | null>(null);

  // CCB In-app Decision Dialog (avoids window.prompt in iframe)
  const [ccbActionTarget, setCcbActionTarget] = useState<{
    cr: ChangeRequest;
    status: "Approved" | "Rejected";
  } | null>(null);
  const [ccbRationaleText, setCcbRationaleText] = useState("");

  const [formData, setFormData] = useState<Partial<ChangeRequest>>({
    code: `CR-00${changeRequests.length + 1}`,
    title: "",
    reason: "",
    scopeImpact: "Moderate",
    scheduleImpactDays: 5,
    costImpact: 10000,
    requestorId: stakeholders[0]?.id || "",
    sprintId: sprints[0]?.id || "",
    wbsItemId: wbsItems[0]?.id || "",
    dateRequested: new Date().toISOString().split("T")[0],
    status: "Submitted",
    ccbDecisionNotes: "",
  });

  // Helpers to resolve entities
  const getStakeholder = (id?: string) => stakeholders.find((s) => s.id === id);

  const getWbsItem = (wbsItemId?: string) => {
    if (!wbsItemId) return null;
    return wbsItems.find((w) => w.id === wbsItemId);
  };

  const getSprintForCr = (cr: ChangeRequest): Sprint | null => {
    if (cr.sprintId) {
      const found = sprints.find((s) => s.id === cr.sprintId);
      if (found) return found;
    }
    // Fallback: check via associated WBS item
    if (cr.wbsItemId) {
      const item = getWbsItem(cr.wbsItemId);
      if (item?.sprintId) {
        const found = sprints.find((s) => s.id === item.sprintId);
        if (found) return found;
      }
    }
    return null;
  };

  // Metric computations
  const approvedCrs = useMemo(
    () =>
      changeRequests.filter(
        (cr) => cr.status === "Approved" || cr.status === "Implemented" || cr.ccbStatus === "Approved"
      ),
    [changeRequests]
  );

  const totalApprovedCostImpact = useMemo(
    () => approvedCrs.reduce((sum, cr) => sum + (cr.costImpact || cr.costImpactDollars || 0), 0),
    [approvedCrs]
  );

  const totalApprovedScheduleDelta = useMemo(
    () => approvedCrs.reduce((sum, cr) => sum + (cr.scheduleImpactDays || 0), 0),
    [approvedCrs]
  );

  const pendingCount = useMemo(
    () =>
      changeRequests.filter(
        (cr) => cr.status === "Submitted" || cr.status === "Under Review" || cr.ccbStatus === "Pending CCB"
      ).length,
    [changeRequests]
  );

  // Filtered change requests based on search, status, and sprint filter
  const filteredCrs = useMemo(() => {
    return changeRequests.filter((cr) => {
      // Status filter
      const crStatus = cr.status || cr.ccbStatus || "Submitted";
      if (statusFilter === "Pending CCB") {
        if (crStatus !== "Submitted" && crStatus !== "Under Review" && cr.ccbStatus !== "Pending CCB") {
          return false;
        }
      } else if (statusFilter === "Approved") {
        if (crStatus !== "Approved" && crStatus !== "Implemented") return false;
      } else if (statusFilter === "Rejected") {
        if (crStatus !== "Rejected") return false;
      }

      // Sprint filter
      if (sprintFilter !== "ALL") {
        const crSprint = getSprintForCr(cr);
        if (crSprint?.id !== sprintFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (cr.code || cr.crNumber || "").toLowerCase();
        const title = (cr.title || "").toLowerCase();
        const reason = (cr.reason || cr.description || "").toLowerCase();
        const requestor = getStakeholder(cr.requestorId || "")?.name.toLowerCase() || "";
        const wbs = getWbsItem(cr.wbsItemId);
        const wbsCode = (wbs?.wbsCode || "").toLowerCase();
        const wbsTitle = (wbs?.title || "").toLowerCase();
        const sprint = getSprintForCr(cr);
        const sprintName = (sprint?.name || "").toLowerCase();

        return (
          code.includes(q) ||
          title.includes(q) ||
          reason.includes(q) ||
          requestor.includes(q) ||
          wbsCode.includes(q) ||
          wbsTitle.includes(q) ||
          sprintName.includes(q)
        );
      }

      return true;
    });
  }, [changeRequests, statusFilter, sprintFilter, searchQuery, sprints, wbsItems, stakeholders]);

  const openAddModal = () => {
    setEditingCr(null);
    setFormData({
      code: `CR-00${changeRequests.length + 1}`,
      title: "",
      reason: "",
      scopeImpact: "Moderate",
      scheduleImpactDays: 5,
      costImpact: 12000,
      requestorId: stakeholders[0]?.id || "",
      sprintId: selectedSprintId || sprints[0]?.id || "",
      wbsItemId: wbsItems[0]?.id || "",
      dateRequested: new Date().toISOString().split("T")[0],
      status: "Submitted",
      ccbDecisionNotes: "",
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (cr: ChangeRequest) => {
    setEditingCr(cr);
    setFormData({
      code: cr.code || cr.crNumber || "",
      title: cr.title || "",
      reason: cr.reason || cr.description || "",
      scopeImpact: cr.scopeImpact || "Moderate",
      scheduleImpactDays: cr.scheduleImpactDays || 0,
      costImpact: cr.costImpact || cr.costImpactDollars || 0,
      requestorId: cr.requestorId || stakeholders[0]?.id || "",
      sprintId: cr.sprintId || "",
      wbsItemId: cr.wbsItemId || "",
      dateRequested: cr.dateRequested || cr.dateSubmitted || new Date().toISOString().split("T")[0],
      status: (cr.status as any) || "Submitted",
      ccbDecisionNotes: cr.ccbDecisionNotes || cr.decisionNotes || "",
    });
    setIsAddModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    if (editingCr) {
      const updatedCr: ChangeRequest = {
        ...editingCr,
        code: formData.code || editingCr.code,
        crNumber: formData.code || editingCr.crNumber,
        title: formData.title.trim(),
        reason: formData.reason || "",
        description: formData.reason || "",
        scopeImpact: formData.scopeImpact || "Moderate",
        scheduleImpactDays: Number(formData.scheduleImpactDays) || 0,
        costImpact: Number(formData.costImpact) || 0,
        costImpactDollars: Number(formData.costImpact) || 0,
        requestorId: formData.requestorId || "",
        sprintId: formData.sprintId || undefined,
        wbsItemId: formData.wbsItemId || undefined,
        dateRequested: formData.dateRequested || editingCr.dateRequested,
        status: (formData.status as any) || editingCr.status,
        ccbDecisionNotes: formData.ccbDecisionNotes || "",
        decisionNotes: formData.ccbDecisionNotes || "",
      };
      onUpdateChangeRequest(updatedCr);
    } else {
      const crNum = formData.code || `CR-00${changeRequests.length + 1}`;
      const newCr: ChangeRequest = {
        id: `cr-${Date.now()}`,
        crNumber: crNum,
        code: crNum,
        title: formData.title.trim(),
        reason: formData.reason || "",
        description: formData.reason || "",
        scopeImpact: formData.scopeImpact || "Moderate",
        scheduleImpactDays: Number(formData.scheduleImpactDays) || 0,
        costImpact: Number(formData.costImpact) || 0,
        costImpactDollars: Number(formData.costImpact) || 0,
        requestorId: formData.requestorId || stakeholders[0]?.id || "",
        sprintId: formData.sprintId || undefined,
        wbsItemId: formData.wbsItemId || undefined,
        dateRequested: formData.dateRequested || new Date().toISOString().split("T")[0],
        status: (formData.status as any) || "Submitted",
        ccbStatus: (formData.status as any) || "Submitted",
        ccbDecisionNotes: formData.ccbDecisionNotes || "",
        decisionNotes: formData.ccbDecisionNotes || "",
      };
      onAddChangeRequest(newCr);
    }

    setIsAddModalOpen(false);
  };

  const initiateCcbDecision = (cr: ChangeRequest, status: "Approved" | "Rejected") => {
    setCcbActionTarget({ cr, status });
    setCcbRationaleText(
      cr.ccbDecisionNotes ||
        cr.decisionNotes ||
        (status === "Approved"
          ? "Approved by CCB. Budget absorbable within current contingency reserve."
          : "Rejected by CCB. Impact exceeds acceptable schedule tolerance.")
    );
  };

  const confirmCcbDecision = () => {
    if (!ccbActionTarget) return;
    const { cr, status } = ccbActionTarget;
    onUpdateChangeRequest({
      ...cr,
      status,
      ccbStatus: status,
      ccbDecisionNotes: ccbRationaleText.trim(),
      decisionNotes: ccbRationaleText.trim(),
      reviewDate: new Date().toISOString().split("T")[0],
    });
    setCcbActionTarget(null);
  };

  // Helper when selecting WBS item in modal to auto-suggest sprint
  const handleWbsChange = (wbsId: string) => {
    const selectedItem = wbsItems.find((w) => w.id === wbsId);
    setFormData((prev) => ({
      ...prev,
      wbsItemId: wbsId,
      sprintId: selectedItem?.sprintId || prev.sprintId,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Change Management & CCB Log
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                PMBOK Integrated Change Control
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-3xl">
              Evaluate scope baselines, budget variations, and schedule adjustments with full visibility into which sprint part and work package each change affects.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <button
              id="add-cr-btn"
              onClick={openAddModal}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Change Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
              Approved Cost Delta
            </span>
            <DollarSign className="w-4 h-4 text-amber-400 opacity-70" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            +${totalApprovedCostImpact.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Authorized baseline variance across {approvedCrs.length} approved CRs
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
              Approved Schedule Delta
            </span>
            <Calendar className="w-4 h-4 text-[#38BDF8] opacity-70" />
          </div>
          <div className="text-2xl font-bold text-[#38BDF8] mt-1">
            +{totalApprovedScheduleDelta} Days
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Formal critical-path milestone adjustments
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
              Pending CCB Reviews
            </span>
            <Clock className="w-4 h-4 text-purple-400 opacity-70" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {pendingCount} Request{pendingCount === 1 ? "" : "s"}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Awaiting formal Change Control Board evaluation
          </p>
        </div>
      </div>

      {/* Smart Controls & Filters Toolbar */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by CR code, title, work item, sprint, or reason..."
              className="w-full bg-[#060911] border border-[#1E293B] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sprint Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#060911] border border-[#1E293B] rounded-lg px-2.5 py-1">
              <Timer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Sprint:</span>
              <select
                value={sprintFilter}
                onChange={(e) => {
                  setSprintFilter(e.target.value);
                  if (onSelectSprint) {
                    onSelectSprint(e.target.value === "ALL" ? null : e.target.value);
                  }
                }}
                className="bg-transparent text-xs text-white outline-none cursor-pointer pr-1 font-mono"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  All Sprints ({sprints.length})
                </option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-[#060911] border border-[#1E293B] rounded-lg p-0.5 text-[11px] font-medium">
              {(["ALL", "Pending CCB", "Approved", "Rejected"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? "bg-[#1E293B] text-white font-bold shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All Status" : st}
                </button>
              ))}
            </div>

            {/* View Mode Toggle (Auto / Table / Cards) */}
            <div className="hidden sm:flex items-center bg-[#060911] border border-[#1E293B] rounded-lg p-0.5 text-xs text-slate-400">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === "table" || viewMode === "auto"
                    ? "bg-[#1E293B] text-white shadow-xs"
                    : "hover:text-slate-200"
                }`}
                title="Table Layout (Desktop)"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === "cards" ? "bg-[#1E293B] text-white shadow-xs" : "hover:text-slate-200"
                }`}
                title="Card Layout (Responsive Stack)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(sprintFilter !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-[#1E293B]/60 text-[11px] text-slate-400">
            <span>Showing {filteredCrs.length} of {changeRequests.length} change requests:</span>
            {sprintFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Sprint: {sprints.find((s) => s.id === sprintFilter)?.name || sprintFilter}
                <button
                  onClick={() => {
                    setSprintFilter("ALL");
                    if (onSelectSprint) onSelectSprint(null);
                  }}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("ALL")} className="hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                "{searchQuery}"
                <button onClick={() => setSearchQuery("")} className="hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSprintFilter("ALL");
                setStatusFilter("ALL");
                setSearchQuery("");
                if (onSelectSprint) onSelectSprint(null);
              }}
              className="text-[#38BDF8] hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Responsive Table (Desktop) & Cards (Mobile/Tablet or Card Mode) */}
      {filteredCrs.length === 0 ? (
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-10 text-center">
          <GitPullRequest className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Change Requests match the selected filters</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting the sprint or status filters, or submit a new change request.</p>
          <button
            onClick={() => {
              setSprintFilter("ALL");
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
            className="mt-3 px-3 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* 1. Desktop Smart Table (Active on lg+ screens when in auto or table mode) */}
          <div
            className={`${
              viewMode === "cards" ? "hidden" : "hidden lg:block"
            } bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E2E8F0] min-w-[960px]">
                <thead className="bg-[#060911] border-b border-[#1E293B] uppercase text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                  <tr>
                    <th className="py-3.5 pl-5 pr-3 min-w-[260px] max-w-[340px]">CR & Affected Work Item</th>
                    <th className="py-3.5 px-3 min-w-[170px] whitespace-nowrap">Sprint Part</th>
                    <th className="py-3.5 px-3 min-w-[140px]">Requestor</th>
                    <th className="py-3.5 px-3 min-w-[220px] max-w-[300px]">Scope & Justification</th>
                    <th className="py-3.5 px-3 min-w-[130px] whitespace-nowrap">Impact</th>
                    <th className="py-3.5 px-3 min-w-[160px] max-w-[220px]">CCB Status</th>
                    <th className="py-3.5 pr-5 pl-3 text-right whitespace-nowrap min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/70">
                  {filteredCrs.map((cr) => {
                    const requestor = getStakeholder(cr.requestorId || "");
                    const cost = cr.costImpact ?? cr.costImpactDollars ?? 0;
                    const crCode = cr.code || cr.crNumber || `CR-${cr.id.slice(0, 4)}`;
                    const crStatus = cr.status || cr.ccbStatus || "Submitted";
                    const crReason = cr.reason || cr.description || "Project enhancement";
                    const crDate = cr.dateRequested || cr.dateSubmitted || "2026-03-28";
                    const crSprint = getSprintForCr(cr);
                    const crWbsItem = getWbsItem(cr.wbsItemId);

                    return (
                      <tr key={cr.id} className="hover:bg-[#0E1526] transition-colors">
                        {/* CR Code, Title & Work Item */}
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#38BDF8] bg-sky-500/10 px-1.5 py-0.5 rounded text-[11px] border border-sky-500/20">
                              {crCode}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {crDate}
                            </span>
                          </div>
                          <div className="font-semibold text-white mt-1 text-[13px] leading-snug">
                            {cr.title}
                          </div>
                          {/* Associated Work Item Tag */}
                          {crWbsItem ? (
                            <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded bg-indigo-950/50 border border-indigo-500/30 text-[11px] text-indigo-300 max-w-full">
                              <Layers className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="font-mono font-bold">{crWbsItem.wbsCode}</span>
                              <span className="truncate">{crWbsItem.title}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 italic mt-1 font-mono">
                              Work item unlinked
                            </div>
                          )}
                        </td>

                        {/* Sprint Part (Prominently Highlighted!) */}
                        <td className="py-3.5 px-3">
                          {crSprint ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-xs whitespace-nowrap">
                                <Timer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{crSprint.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    crSprint.status === "Active"
                                      ? "bg-emerald-400 animate-pulse"
                                      : crSprint.status === "Completed"
                                      ? "bg-blue-400"
                                      : "bg-slate-400"
                                  }`}
                                />
                                <span>{crSprint.status}</span>
                                <span className="text-slate-600">•</span>
                                <span>{crSprint.startDate.slice(5)} to {crSprint.endDate.slice(5)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 italic text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Backlog / Unassigned</span>
                            </div>
                          )}
                        </td>

                        {/* Requestor */}
                        <td className="py-3.5 px-3">
                          {requestor ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                                {requestor.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-slate-200 block truncate">{requestor.name}</span>
                                <span className="text-[10px] text-slate-400 block truncate">{requestor.role}</span>
                              </div>
                            </div>
                          ) : cr.requestedBy ? (
                            <div>
                              <span className="font-medium text-slate-200 block">{cr.requestedBy}</span>
                              <span className="text-[10px] text-slate-400">Requestor</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unknown</span>
                          )}
                        </td>

                        {/* Scope & Justification */}
                        <td className="py-3.5 px-3">
                          <div className="text-slate-300 text-xs line-clamp-3 leading-relaxed">
                            {crReason}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                cr.scopeImpact === "Major"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : cr.scopeImpact === "Minor"
                                  ? "bg-slate-800 text-slate-300 border-slate-700"
                                  : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                              }`}
                            >
                              Scope: {cr.scopeImpact || "Moderate"}
                            </span>
                          </div>
                        </td>

                        {/* Impact: Consolidated Schedule & Budget Variance */}
                        <td className="py-3.5 px-3 font-mono">
                          <div className="space-y-0.5">
                            <div className="text-white font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>+{cr.scheduleImpactDays || 0} days</span>
                            </div>
                            <div className="text-amber-400 font-bold flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-amber-400/80" />
                              <span>+${cost.toLocaleString()}</span>
                            </div>
                          </div>
                        </td>

                        {/* CCB Status & Decision Notes */}
                        <td className="py-3.5 px-3">
                          <div>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                                crStatus === "Approved" || crStatus === "Implemented"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : crStatus === "Rejected"
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                  : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              }`}
                            >
                              {crStatus}
                            </span>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight italic">
                              {cr.ccbDecisionNotes || cr.decisionNotes || "Awaiting CCB decision"}
                            </p>
                          </div>
                        </td>

                        {/* CCB Actions */}
                        <td className="py-3.5 pr-5 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {crStatus !== "Approved" && (
                              <button
                                onClick={() => initiateCcbDecision(cr, "Approved")}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-semibold cursor-pointer transition-colors"
                                title="Approve CR"
                              >
                                Approve
                              </button>
                            )}
                            {crStatus !== "Rejected" && (
                              <button
                                onClick={() => initiateCcbDecision(cr, "Rejected")}
                                className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded text-xs font-semibold cursor-pointer transition-colors"
                                title="Reject CR"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(cr)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Change Request"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete Change Request ${crCode}?`)) {
                                  onDeleteChangeRequest(cr.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete CR"
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
          </div>

          {/* 2. Responsive Card Layout (Active on mobile/tablet or when cards view is toggled) */}
          <div
            className={`${
              viewMode === "table" ? "hidden" : viewMode === "auto" ? "lg:hidden" : "block"
            } grid grid-cols-1 md:grid-cols-2 gap-4`}
          >
            {filteredCrs.map((cr) => {
              const requestor = getStakeholder(cr.requestorId || "");
              const cost = cr.costImpact ?? cr.costImpactDollars ?? 0;
              const crCode = cr.code || cr.crNumber || `CR-${cr.id.slice(0, 4)}`;
              const crStatus = cr.status || cr.ccbStatus || "Submitted";
              const crReason = cr.reason || cr.description || "Project enhancement";
              const crDate = cr.dateRequested || cr.dateSubmitted || "2026-03-28";
              const crSprint = getSprintForCr(cr);
              const crWbsItem = getWbsItem(cr.wbsItemId);

              return (
                <div
                  key={cr.id}
                  className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-700 transition-all space-y-3.5"
                >
                  {/* Top Bar: Code, Status, Quick Actions */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#1E293B]/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded text-xs border border-sky-500/20">
                        {crCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          crStatus === "Approved" || crStatus === "Implemented"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : crStatus === "Rejected"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {crStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {crStatus !== "Approved" && (
                        <button
                          onClick={() => initiateCcbDecision(cr, "Approved")}
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {crStatus !== "Rejected" && (
                        <button
                          onClick={() => initiateCcbDecision(cr, "Rejected")}
                          className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(cr)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Edit CR"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete Change Request ${crCode}?`)) {
                            onDeleteChangeRequest(cr.id);
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete CR"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base leading-snug">
                      {cr.title}
                    </h3>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Requested: {crDate} • Scope: {cr.scopeImpact || "Moderate"}
                    </div>
                  </div>

                  {/* SPRINT & WORK ITEM PART BANNER (Prominently displays sprint & work package) */}
                  <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{crSprint ? crSprint.name : "No Sprint Assigned"}</span>
                      </div>
                      {crSprint && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            crSprint.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {crSprint.status}
                        </span>
                      )}
                    </div>

                    {crWbsItem ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 border-t border-[#1E293B]/60 pt-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-mono font-bold bg-indigo-950/60 px-1 rounded">
                          {crWbsItem.wbsCode}
                        </span>
                        <span className="truncate">{crWbsItem.title}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic border-t border-[#1E293B]/60 pt-1.5">
                        No specific WBS work item linked
                      </div>
                    )}
                  </div>

                  {/* Impact Grid: 4 micro cards */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-sans">Schedule Delta</span>
                      <span className="text-white font-bold text-sm">+{cr.scheduleImpactDays || 0} days</span>
                    </div>
                    <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-sans">Budget Variance</span>
                      <span className="text-amber-400 font-bold text-sm">+${cost.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Requestor & Scope Reason */}
                  <div className="text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium">{requestor?.name || cr.requestedBy || "Unknown Requestor"}</span>
                      {requestor?.role && (
                        <span className="text-slate-500 text-[11px]">({requestor.role})</span>
                      )}
                    </div>
                    <div className="text-slate-300 text-xs bg-[#060911]/60 p-2.5 rounded-lg border border-[#1E293B]/60 leading-relaxed">
                      {crReason}
                    </div>
                  </div>

                  {/* CCB Decision Notes */}
                  {(cr.ccbDecisionNotes || cr.decisionNotes) && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5 text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono mb-0.5">
                        CCB Decision Notes:
                      </div>
                      <p className="text-slate-300 italic text-[11px] leading-relaxed">
                        {cr.ccbDecisionNotes || cr.decisionNotes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Change Request Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-2xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                  {editingCr ? `Edit Change Request (${editingCr.code || editingCr.crNumber})` : "Submit New Change Request"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">CR Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Requestor</label>
                  <select
                    value={formData.requestorId}
                    onChange={(e) => setFormData({ ...formData, requestorId: e.target.value })}
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

              <div>
                <label className="block text-slate-300 font-medium mb-1">Change Request Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Add Biometric FIDO2 Passkey Support to Auth Flow"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* SPRINT & WORK ITEM SELECTORS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#060911] border border-[#1E293B] rounded-lg p-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sky-300 font-medium mb-1">
                    <Timer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Target Sprint Part</span>
                  </label>
                  <select
                    value={formData.sprintId || ""}
                    onChange={(e) => setFormData({ ...formData, sprintId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  >
                    <option value="">-- Select Target Sprint --</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Indicates which agile sprint delivery cycle this change impacts.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-indigo-300 font-medium mb-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Associated Work Item (WBS)</span>
                  </label>
                  <select
                    value={formData.wbsItemId || ""}
                    onChange={(e) => handleWbsChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  >
                    <option value="">-- Select Work Package / Item --</option>
                    {wbsItems.map((w) => (
                      <option key={w.id} value={w.id}>
                        [{w.wbsCode}] {w.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Selecting a work item auto-populates its assigned sprint part.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Business Reason / Justification</label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Why is this change necessary? Market shifts, compliance mandate..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Scope Impact</label>
                  <select
                    value={formData.scopeImpact || "Moderate"}
                    onChange={(e) => setFormData({ ...formData, scopeImpact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Major">Major</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Schedule Impact (Days)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.scheduleImpactDays}
                    onChange={(e) => setFormData({ ...formData, scheduleImpactDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Cost Impact ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.costImpact}
                    onChange={(e) => setFormData({ ...formData, costImpact: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">CCB Status</label>
                  <select
                    value={formData.status || "Submitted"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  >
                    <option value="Submitted">Submitted (Pending Review)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Implemented">Implemented</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date Requested</label>
                  <input
                    type="date"
                    value={formData.dateRequested || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFormData({ ...formData, dateRequested: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">CCB Decision Notes & Rationale</label>
                <textarea
                  rows={2}
                  value={formData.ccbDecisionNotes}
                  onChange={(e) => setFormData({ ...formData, ccbDecisionNotes: e.target.value })}
                  placeholder="Record formal board decision comments or justification..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />
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
                  className="px-4 py-2 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {editingCr ? "Save Changes" : "Submit to CCB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CCB Decision Rationale Modal (In-App Modal replacing window.prompt) */}
      {ccbActionTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
                {ccbActionTarget.status === "Approved" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span>Record CCB {ccbActionTarget.status} Decision</span>
              </h3>
              <button
                onClick={() => setCcbActionTarget(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Please enter the formal Change Control Board rationale for{" "}
              <strong className="text-white font-mono">
                {ccbActionTarget.cr.code || ccbActionTarget.cr.crNumber}
              </strong>{" "}
              ({ccbActionTarget.cr.title}):
            </p>

            <textarea
              rows={3}
              value={ccbRationaleText}
              onChange={(e) => setCcbRationaleText(e.target.value)}
              placeholder="Enter decision rationale, contingency reserve impact, or justification..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white outline-none focus:border-[#38BDF8]"
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCcbActionTarget(null)}
                className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCcbDecision}
                className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  ccbActionTarget.status === "Approved"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                Confirm {ccbActionTarget.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
