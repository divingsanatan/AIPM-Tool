import React, { useState } from "react";
import {
  StatusConfig,
  WbsItem,
} from "../types";
import {
  STATUS_COLOR_PALETTES,
  DEFAULT_STATUS_CONFIGS,
} from "../utils/statusConfig";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  Info,
  Sliders,
  Check,
} from "lucide-react";

interface StatusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusConfigs: StatusConfig[];
  onUpdateStatusConfigs: (newConfigs: StatusConfig[]) => void;
  wbsItems: WbsItem[];
  onSyncAllTasks: () => void;
  onApplyStatusProgressToTasks: (statusKey: string, newProgress: number) => void;
  initialFocusedStatus?: string;
}

export const StatusManagerModal: React.FC<StatusManagerModalProps> = ({
  isOpen,
  onClose,
  statusConfigs,
  onUpdateStatusConfigs,
  wbsItems,
  onSyncAllTasks,
  onApplyStatusProgressToTasks,
  initialFocusedStatus,
}) => {
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusProgress, setNewStatusProgress] = useState<number>(70);
  const [newStatusColor, setNewStatusColor] = useState("purple");
  const [newStatusDesc, setNewStatusDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleAddCustomStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStatusName.trim();
    if (!trimmed) {
      setErrorMsg("Please provide a status name.");
      return;
    }

    // Check uniqueness
    const exists = statusConfigs.some(
      (s) => s.key.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`A status named "${trimmed}" already exists.`);
      return;
    }

    const palette = STATUS_COLOR_PALETTES[newStatusColor] || STATUS_COLOR_PALETTES.purple;
    const progress = Math.min(100, Math.max(0, Number(newStatusProgress) || 0));

    const newConfig: StatusConfig = {
      id: `custom-${Date.now()}`,
      key: trimmed,
      label: trimmed.toUpperCase(),
      progressPercent: progress,
      color: newStatusColor,
      dotColor: palette.dotColor,
      badgeBg: palette.badgeBg,
      badgeText: palette.badgeText,
      badgeBorder: palette.badgeBorder,
      isDefault: false,
      order: statusConfigs.length + 1,
      description: newStatusDesc.trim() || undefined,
    };

    const updated = [...statusConfigs, newConfig];
    onUpdateStatusConfigs(updated);
    setNewStatusName("");
    setNewStatusProgress(70);
    setNewStatusDesc("");
    setErrorMsg(null);
    triggerToast(`Added custom status "${newConfig.label}" linked to ${progress}% progress.`);
  };

  const handleProgressChange = (key: string, newProgress: number) => {
    const clamped = Math.min(100, Math.max(0, newProgress));
    const updated = statusConfigs.map((s) =>
      s.key === key ? { ...s, progressPercent: clamped } : s
    );
    onUpdateStatusConfigs(updated);
  };

  const handleDeleteStatus = (key: string) => {
    const target = statusConfigs.find((s) => s.key === key);
    if (!target || target.isDefault) return;

    if (
      window.confirm(
        `Are you sure you want to delete status "${target.label}"? Tasks with this status will be moved to "To Do".`
      )
    ) {
      const updated = statusConfigs.filter((s) => s.key !== key);
      onUpdateStatusConfigs(updated);
      triggerToast(`Removed status "${target.label}".`);
    }
  };

  const handleResetToDefaults = () => {
    if (
      window.confirm(
        "Reset workflow statuses to the default rules (Done: 100%, Demo Ready: 60%, Blocked: 50%, In Progress: 40%, To Do: 0%, Backlog: 0%)?"
      )
    ) {
      onUpdateStatusConfigs([...DEFAULT_STATUS_CONFIGS]);
      triggerToast("Reset statuses to default mapping.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#060911]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Workflow Statuses & Automatic Progress
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Dynamic Auto-Mark
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Work package progress is automatically marked according to its workflow stage.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toast Feedback */}
        {successToast && (
          <div className="bg-emerald-950/60 border-b border-emerald-500/40 px-5 py-2.5 text-xs text-emerald-300 flex items-center gap-2 font-medium animate-fadeIn">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto font-sans">
          {/* Active Rules Overview */}
          <div className="p-4 rounded-xl bg-[#060911] border border-[#1E293B]">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Configured Status-to-Progress Rules
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSyncAllTasks}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Update all work items in project to reflect these progress percentages"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Sync All Tasks ({wbsItems.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Status List */}
            <div className="space-y-2.5">
              {statusConfigs.map((status) => {
                const count = wbsItems.filter((i) => i.status === status.key).length;
                const isFocused = initialFocusedStatus === status.key;

                return (
                  <div
                    key={status.key}
                    className={`p-3 rounded-lg border transition-all ${
                      isFocused
                        ? "bg-indigo-950/20 border-indigo-500/60 ring-1 ring-indigo-500/30"
                        : "bg-[#090D16] border-[#1E293B]"
                    } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                  >
                    {/* Status Info */}
                    <div className="flex items-center gap-3 min-w-44">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${status.dotColor}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${status.badgeBg} ${status.badgeText} ${status.badgeBorder}`}
                          >
                            {status.label}
                          </span>
                          {!status.isDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          <span className="font-mono text-white font-semibold">{count}</span>{" "}
                          tasks currently in this status
                        </p>
                      </div>
                    </div>

                    {/* Progress Slider & Input */}
                    <div className="flex items-center gap-3 flex-1 sm:max-w-md">
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        Auto Progress:
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={status.progressPercent}
                        onChange={(e) =>
                          handleProgressChange(status.key, Number(e.target.value))
                        }
                        className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={status.progressPercent}
                          onChange={(e) =>
                            handleProgressChange(status.key, Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs text-center font-bold"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 justify-end shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onApplyStatusProgressToTasks(status.key, status.progressPercent)
                        }
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                        title={`Update all ${count} tasks in "${status.label}" to ${status.progressPercent}%`}
                      >
                        Apply to {count}
                      </button>

                      {!status.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStatus(status.key)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete custom status"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Custom Status Form */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#060911] border border-[#1E293B]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Add New Custom Status
              </h4>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddCustomStatus} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Code Review, QA Testing, UAT"
                    value={newStatusName}
                    onChange={(e) => {
                      setNewStatusName(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Linked Progress Percentage ({newStatusProgress}%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={newStatusProgress}
                      onChange={(e) => setNewStatusProgress(Number(e.target.value))}
                      className="w-full accent-purple-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-14 text-center font-mono font-bold text-xs text-purple-300 px-2 py-1 rounded bg-purple-500/20 border border-purple-500/30">
                      {newStatusProgress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Badge Color & Accent
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(STATUS_COLOR_PALETTES).map(([colKey, pal]) => (
                    <button
                      key={colKey}
                      type="button"
                      onClick={() => setNewStatusColor(colKey)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                        newStatusColor === colKey
                          ? `${pal.badgeBg} ${pal.badgeText} ${pal.badgeBorder} ring-2 ring-white/50 scale-105`
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${pal.dotColor}`} />
                      <span>{pal.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Stage Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peer verification before merge or demo stage"
                  value={newStatusDesc}
                  onChange={(e) => setNewStatusDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  <span>Custom statuses will appear across the WBS list, Board columns, and Dashboard.</span>
                </p>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total active workflow stages: <strong>{statusConfigs.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
