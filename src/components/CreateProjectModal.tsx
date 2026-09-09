import React, { useState, useEffect } from "react";
import { Project, Stakeholder } from "../types";
import { X, FolderPlus, Calendar, DollarSign, User, Shield, Palette, Pencil, Trash2 } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject?: (project: Project) => void;
  onSubmit?: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  projectToEdit?: Project | null;
  stakeholders?: Stakeholder[];
}

const COLOR_PALETTE = [
  { name: "Indigo / Purple", hex: "#818CF8", bg: "bg-indigo-500" },
  { name: "Sky Blue", hex: "#38BDF8", bg: "bg-sky-500" },
  { name: "Emerald", hex: "#10B981", bg: "bg-emerald-500" },
  { name: "Rose / Pink", hex: "#EC4899", bg: "bg-pink-500" },
  { name: "Amber / Orange", hex: "#F59E0B", bg: "bg-amber-500" },
  { name: "Violet", hex: "#A855F7", bg: "bg-purple-500" },
  { name: "Cyan", hex: "#06B6D4", bg: "bg-cyan-500" },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  onSubmit,
  onUpdateProject,
  onDeleteProject,
  projectToEdit,
  stakeholders = [],
}) => {
  const isEditMode = !!projectToEdit;

  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [description, setDescription] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [baselineBudget, setBaselineBudget] = useState(150000);
  const [authorizedBudget, setAuthorizedBudget] = useState(150000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetEndDate, setTargetEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
  });
  const [selectedColor, setSelectedColor] = useState("#818CF8");
  const [status, setStatus] = useState<Project["status"]>("Active");
  const [autoCreateSprints, setAutoCreateSprints] = useState(true);

  // Sync state with projectToEdit or defaults
  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || "");
      setProjectCode(projectToEdit.projectCode || "");
      setDescription(projectToEdit.description || "");
      setProjectManager(projectToEdit.projectManager || "Sarah Jenkins, PMP");
      setSponsor(projectToEdit.sponsor || "David Harrison, EVP Digital Channels");
      setBaselineBudget(projectToEdit.baselineBudget || 150000);
      setAuthorizedBudget(projectToEdit.authorizedBudget || projectToEdit.baselineBudget || 150000);
      setStartDate(projectToEdit.startDate || new Date().toISOString().split("T")[0]);
      setTargetEndDate(projectToEdit.targetEndDate || "");
      setSelectedColor(projectToEdit.color || "#818CF8");
      setStatus(projectToEdit.status || "Active");
      setAutoCreateSprints(false);
    } else {
      setName("");
      setProjectCode("");
      setDescription("");
      setProjectManager(stakeholders[1]?.name || stakeholders[0]?.name || "Sarah Jenkins, PMP");
      setSponsor(stakeholders[0]?.name || "David Harrison, EVP Digital Channels");
      setBaselineBudget(150000);
      setAuthorizedBudget(150000);
      setStartDate(new Date().toISOString().split("T")[0]);
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setTargetEndDate(d.toISOString().split("T")[0]);
      setSelectedColor("#818CF8");
      setStatus("Active");
      setAutoCreateSprints(true);
    }
  }, [projectToEdit, isOpen, stakeholders]);

  if (!isOpen) return null;

  // Auto-generate project code from name if creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditMode && (!projectCode || projectCode.startsWith("PRJ-") || projectCode.length < 3)) {
      const words = val.trim().split(/\s+/);
      if (words.length > 1) {
        const initials = words.map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 4);
        setProjectCode(`${initials}-2026`);
      } else if (words.length === 1 && words[0].length >= 3) {
        setProjectCode(`${words[0].slice(0, 3).toUpperCase()}-2026`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditMode && projectToEdit) {
      const updatedProject: Project = {
        ...projectToEdit,
        name: name.trim(),
        projectCode: projectCode.trim() || projectToEdit.projectCode,
        description: description.trim(),
        projectManager: projectManager.trim() || projectToEdit.projectManager,
        sponsor: sponsor.trim() || projectToEdit.sponsor,
        baselineBudget: Number(baselineBudget) || 100000,
        authorizedBudget: Number(authorizedBudget || baselineBudget) || 100000,
        startDate,
        targetEndDate,
        status,
        color: selectedColor,
      };

      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      } else if (onSubmit) {
        onSubmit(updatedProject);
      } else if (onCreateProject) {
        onCreateProject(updatedProject);
      }
    } else {
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: name.trim(),
        projectCode: projectCode.trim() || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
        description: description.trim(),
        projectManager: projectManager.trim() || "Sarah Jenkins, PMP",
        sponsor: sponsor.trim() || "David Harrison, EVP",
        baselineBudget: Number(baselineBudget) || 100000,
        authorizedBudget: Number(authorizedBudget || baselineBudget) || 100000,
        startDate,
        targetEndDate,
        status,
        color: selectedColor,
      };

      if (onSubmit) {
        onSubmit(newProject);
      } else if (onCreateProject) {
        onCreateProject(newProject);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center">
      <div className="relative bg-[#0E111A] border border-[#22293C] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2435] bg-[#0A0D15]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-900"
              style={{ backgroundColor: selectedColor }}
            >
              {isEditMode ? <Pencil className="w-4 h-4 text-slate-900" /> : <FolderPlus className="w-4 h-4 text-slate-900" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isEditMode ? `Edit Project: ${projectToEdit?.name}` : "Create New Project"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEditMode
                  ? "Update project name, key, budget, leadership, and timeframe"
                  : "Add an independent project space with dedicated sprints & WBS"}
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
          {/* Project Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Flutter Project, iOS Client 2.0"
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Code / Key *</label>
              <input
                type="text"
                required
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                placeholder="e.g. FLT-2026"
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Project Theme Accent</span>
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    selectedColor === c.hex ? "scale-125 ring-2 ring-white" : "hover:scale-110 opacity-70"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the project goals, scope, and target outcomes..."
              className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Project Manager & Sponsor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Project Manager</span>
              </label>
              <input
                type="text"
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                placeholder="e.g. Sarah Jenkins, PMP"
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Executive Sponsor</span>
              </label>
              <input
                type="text"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                placeholder="e.g. David Harrison, EVP"
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Budget & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                <span>Authorized Baseline Budget ($)</span>
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={baselineBudget}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBaselineBudget(val);
                  setAuthorizedBudget(val);
                }}
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Project["status"])}
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Active">Active (In Flight)</option>
                <option value="Planning">Planning & Design</option>
                <option value="At Risk">At Risk</option>
                <option value="Critical">Critical</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Target Completion Date</span>
              </label>
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full bg-[#151926] border border-[#2B3349] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Quick options for creation only */}
          {!isEditMode && (
            <div className="pt-2">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateSprints}
                  onChange={(e) => setAutoCreateSprints(e.target.checked)}
                  className="rounded border-[#2B3349] text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px]">
                  Automatically initialize Sprint 1 (2-week cadence) under this project
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-[#1E2435] flex items-center justify-between gap-2.5">
            {isEditMode && onDeleteProject && projectToEdit ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(projectToEdit);
                }}
                className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#151926] hover:bg-[#1E2435] text-slate-300 rounded-lg transition-colors cursor-pointer border border-[#2B3349]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {isEditMode ? "Save Changes" : "Create Project"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
