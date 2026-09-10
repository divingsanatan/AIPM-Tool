import React, { useState } from "react";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  X,
  ArrowRight,
  FolderGit2,
} from "lucide-react";
import { Project, Sprint, WbsItem, RaidItem, ChangeRequest, Stakeholder } from "../types";
import {
  exportWorkspaceJson,
  parseImportWorkspaceJson,
  pushServerState,
  fetchServerState,
  mergeProjects,
  mergeSprints,
} from "../utils/cloudSync";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  sprints: Sprint[];
  wbsItems: WbsItem[];
  raidItems: RaidItem[];
  changeRequests: ChangeRequest[];
  stakeholders: Stakeholder[];
  onApplyMergedData: (data: {
    projects?: Project[];
    sprints?: Sprint[];
    wbsItems?: WbsItem[];
    raidItems?: RaidItem[];
    changeRequests?: ChangeRequest[];
  }) => void;
  showToast: (msg: string) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  projects,
  sprints,
  wbsItems,
  raidItems,
  changeRequests,
  stakeholders,
  onApplyMergedData,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"cloud" | "transfer">("cloud");
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [lastServerSyncTime, setLastServerSyncTime] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. One-click push to server
  const handlePushToServer = async () => {
    setIsSyncing(true);
    try {
      const res = await pushServerState({
        projects,
        sprints,
        wbsItems,
        raidItems,
        changeRequests,
        stakeholders,
        sourceDevice: typeof navigator !== "undefined" ? navigator.userAgent : "browser",
      });

      if (res && res.success) {
        setLastServerSyncTime(new Date().toLocaleTimeString());
        showToast(
          `Success: Uploaded ${projects.length} project(s) & ${sprints.length} sprint(s) to server database!`
        );
      } else {
        showToast("Server storage responded, but state was not updated.");
      }
    } catch (err: any) {
      showToast("Error syncing to server: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. One-click pull from server
  const handlePullFromServer = async () => {
    setIsSyncing(true);
    try {
      const serverState = await fetchServerState();
      if (!serverState || !serverState.projects || serverState.projects.length === 0) {
        showToast("Server currently has no projects stored yet. Push from your phone first!");
        setIsSyncing(false);
        return;
      }

      const mergedP = mergeProjects(projects, serverState.projects);
      const mergedS = serverState.sprints
        ? mergeSprints(sprints, serverState.sprints)
        : sprints;

      onApplyMergedData({
        projects: mergedP,
        sprints: mergedS,
        wbsItems: serverState.wbsItems || wbsItems,
        raidItems: serverState.raidItems || raidItems,
        changeRequests: serverState.changeRequests || changeRequests,
      });

      setLastServerSyncTime(new Date().toLocaleTimeString());
      showToast(
        `Synchronized! Pulled ${serverState.projects.length} remote projects into workspace.`
      );
      onClose();
    } catch (err: any) {
      showToast("Error pulling from server: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Copy JSON to clipboard
  const handleCopyData = () => {
    const jsonStr = exportWorkspaceJson({
      projects,
      sprints,
      wbsItems,
      raidItems,
      changeRequests,
      stakeholders,
    });
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    showToast("Copied all projects data to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  // 4. Download file backup
  const handleDownloadBackup = () => {
    const jsonStr = exportWorkspaceJson({
      projects,
      sprints,
      wbsItems,
      raidItems,
      changeRequests,
      stakeholders,
    });
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pmi-sentinel-projects-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded projects backup file!");
  };

  // 5. Import pasted JSON
  const handleImportJson = () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError("Please paste valid JSON project data.");
      return;
    }

    const parsed = parseImportWorkspaceJson(importJsonText);
    if (!parsed || !parsed.projects) {
      setImportError("Invalid format: JSON must contain a valid 'projects' list.");
      return;
    }

    const mergedP = mergeProjects(projects, parsed.projects);
    const mergedS = parsed.sprints ? mergeSprints(sprints, parsed.sprints) : sprints;

    onApplyMergedData({
      projects: mergedP,
      sprints: mergedS,
      wbsItems: parsed.wbsItems || wbsItems,
      raidItems: parsed.raidItems || raidItems,
      changeRequests: parsed.changeRequests || changeRequests,
    });

    // Also push merged to server
    pushServerState({
      projects: mergedP,
      sprints: mergedS,
      wbsItems: parsed.wbsItems || wbsItems,
      raidItems: parsed.raidItems || raidItems,
      changeRequests: parsed.changeRequests || changeRequests,
      stakeholders,
    });

    showToast(`Successfully imported ${parsed.projects.length} project(s)!`);
    setImportJsonText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E293B] bg-[#060911] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Multi-Device & Phone Sync
              </h2>
              <p className="text-xs text-slate-400">
                Fix missing projects added from mobile phone browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why this happens explainer banner */}
        <div className="p-4 bg-sky-950/30 border-b border-sky-800/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">
              Why didn't phone projects appear here automatically?
            </p>
            <p className="text-slate-400 leading-relaxed">
              When projects are created on a mobile browser, modern browsers store them in your
              phone's local isolated storage (<code className="text-sky-300">localStorage</code>).
              To see those projects on your computer, use the options below to sync them to the
              central cloud server.
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-[#1E293B] bg-[#080C16] px-6">
          <button
            onClick={() => setActiveSubTab("cloud")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === "cloud"
                ? "border-sky-400 text-sky-400 bg-sky-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            One-Click Cloud Sync (Recommended)
          </button>
          <button
            onClick={() => setActiveSubTab("transfer")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === "transfer"
                ? "border-sky-400 text-sky-400 bg-sky-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            Direct Transfer (Copy / Paste JSON)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeSubTab === "cloud" ? (
            <div className="space-y-5">
              {/* How it works 2-step diagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Step 1 Phone */}
                <div className="p-4 rounded-xl bg-[#060911] border border-[#1E293B] space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase font-mono">Step 1: On Your Phone</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Open the app on your phone browser, click this <strong>Sync</strong> button, and tap:
                  </p>
                  <button
                    onClick={handlePushToServer}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    <span>Upload Phone Projects to Cloud</span>
                  </button>
                  <span className="text-[11px] text-slate-500 block text-center">
                    Current device has {projects.length} project(s) loaded
                  </span>
                </div>

                {/* Step 2 Desktop */}
                <div className="p-4 rounded-xl bg-[#060911] border border-[#1E293B] space-y-3">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Laptop className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase font-mono">Step 2: On This Computer</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    After uploading from your phone, click here on your computer to pull the latest projects:
                  </p>
                  <button
                    onClick={handlePullFromServer}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-3 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#030712] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudDownload className="w-4 h-4" />
                    )}
                    <span>Pull Latest Projects from Cloud</span>
                  </button>
                  <span className="text-[11px] text-slate-500 block text-center">
                    {lastServerSyncTime ? `Last synced at ${lastServerSyncTime}` : "Ready to synchronize"}
                  </span>
                </div>
              </div>

              {/* Status banner */}
              <div className="p-3.5 rounded-xl bg-[#060911] border border-[#1E293B] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span>
                    Active Project Count on This Device: <strong className="text-white">{projects.length}</strong>
                  </span>
                </div>
                <button
                  onClick={handlePushToServer}
                  disabled={isSyncing}
                  className="text-sky-400 hover:text-sky-300 text-xs font-semibold cursor-pointer underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                  Save/Push Current Device Now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Option B: Copy/Paste JSON transfer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-xl bg-[#060911] border border-[#1E293B] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      1. Export / Copy from Phone
                    </span>
                    <span className="text-[10px] text-slate-400">{projects.length} projects</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    On your phone, tap "Copy Project Data" and send it to yourself (email/message), or download a JSON file:
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={handleCopyData}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied to Clipboard!" : "Copy Project Data (JSON)"}</span>
                    </button>
                    <button
                      onClick={handleDownloadBackup}
                      className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/60"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .JSON Backup</span>
                    </button>
                  </div>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-xl bg-[#060911] border border-[#1E293B] space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase font-mono block mb-1">
                      2. Paste & Import on Computer
                    </span>
                    <p className="text-xs text-slate-400 mb-2">
                      Paste the copied project JSON below to merge your phone's projects into this computer:
                    </p>
                    <textarea
                      rows={4}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='Paste JSON here (e.g. {"projects": [...]})'
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                    {importError && (
                      <p className="text-[11px] text-rose-400 mt-1">{importError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleImportJson}
                    disabled={!importJsonText.trim()}
                    className="w-full py-2 px-3 bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-40 text-[#030712] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import & Merge Projects</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Server sync keeps all changes permanently accessible across devices</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
