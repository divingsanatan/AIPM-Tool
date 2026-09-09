import React from "react";
import { Sprint } from "../types";
import { Trash2, AlertTriangle, X, Play } from "lucide-react";

interface DeleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onConfirmDelete?: (sprintId: string) => void;
  sprint: Sprint | null;
  taskCount?: number;
  associatedWbsCount?: number;
}

export const DeleteSprintModal: React.FC<DeleteSprintModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onConfirmDelete,
  sprint,
  taskCount = 0,
  associatedWbsCount,
}) => {
  if (!isOpen || !sprint) return null;

  const count = associatedWbsCount !== undefined ? associatedWbsCount : taskCount;

  const handleConfirm = () => {
    if (onConfirmDelete && sprint) {
      onConfirmDelete(sprint.id);
    } else if (onConfirm) {
      onConfirm();
    }
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
              <h3 className="text-sm sm:text-base font-bold text-white">Delete Sprint</h3>
              <p className="text-[11px] text-rose-300/80">Permanent removal of sprint timeline cycle</p>
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
          {/* Target Sprint Info Card */}
          <div className="bg-[#151926] border border-[#2B3349] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-emerald-500/80 text-emerald-400 flex items-center justify-center shrink-0">
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </div>
              <span className="font-bold text-sm text-white">{sprint.name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span>Project: <strong className="text-slate-200">{sprint.projectGroup}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-slate-200">{sprint.status}</strong></span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Dates: <span className="font-mono text-slate-300">{sprint.startDate}</span> to <span className="font-mono text-slate-300">{sprint.endDate}</span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-200/90">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-semibold text-amber-300 mb-0.5">Tasks remain safe in Backlog</p>
              <p>
                {count > 0 ? (
                  <>
                    This sprint currently has <strong className="text-white font-mono">{count} work packages</strong>.
                    Deleting this sprint will <strong>not</strong> delete your tasks; they will be unassigned and safely moved to the <strong>Backlog</strong>.
                  </>
                ) : (
                  <>
                    Deleting this sprint cycle removes it from your project delivery schedule.
                  </>
                )}
              </p>
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
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
