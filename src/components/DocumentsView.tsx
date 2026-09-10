import React, { useState, useRef } from "react";
import { ProjectDocument, WbsItem, Project } from "../types";
import {
  FileText,
  Plus,
  Upload,
  Sparkles,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Layers,
  X,
  FileCode,
  FolderOpen,
  UploadCloud,
  FileCheck,
  FolderX,
} from "lucide-react";

interface DocumentsViewProps {
  documents: ProjectDocument[];
  projects?: Project[];
  activeProjectId?: string;
  activeProject?: Project;
  onSelectProject?: (projectId: string) => void;
  onAddDocument: (doc: ProjectDocument) => void;
  onDeleteDocument: (id: string) => void;
  onTriggerWbsImportFromDoc: (doc: ProjectDocument) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  projects = [],
  activeProjectId = "all",
  activeProject,
  onSelectProject,
  onAddDocument,
  onDeleteDocument,
  onTriggerWbsImportFromDoc,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null);

  const defaultProjId =
    activeProjectId && activeProjectId !== "all"
      ? activeProjectId
      : projects[0]?.id || "proj-001";

  const [formData, setFormData] = useState<Partial<ProjectDocument>>({
    title: "",
    category: "WBS",
    content: "",
    uploadedBy: "Rachel Adams (Lead PM)",
    projectId: defaultProjId,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleProcessFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text !== undefined) {
        setFormData((prev) => {
          // Auto generate formatted title from filename if empty
          const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          const formattedTitle = baseName
            .split(" ")
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

          let detectedCategory = prev.category || "WBS";
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes("charter")) detectedCategory = "Charter";
          else if (lowerName.includes("sow")) detectedCategory = "SOW";
          else if (lowerName.includes("arch")) detectedCategory = "Architecture";
          else if (lowerName.includes("req") || lowerName.includes("spec")) detectedCategory = "Requirements";
          else if (lowerName.includes("wbs")) detectedCategory = "WBS";

          return {
            ...prev,
            title: prev.title?.trim() ? prev.title : formattedTitle,
            category: detectedCategory as any,
            content: text,
          };
        });
        setDroppedFile({ name: file.name, size: file.size });
      }
    };

    reader.onerror = () => {
      alert("Failed to read file. Please ensure it is a text-based document or paste its content manually.");
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleProcessFile(file);
    }
  };

  const resetModalState = () => {
    setFormData({
      title: "",
      category: "WBS",
      content: "",
      uploadedBy: "Rachel Adams (Lead PM)",
      projectId: defaultProjId,
    });
    setDroppedFile(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.content?.trim()) return;

    const targetProjId =
      formData.projectId ||
      (activeProjectId && activeProjectId !== "all"
        ? activeProjectId
        : projects[0]?.id || "proj-001");
    const targetProj = projects.find((p) => p.id === targetProjId);

    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      projectId: targetProjId,
      projectName: targetProj?.name,
      title: formData.title.trim(),
      category: (formData.category as any) || "WBS",
      content: formData.content.trim(),
      uploadDate: new Date().toISOString().split("T")[0],
      uploadedBy: formData.uploadedBy || "Project Manager",
      fileName: droppedFile?.name,
      fileSize: droppedFile ? formatFileSize(droppedFile.size) : undefined,
      parsedToWbs: false,
    };

    onAddDocument(newDoc);
    setIsAddModalOpen(false);
    resetModalState();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Project Document Repository & Artifacts
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-mono">
                PMBOK Artifact Baseline
              </span>
              {activeProject ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#141C2E] text-slate-200 border border-slate-700">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: activeProject.color || "#38BDF8" }}
                  />
                  <span>Scoped: {activeProject.name}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#141C2E] text-slate-300 border border-slate-700 font-mono">
                  <span>Scope: All Projects (Portfolio)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              {activeProject
                ? `Documents specifically attached to ${activeProject.name}. Upload Project Charters, Statements of Work (SOW), and WBS documentation to parse into live work packages.`
                : "Centralized storage for Project Charters, Statements of Work (SOW), and WBS documentation across all projects."}
            </p>
          </div>

          <button
            id="upload-doc-btn"
            onClick={() => {
              setFormData({
                title: "",
                category: "WBS",
                content: "",
                uploadedBy: "Rachel Adams (Lead PM)",
                projectId: defaultProjId,
              });
              setIsAddModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Project Document</span>
          </button>
        </div>
      </div>

      {/* Document Grid or Empty State */}
      {documents.length === 0 ? (
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-10 sm:p-14 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 shadow-xs">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">
            No Documents in {activeProject ? activeProject.name : "this Project"}
          </h3>
          <p className="text-xs text-[#94A3B8] max-w-md mb-6 leading-relaxed">
            This project has no pre-loaded documents. Upload or paste a Project Charter, SOW, Architecture Blueprint, or WBS specification to baseline scope and extract work packages with Gemini AI.
          </p>
          <button
            onClick={() => {
              setFormData({
                title: "",
                category: "WBS",
                content: "",
                uploadedBy: "Rachel Adams (Lead PM)",
                projectId: defaultProjId,
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const docProject =
              projects.find((p) => p.id === doc.projectId) ||
              (doc.projectIds && doc.projectIds.length > 0
                ? projects.find((p) => doc.projectIds?.includes(p.id))
                : undefined);

            return (
              <div
                key={doc.id}
                className="bg-[#0B0F19] border border-[#1E293B] hover:border-slate-700 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-colors group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-1.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {docProject && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#141C2E] text-slate-300 border border-slate-700">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: docProject.color || "#38BDF8" }}
                          />
                          <span className="truncate max-w-[120px]">{docProject.name}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#060911] text-slate-400 border border-[#1E293B] font-mono">
                        {doc.category}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white mt-3 line-clamp-1 group-hover:text-[#38BDF8] transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1 line-clamp-3 leading-relaxed font-sans">
                    {doc.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
                  <div className="text-[10px] text-[#64748B] font-mono">
                    {doc.uploadDate} • {doc.uploadedBy}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="p-1.5 rounded text-[#94A3B8] hover:text-white hover:bg-[#141C2E] transition-colors cursor-pointer"
                      title="View Document"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onTriggerWbsImportFromDoc(doc)}
                      className="px-2 py-1 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer font-mono"
                      title="Deconstruct into WBS items with AI"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Parse WBS</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete document "${doc.title}"?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="p-1.5 rounded text-[#94A3B8] hover:text-rose-400 hover:bg-[#141C2E] transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Document Modal with Drag-and-Drop File Upload */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header - pinned */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1E293B] shrink-0 bg-[#0B0F19]">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white font-mono">Add Project Document</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Upload or paste specifications, charters, and scope documents
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetModalState();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - scrollable with pinned footer */}
            <form onSubmit={handleSaveNew} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 text-xs">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.markdown,.json,.csv,.doc,.docx,.pdf,.rtf"
                onChange={handleFileInputChange}
              />

              {/* Drag and Drop Zone */}
              {!droppedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                    isDragging
                      ? "border-sky-400 bg-sky-500/10 scale-[1.01]"
                      : "border-[#1E293B] hover:border-sky-400/60 bg-[#060911]/80 hover:bg-[#060911]"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full transition-colors ${
                      isDragging
                        ? "bg-sky-500/20 text-sky-400"
                        : "bg-[#141C2E] text-slate-300 border border-slate-700"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isDragging
                        ? "Drop your document file here"
                        : "Drag and drop your file here, or click to browse"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Markdown (.md), Text (.txt), JSON (.json), CSV (.csv), Docs
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#060911] border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-[240px]">
                          {droppedFile.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Loaded
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatFileSize(droppedFile.size)} • Auto-populated content below
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-mono text-sky-400 hover:text-sky-300 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Replace File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDroppedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-rose-400 px-2 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {projects.length > 0 && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1 font-mono text-xs">
                    Target Project *
                  </label>
                  <select
                    value={formData.projectId || defaultProjId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full bg-[#060911] border border-[#1E293B] focus:border-sky-400 focus:outline-hidden rounded-lg px-3 py-2 text-white text-xs"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.projectCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 font-mono text-xs">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Phase 2 Scope & WBS Breakdown"
                    className="w-full bg-[#060911] border border-[#1E293B] focus:border-sky-400 focus:outline-hidden rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1 font-mono text-xs">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[#060911] border border-[#1E293B] focus:border-sky-400 focus:outline-hidden rounded-lg px-3 py-2 text-white"
                  >
                    <option value="WBS">WBS Specification</option>
                    <option value="Charter">Project Charter</option>
                    <option value="SOW">Statement of Work (SOW)</option>
                    <option value="Architecture">Architecture Design</option>
                    <option value="Requirements">Requirements Doc</option>
                    <option value="Other">Other PM Artifact</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium font-mono text-xs">
                    Document Content (Markdown, Bulleted scope, or text specification) *
                  </label>
                  {formData.content && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formData.content.length} characters
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  placeholder="Paste or type the document text, deliverables, milestone requirements, or drop a file above..."
                  className="w-full bg-[#060911] border border-[#1E293B] focus:border-sky-400 focus:outline-hidden rounded-lg p-3 text-white font-mono text-xs leading-relaxed resize-y"
                />
              </div>

              {/* Modal Footer - pinned inside card */}
              <div className="pt-3 border-t border-[#1E293B] flex justify-end gap-2.5 shrink-0 bg-[#0B0F19]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetModalState();
                  }}
                  className="px-4 py-2 bg-[#141C2E] hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors font-medium text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold rounded-lg cursor-pointer transition-colors text-xs font-mono shadow-xs"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-start sm:items-center justify-center">
          <div className="relative bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-2xl w-full my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-5 sm:px-6 py-3.5 border-b border-[#1E293B] flex items-center justify-between shrink-0 bg-[#060911]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">{selectedDoc.title}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                    {selectedDoc.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded {selectedDoc.uploadDate} by {selectedDoc.uploadedBy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-[#060911] rounded-lg m-4 border border-[#1E293B]">
              {selectedDoc.content}
            </div>

            <div className="px-5 sm:px-6 py-3 border-t border-[#1E293B] flex items-center justify-between shrink-0 bg-[#060911]">
              <span className="text-[11px] text-slate-500">Ready for automated WBS ingestion</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onTriggerWbsImportFromDoc(selectedDoc);
                    setSelectedDoc(null);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Parse into WBS with Gemini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-3.5 py-1.5 bg-[#141C2E] hover:bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
