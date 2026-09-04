import React, { useState } from "react";
import { Stakeholder, WbsItem, EvmMetrics } from "../types";
import {
  Users,
  Plus,
  DollarSign,
  Clock,
  Briefcase,
  Mail,
  Edit2,
  Trash2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  X,
  CheckCircle2,
} from "lucide-react";

interface StakeholdersViewProps {
  stakeholders: Stakeholder[];
  wbsItems: WbsItem[];
  evmMetrics: EvmMetrics;
  onAddStakeholder: (stakeholder: Stakeholder) => void;
  onUpdateStakeholder: (stakeholder: Stakeholder) => void;
  onDeleteStakeholder: (id: string) => void;
}

export const StakeholdersView: React.FC<StakeholdersViewProps> = ({
  stakeholders,
  wbsItems,
  evmMetrics,
  onAddStakeholder,
  onUpdateStakeholder,
  onDeleteStakeholder,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);

  // New stakeholder form
  const [formData, setFormData] = useState<Partial<Stakeholder>>({
    name: "",
    role: "",
    department: "Engineering",
    email: "",
    hourlyRate: 150,
    power: "High",
    interest: "High",
    engagement: "Supportive",
  });

  const totalHourlyRate = stakeholders.reduce((sum, s) => sum + (s.hourlyRate || 0), 0);
  const avgHourlyRate = stakeholders.length > 0 ? Math.round(totalHourlyRate / stakeholders.length) : 0;

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.role?.trim()) return;

    const newStk: Stakeholder = {
      id: `stk-${Date.now()}`,
      name: formData.name.trim(),
      role: formData.role.trim(),
      department: formData.department || "PMO",
      email: formData.email?.trim() || "stakeholder@enterprise.org",
      hourlyRate: Number(formData.hourlyRate) || 120,
      power: (formData.power as "High" | "Low") || "High",
      interest: (formData.interest as "High" | "Low") || "High",
      engagement: (formData.engagement as any) || "Supportive",
    };

    onAddStakeholder(newStk);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStakeholder) return;
    onUpdateStakeholder(editingStakeholder);
    setEditingStakeholder(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Stakeholder Directory & Labor Cost Economics
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                EVM Cost-Rate Driver
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Configure stakeholder hourly billing rates ($/hr). Directly impacts EVM Actual Cost (AC) and real-time CPI calculations through assigned WBS tasks.
            </p>
          </div>

          <button
            id="add-stakeholder-btn"
            onClick={() => {
              setFormData({
                name: "",
                role: "",
                department: "Engineering",
                email: "",
                hourlyRate: 150,
                power: "High",
                interest: "High",
                engagement: "Supportive",
              });
              setIsAddModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Stakeholder</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Aggregated Team Burn Rate
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalHourlyRate}
            <span className="text-xs text-[#94A3B8] font-sans font-normal"> / hour</span>
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Combined billing rate across {stakeholders.length} stakeholders
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Average Labor Rate
          </span>
          <div className="text-2xl font-bold text-[#38BDF8] mt-1">
            ${avgHourlyRate}
            <span className="text-xs text-[#94A3B8] font-sans font-normal"> / hour</span>
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Across {stakeholders.length} active project stakeholders
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Actual Labor Cost (AC)
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            ${(evmMetrics?.ac ?? 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            Feeds into EVM Cost Variance (CV: ${(evmMetrics?.cv ?? 0).toLocaleString()})
          </p>
        </div>

        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
            Current Cost Index (CPI)
          </span>
          <div
            className={`text-2xl font-bold mt-1 ${
              (evmMetrics?.cpi ?? 1.0) >= 1.0 ? "text-green-400" : "text-amber-400"
            }`}
          >
            {(evmMetrics?.cpi ?? 1.0).toFixed(2)}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1 font-sans">
            {(evmMetrics?.cpi ?? 1.0) >= 1.0 ? "Cost efficient (>=1.0)" : "Cost overrun (<1.0)"}
          </p>
        </div>
      </div>

      {/* Stakeholders Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1E293B] bg-[#060911] flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Stakeholder Register & Hourly Rates
          </h3>
          <span className="text-[10px] text-[#94A3B8]">
            Click any row to adjust hourly rate or profile
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#E2E8F0]">
            <thead className="bg-[#060911] border-b border-[#1E293B] uppercase text-[10px] font-bold text-slate-400 tracking-wider font-mono">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Stakeholder Name</th>
                <th className="py-3.5 px-3">Role & Department</th>
                <th className="py-3.5 px-3">Hourly Rate ($/hr)</th>
                <th className="py-3.5 px-3">Assigned Tasks</th>
                <th className="py-3.5 px-3">Actual Cost (AC)</th>
                <th className="py-3.5 px-3">Power / Interest</th>
                <th className="py-3.5 px-3">Engagement Level</th>
                <th className="py-3.5 pr-5 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {stakeholders.map((s) => {
                const assignedItems = wbsItems.filter((w) => w.assignedStakeholderId === s.id);
                const assignedHours = assignedItems.reduce((sum, w) => sum + (w.actualHours || 0), 0);
                const incurred = assignedHours * (s.hourlyRate || 0);

                return (
                  <tr key={s.id} className="hover:bg-[#0E1526] transition-colors">
                    <td className="py-3 pl-5 pr-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center border border-blue-500/30 text-[11px]">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <span>{s.name}</span>
                          <span className="block text-[11px] font-normal text-slate-400">{s.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-200 block">{s.role}</span>
                      <span className="text-[11px] text-slate-400">{s.department}</span>
                    </td>

                    {/* Hourly rate */}
                    <td className="py-3 px-3 font-mono">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold">
                        ${s.hourlyRate}/hr
                      </span>
                    </td>

                    {/* Assigned Tasks */}
                    <td className="py-3 px-3 font-mono">
                      <span className="font-semibold text-white">{assignedItems.length}</span>{" "}
                      <span className="text-slate-500">({assignedHours}h)</span>
                    </td>

                    {/* Incurred cost */}
                    <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                      ${incurred.toLocaleString()}
                    </td>

                    {/* Power / Interest */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {s.power === "High" ? "H" : "L"} Power • {s.interest === "High" ? "H" : "L"} Interest
                      </span>
                    </td>

                    {/* Engagement */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.engagement === "Leading"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : s.engagement === "Supportive"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.engagement}
                      </span>
                    </td>

                    <td className="py-3 pr-5 pl-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingStakeholder(s)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Stakeholder Rate & Profile"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove stakeholder "${s.name}"?`)) {
                              onDeleteStakeholder(s.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete Stakeholder"
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

      {/* PMI Power/Interest Grid Strategy */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <h3 className="text-base font-bold text-white mb-2">PMI Power / Interest Stakeholder Grid</h3>
        <p className="text-xs text-slate-400 mb-4">
          PMBOK Stakeholder Engagement Strategy quadrant classification.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* High Power / High Interest */}
          <div className="p-4 rounded-lg bg-[#060911] border border-[#1E293B]">
            <div className="flex items-center justify-between font-bold text-blue-300 mb-2">
              <span>Manage Closely (High Power / High Interest)</span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-900/60 rounded text-blue-200">
                Key Decision Makers
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Engage actively, provide weekly executive variance briefings, and involve in CCB approvals.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stakeholders
                .filter((s) => s.power === "High" && s.interest === "High")
                .map((s) => (
                  <span key={s.id} className="px-2 py-1 bg-slate-800 text-slate-200 rounded text-[11px] border border-slate-700">
                    {s.name} (${s.hourlyRate}/hr)
                  </span>
                ))}
            </div>
          </div>

          {/* High Power / Low Interest */}
          <div className="p-4 rounded-lg bg-[#060911] border border-[#1E293B]">
            <div className="flex items-center justify-between font-bold text-slate-200 mb-2">
              <span>Keep Satisfied (High Power / Low Interest)</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                Governance & Regulators
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Satisfy legal, security, and audit compliance needs without overloading with daily sprint minutiae.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stakeholders
                .filter((s) => s.power === "High" && s.interest === "Low")
                .map((s) => (
                  <span key={s.id} className="px-2 py-1 bg-slate-800 text-slate-200 rounded text-[11px] border border-slate-700">
                    {s.name} (${s.hourlyRate}/hr)
                  </span>
                ))}
            </div>
          </div>

          {/* Low Power / High Interest */}
          <div className="p-4 rounded-lg bg-[#060911] border border-[#1E293B]">
            <div className="flex items-center justify-between font-bold text-emerald-300 mb-2">
              <span>Keep Informed (Low Power / High Interest)</span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 rounded text-emerald-300">
                Core Delivery Team
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Maintain transparent standups, demoable increment reviews, and unblock impediment blockers.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stakeholders
                .filter((s) => s.power === "Low" && s.interest === "High")
                .map((s) => (
                  <span key={s.id} className="px-2 py-1 bg-slate-800 text-slate-200 rounded text-[11px] border border-slate-700">
                    {s.name} (${s.hourlyRate}/hr)
                  </span>
                ))}
            </div>
          </div>

          {/* Low Power / Low Interest */}
          <div className="p-4 rounded-lg bg-[#060911] border border-[#1E293B]">
            <div className="flex items-center justify-between font-bold text-slate-300 mb-2">
              <span>Monitor (Low Power / Low Interest)</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                Peripheral Stakeholders
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Monitor via general newsletter and automated milestone release notes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stakeholders
                .filter((s) => s.power === "Low" && s.interest === "Low")
                .map((s) => (
                  <span key={s.id} className="px-2 py-1 bg-slate-800 text-slate-200 rounded text-[11px] border border-slate-700">
                    {s.name} (${s.hourlyRate}/hr)
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Stakeholder Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-lg w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono">Add New Stakeholder</h3>
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
                  <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rachel Adams"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rachel@enterprise.org"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Project Role *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Lead Frontend Engineer"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Core Engineering"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Hourly Cost ($/hr) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Labor rate used to calculate EVM Actual Cost (AC) on WBS tasks
                  </span>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Engagement Level</label>
                  <select
                    value={formData.engagement}
                    onChange={(e) => setFormData({ ...formData, engagement: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Leading">Leading</option>
                    <option value="Supportive">Supportive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Resistant">Resistant</option>
                    <option value="Unaware">Unaware</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Power</label>
                  <select
                    value={formData.power}
                    onChange={(e) => setFormData({ ...formData, power: e.target.value as "High" | "Low" })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Interest</label>
                  <select
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value as "High" | "Low" })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
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
                  Add Stakeholder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stakeholder Modal */}
      {editingStakeholder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-lg w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#060911]">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                Edit Stakeholder: {editingStakeholder.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStakeholder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Hourly Billing Rate ($/hr) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingStakeholder.hourlyRate}
                  onChange={(e) =>
                    setEditingStakeholder({
                      ...editingStakeholder,
                      hourlyRate: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Modifying rate dynamically updates EVM labor actual costs across all assigned WBS items
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Role Title</label>
                  <input
                    type="text"
                    value={editingStakeholder.role}
                    onChange={(e) =>
                      setEditingStakeholder({
                        ...editingStakeholder,
                        role: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Engagement</label>
                  <select
                    value={editingStakeholder.engagement}
                    onChange={(e) =>
                      setEditingStakeholder({
                        ...editingStakeholder,
                        engagement: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Leading">Leading</option>
                    <option value="Supportive">Supportive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Resistant">Resistant</option>
                    <option value="Unaware">Unaware</option>
                  </select>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#1E293B] flex justify-end gap-2.5 shrink-0 bg-[#060911]">
                <button
                  type="button"
                  onClick={() => setEditingStakeholder(null)}
                  className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Update & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
