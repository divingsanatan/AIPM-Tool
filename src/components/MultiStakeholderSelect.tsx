import React, { useState, useRef, useEffect } from "react";
import { Stakeholder } from "../types";
import { Users, X, Check, ChevronDown, Search, Star, UserPlus } from "lucide-react";

interface MultiStakeholderSelectProps {
  stakeholders: Stakeholder[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

export const MultiStakeholderSelect: React.FC<MultiStakeholderSelectProps> = ({
  stakeholders,
  selectedIds,
  onChange,
  label = "Assigned Stakeholders",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleStakeholder = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeStakeholder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const setAsLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Move to front of array
    const otherIds = selectedIds.filter((item) => item !== id);
    onChange([id, ...otherIds]);
  };

  const selectedStakeholders = selectedIds
    .map((id) => stakeholders.find((s) => s.id === id))
    .filter((s): s is Stakeholder => Boolean(s));

  const filteredStakeholders = stakeholders.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-slate-300 font-medium text-xs flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-sky-400" />
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal">
            ({selectedIds.length} assigned)
          </span>
        </label>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Main interactive pill/box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg p-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors"
      >
        {selectedStakeholders.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-500 text-xs px-2 py-1">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Click to assign team members...</span>
          </div>
        ) : (
          selectedStakeholders.map((stk, index) => {
            const isLead = index === 0;
            return (
              <span
                key={stk.id}
                className={`inline-flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded text-xs font-medium border ${
                  isLead
                    ? "bg-sky-950/70 border-sky-600/70 text-sky-200"
                    : "bg-slate-900 border-slate-700 text-slate-200"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isLead ? "bg-sky-500 text-slate-950" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {stk.name.charAt(0)}
                </div>
                <span className="truncate max-w-[110px]">{stk.name}</span>
                {isLead ? (
                  <span
                    className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold flex items-center gap-0.5"
                    title="Primary Lead"
                  >
                    <Star className="h-2 w-2 fill-sky-300" />
                    Lead
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => setAsLead(stk.id, e)}
                    className="text-[9px] text-slate-400 hover:text-sky-300 px-1 hover:bg-slate-800 rounded transition-colors"
                    title="Make Primary Lead"
                  >
                    Make Lead
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => removeStakeholder(stk.id, e)}
                  className="p-0.5 text-slate-400 hover:text-rose-300 rounded hover:bg-slate-800 transition-colors"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}

        <div className="ml-auto text-slate-500 pr-1 shrink-0">
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-[#0F172A] border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search box */}
          <div className="p-2 border-b border-slate-800 bg-[#0B0F19]">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, department..."
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          {/* Stakeholder checklist */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredStakeholders.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 italic">
                No stakeholders match "{search}"
              </div>
            ) : (
              filteredStakeholders.map((stk) => {
                const isSelected = selectedIds.includes(stk.id);
                const isLead = selectedIds[0] === stk.id;

                return (
                  <div
                    key={stk.id}
                    onClick={() => toggleStakeholder(stk.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? "bg-sky-950/50 border border-sky-800/60 text-white"
                        : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-sky-500 border-sky-500 text-slate-950"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div className="h-6 w-6 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {stk.name.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{stk.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {stk.role} • {stk.department} (${stk.hourlyRate}/hr)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isSelected && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                          {isLead ? "Lead" : "Co-assignee"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between text-[11px] text-slate-400">
            <span>First assigned member acts as Primary Lead</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
