import React from "react";
import { Project } from "../types";
import { Trash2, AlertTriangle, X, Folder, Layers, Calendar, DollarSign } from "lucide-react";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (projectId: string) => void;
  project: Project | null;
  associatedSprintsCount?: number;
  associatedWbsCount?: number;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  project,
  associatedSprintsCount = 0,
  associatedWbsCount = 0,
}) => {
  if (!isOpen || !project) return null;

  const handleConfirm = () => {
    onConfirmDelete(project.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center">
      <div className="relative bg-[#0E111A] border border-rose-950/60 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2435] bg-[#140C12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Delete Project</h3>
              <p className="text-[11px] text-rose-300/80">Permanent removal of project workspace & configuration</p>
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Project Info Card */}
          <div className="bg-[#151926] border border-[#2B3349] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-xs"
                style={{ backgroundColor: project.color || "#818CF8" }}
              />
              <span className="font-bold text-sm text-white">{project.name}</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                [{project.projectCode}]
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] pt-1 border-t border-[#1F263B]">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Sprints: <strong className="text-slate-200">{associatedSprintsCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tasks: <strong className="text-slate-200">{associatedWbsCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Budget: <strong className="text-slate-200">${(project.authorizedBudget || project.baselineBudget).toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Status: <strong className="text-slate-200">{project.status}</strong></span>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-200/90">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-semibold text-amber-300 mb-0.5">What happens upon deletion:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>
                  {associatedSprintsCount > 0
                    ? `Associated sprints (${associatedSprintsCount}) and their schedules will be removed.`
                    : "No sprints are currently associated."}
                </li>
                <li>
                  {associatedWbsCount > 0
                    ? `Associated work packages (${associatedWbsCount}) will have their project link cleared.`
                    : "No work packages are linked."}
                </li>
                <li>Workspace scope will automatically reset to Enterprise Portfolio (All Projects).</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#151926] hover:bg-[#1E2435] text-slate-300 rounded-lg transition-colors cursor-pointer border border-[#2B3349]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm Delete Project</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
