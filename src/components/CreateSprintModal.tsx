import React, { useState, useEffect } from "react";
import { Project, Sprint } from "../types";
import { X, PlayCircle, Calendar, Target, Folder, RotateCcw, Pencil, Trash2 } from "lucide-react";

interface CreateSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (sprint: Sprint) => void;
  onCreateSprint?: (sprint: Sprint) => void;
  onUpdateSprint?: (sprint: Sprint) => void;
  onDeleteSprint?: (sprint: Sprint) => void;
  projects: Project[];
  defaultProjectId?: string;
  existingSprints?: Sprint[];
  sprintToEdit?: Sprint | null;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onCreateSprint,
  onUpdateSprint,
  onDeleteSprint,
  projects,
  defaultProjectId,
  sprintToEdit,
}) => {
  const isEditMode = Boolean(sprintToEdit);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    sprintToEdit?.projectId || defaultProjectId || projects[0]?.id || "proj-flutter"
  );
  const [name, setName] = useState("");
  const [isCustomName, setIsCustomName] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [status, setStatus] = useState<Sprint["status"]>("Active");
  const [goal, setGoal] = useState("");

  // Initialize values when modal opens or sprintToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (sprintToEdit) {
        setSelectedProjectId(sprintToEdit.projectId || defaultProjectId || projects[0]?.id || "proj-flutter");
        setName(sprintToEdit.name);
        setIsCustomName(true);
        setStartDate(sprintToEdit.startDate);
        setEndDate(sprintToEdit.endDate);
        setStatus(sprintToEdit.status);
        setGoal(sprintToEdit.goal || "");
      } else {
        const projId = defaultProjectId || projects[0]?.id || "proj-flutter";
        setSelectedProjectId(projId);

        const today = new Date();
        const sIso = today.toISOString().split("T")[0];
        const twoWeeks = new Date(today);
        twoWeeks.setDate(today.getDate() + 14);
        const eIso = twoWeeks.toISOString().split("T")[0];

        setStartDate(sIso);
        setEndDate(eIso);
        setStatus("Active");
        setGoal("");
        setIsCustomName(false);

        const sStr = `${today.getMonth() + 1}/${today.getDate()}`;
        const eStr = `${twoWeeks.getMonth() + 1}/${twoWeeks.getDate()}`;
        setName(`Sprint (${sStr} - ${eStr})`);
      }
    }
  }, [isOpen, sprintToEdit, defaultProjectId, projects]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setIsCustomName(true);
  };

  const handleResetNameFromDates = () => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const sStr = `${s.getMonth() + 1}/${s.getDate()}`;
      const eStr = `${e.getMonth() + 1}/${e.getDate()}`;
      setName(`Sprint (${sStr} - ${eStr})`);
      setIsCustomName(false);
    }
  };

  const handleSetDuration = (days: number) => {
    const s = new Date(startDate);
    const e = new Date(s);
    e.setDate(s.getDate() + days);
    const endStr = e.toISOString().split("T")[0];
    setEndDate(endStr);

    if (!isCustomName) {
      const sStr = `${s.getMonth() + 1}/${s.getDate()}`;
      const eStr = `${e.getMonth() + 1}/${e.getDate()}`;
      setName(`Sprint (${sStr} - ${eStr})`);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (!isCustomName && val) {
      const s = new Date(val);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sStr = `${s.getMonth() + 1}/${s.getDate()}`;
        const eStr = `${e.getMonth() + 1}/${e.getDate()}`;
        setName(`Sprint (${sStr} - ${eStr})`);
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (!isCustomName && val) {
      const s = new Date(startDate);
      const e = new Date(val);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sStr = `${s.getMonth() + 1}/${s.getDate()}`;
        const eStr = `${e.getMonth() + 1}/${e.getDate()}`;
        setName(`Sprint (${sStr} - ${eStr})`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetProject = projects.find((p) => p.id === selectedProjectId);

    if (isEditMode && sprintToEdit) {
      const updatedSprint: Sprint = {
        ...sprintToEdit,
        name: name.trim(),
        startDate,
        endDate,
        status,
        projectId: selectedProjectId,
        projectGroup: targetProject?.name || sprintToEdit.projectGroup || "Flutter Project",
        goal: goal.trim(),
      };

      if (onUpdateSprint) {
        onUpdateSprint(updatedSprint);
      }
    } else {
      const newSprint: Sprint = {
        id: `sprint-${Date.now()}`,
        name: name.trim(),
        startDate,
        endDate,
        status,
        projectId: selectedProjectId,
        projectGroup: targetProject?.name || "Flutter Project",
        taskCount: 0,
        goal: goal.trim(),
      };

      const handler = onSubmit || onCreateSprint;
      if (handler) {
        handler(newSprint);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center">
      <div className="relative bg-[#0E111A] border border-[#22293C] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2435] bg-[#0A0D15]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              isEditMode
                ? "bg-sky-500/20 border-sky-500/30 text-sky-400"
                : "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
            }`}>
              {isEditMode ? <Pencil className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isEditMode ? "Edit Sprint Details" : "Create New Sprint"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEditMode
                  ? "Update sprint name, timeline cadence, status, or commitments"
                  : "Add an agile sprint cycle to your project timeline"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1E2435] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Project */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Project Space *</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  📁 {proj.name} ({proj.projectCode})
                </option>
              ))}
            </select>
          </div>

          {/* Sprint Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-medium">Sprint Name *</label>
              {isCustomName && (
                <button
                  type="button"
                  onClick={handleResetNameFromDates}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  title="Generate name based on start and end dates"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset to date format</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="sprint-name-input"
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Sprint 5 (4/1 - 4/15) or Sprint 8"
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-8 font-medium"
                autoFocus
              />
              {name.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setIsCustomName(true);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  title="Clear field"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Customize the sprint title (e.g. Sprint 7, Hardening Sprint, Beta Launch) or use the date range format.
            </p>
          </div>

          {/* Duration Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-300 font-medium">Sprint Cadence</span>
              <div className="flex items-center gap-1">
                {[
                  { label: "1 wk", days: 7 },
                  { label: "2 wks (Std)", days: 14 },
                  { label: "3 wks", days: 21 },
                  { label: "4 wks", days: 28 },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.days}
                    onClick={() => handleSetDuration(preset.days)}
                    className="px-2 py-0.5 bg-[#1C2030] hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-[#2B3349] rounded text-[10px] cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Sprint Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Active", "Planned", "Completed"] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-1.5 rounded-lg border text-center font-medium cursor-pointer transition-colors ${
                    status === st
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500 font-semibold"
                      : "bg-[#151926] text-slate-400 border-[#2B3349] hover:bg-[#1C2030]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sprint Goal / Commitment</span>
            </label>
            <textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Complete payment gateway migration, end-to-end integration tests..."
              className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#1E2435] flex items-center justify-between gap-2.5">
            <div>
              {isEditMode && sprintToEdit && onDeleteSprint && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeleteSprint(sprintToEdit);
                  }}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 hover:border-rose-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Delete this sprint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Sprint</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#151926] hover:bg-[#1E2435] text-slate-300 rounded-lg transition-colors cursor-pointer border border-[#2B3349]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 font-semibold rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5 ${
                  isEditMode
                    ? "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                }`}
              >
                {isEditMode ? <Pencil className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                <span>{isEditMode ? "Save Changes" : "Create Sprint"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
