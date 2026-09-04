import React, { useState } from "react";
import { ChangeRequest, Stakeholder } from "../types";
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
} from "lucide-react";

interface ChangeManagementViewProps {
  changeRequests: ChangeRequest[];
  stakeholders: Stakeholder[];
  onAddChangeRequest: (cr: ChangeRequest) => void;
  onUpdateChangeRequest: (cr: ChangeRequest) => void;
  onDeleteChangeRequest: (id: string) => void;
}

export const ChangeManagementView: React.FC<ChangeManagementViewProps> = ({
  changeRequests,
  stakeholders,
  onAddChangeRequest,
  onUpdateChangeRequest,
  onDeleteChangeRequest,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCr, setSelectedCr] = useState<ChangeRequest | null>(null);

  const [formData, setFormData] = useState<Partial<ChangeRequest>>({
    code: `CR-00${changeRequests.length + 1}`,
    title: "",
    reason: "",
    scopeImpact: "",
    scheduleImpactDays: 5,
    costImpact: 10000,
    requestorId: stakeholders[0]?.id || "",
    dateRequested: new Date().toISOString().split("T")[0],
    status: "Submitted",
    ccbDecisionNotes: "",
  });

  const approvedCrs = changeRequests.filter(
    (cr) => cr.status === "Approved" || cr.status === "Implemented" || cr.ccbStatus === "Approved"
  );
  const totalApprovedCostImpact = approvedCrs.reduce((sum, cr) => sum + (cr.costImpact || cr.costImpactDollars || 0), 0);
  const totalApprovedScheduleDelta = approvedCrs.reduce((sum, cr) => sum + (cr.scheduleImpactDays || 0), 0);
  const pendingCount = changeRequests.filter(
    (cr) => cr.status === "Submitted" || cr.status === "Under Review" || cr.ccbStatus === "Pending CCB"
  ).length;

  const getStakeholder = (id: string) => stakeholders.find((s) => s.id === id);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const crNum = formData.code || `CR-00${changeRequests.length + 1}`;
    const newCr: ChangeRequest = {
      id: `cr-${Date.now()}`,
      crNumber: crNum,
      code: crNum,
      title: formData.title.trim(),
      reason: formData.reason || "",
      scopeImpact: formData.scopeImpact || "",
      scheduleImpactDays: Number(formData.scheduleImpactDays) || 0,
      costImpact: Number(formData.costImpact) || 0,
      costImpactDollars: Number(formData.costImpact) || 0,
      requestorId: formData.requestorId || stakeholders[0]?.id || "",
      dateRequested: formData.dateRequested || new Date().toISOString().split("T")[0],
      status: (formData.status as any) || "Submitted",
      ccbDecisionNotes: formData.ccbDecisionNotes || "",
    };

    onAddChangeRequest(newCr);
    setIsAddModalOpen(false);
  };

  const handleCcbDecision = (cr: ChangeRequest, newStatus: "Approved" | "Rejected") => {
    const code = cr.code || cr.crNumber || "CR";
    const notes = prompt(`Enter CCB Decision Rationale for ${code}:`, cr.ccbDecisionNotes || cr.decisionNotes || "");
    if (notes !== null) {
      onUpdateChangeRequest({
        ...cr,
        status: newStatus,
        ccbStatus: newStatus,
        ccbDecisionNotes: notes,
        decisionNotes: notes,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Change Management & CCB Log
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                PMBOK Integrated Change Control
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Submit, evaluate, and record formal Change Control Board (CCB) decisions governing scope baselines, budget variations, and schedule adjustments.
            </p>
          </div>

          <button
            id="add-cr-btn"
            onClick={() => {
              setFormData({
                code: `CR-00${changeRequests.length + 1}`,
                title: "",
                reason: "",
                scopeImpact: "",
                scheduleImpactDays: 7,
                costImpact: 15000,
                requestorId: stakeholders[0]?.id || "",
                dateRequested: new Date().toISOString().split("T")[0],
                status: "Submitted",
                ccbDecisionNotes: "",
              });
              setIsAddModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Submit Change Request</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Approved Cost Baseline Delta
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            +${totalApprovedCostImpact.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Added to authorized project baseline across {approvedCrs.length} approved CRs
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Approved Schedule Impact
          </span>
          <div className="text-2xl font-bold text-[#38BDF8] mt-1">
            +{totalApprovedScheduleDelta} Days
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Formal critical-path milestone adjustments
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Pending CCB Reviews
          </span>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {pendingCount} Request{pendingCount === 1 ? "" : "s"}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Awaiting formal Change Control Board evaluation
          </p>
        </div>
      </div>

      {/* Change Requests Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#E2E8F0]">
            <thead className="bg-[#060911] border-b border-[#1E293B] uppercase text-[10px] font-bold text-slate-400 tracking-wider font-mono">
              <tr>
                <th className="py-3.5 pl-5 pr-3">CR Code & Title</th>
                <th className="py-3.5 px-3">Requestor</th>
                <th className="py-3.5 px-3">Scope & Reason</th>
                <th className="py-3.5 px-3">Schedule Delta</th>
                <th className="py-3.5 px-3">Cost Delta</th>
                <th className="py-3.5 px-3">CCB Status</th>
                <th className="py-3.5 px-3">Decision Notes</th>
                <th className="py-3.5 pr-5 pl-3 text-right">CCB Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {changeRequests.map((cr) => {
                const requestor = getStakeholder(cr.requestorId || "");
                const cost = cr.costImpact ?? cr.costImpactDollars ?? 0;
                const crCode = cr.code || cr.crNumber || `CR-${cr.id.slice(0, 4)}`;
                const crStatus = cr.status || cr.ccbStatus || "Submitted";
                const crReason = cr.reason || cr.description || "Project enhancement";
                const crDate = cr.dateRequested || cr.dateSubmitted || "Current Sprint";

                return (
                  <tr key={cr.id} className="hover:bg-[#0E1526] transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <div className="font-mono font-bold text-blue-400">{crCode}</div>
                      <div className="font-semibold text-white mt-0.5">{cr.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Requested: {crDate}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {requestor ? (
                        <div>
                          <span className="font-medium text-slate-200 block">{requestor.name}</span>
                          <span className="text-[10px] text-slate-400">{requestor.role}</span>
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

                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-slate-200">{crReason}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Scope: {cr.scopeImpact || "Standard"}</div>
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                      +{cr.scheduleImpactDays || 0} days
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                      +${cost.toLocaleString()}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                          crStatus === "Approved" || crStatus === "Implemented"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : crStatus === "Rejected"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {crStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-xs text-[11px] text-slate-400">
                      {cr.ccbDecisionNotes || cr.decisionNotes || "Awaiting formal CCB decision meeting"}
                    </td>

                    <td className="py-3 pr-5 pl-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {crStatus !== "Approved" && (
                          <button
                            onClick={() => handleCcbDecision(cr, "Approved")}
                            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-semibold cursor-pointer"
                            title="Approve CR"
                          >
                            Approve
                          </button>
                        )}
                        {crStatus !== "Rejected" && (
                          <button
                            onClick={() => handleCcbDecision(cr, "Rejected")}
                            className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded text-xs font-semibold cursor-pointer"
                            title="Reject CR"
                          >
                            Reject
                          </button>
                        )}
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

      {/* Add Change Request Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono">Submit New Change Request</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-4">
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
                  placeholder="e.g. Expand FedNow instant payment connector"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
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

              <div>
                <label className="block text-slate-300 font-medium mb-1">Scope Impact</label>
                <input
                  type="text"
                  value={formData.scopeImpact}
                  onChange={(e) => setFormData({ ...formData, scopeImpact: e.target.value })}
                  placeholder="Additional deliverables or modified acceptance criteria..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Schedule Impact (Days)</label>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Submit to CCB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
