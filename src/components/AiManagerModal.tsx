import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Trash2,
  Edit2,
  Key,
  Globe,
  Radio,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Zap,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useAiConfig } from "../context/AiConfigContext";
import { AiApiConfig, AiProviderType } from "../types";

const PROVIDER_INFO: Record<
  AiProviderType,
  {
    name: string;
    description: string;
    defaultModel: string;
    recommendedModels: string[];
    defaultBaseUrl?: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    docsUrl?: string;
  }
> = {
  gemini: {
    name: "Google Gemini",
    description: "Gemini 3.8 Flash, 3.1 Pro & Flash-Lite models with deep PMI reasoning.",
    defaultModel: "gemini-3.8-flash",
    recommendedModels: ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"],
    color: "#38BDF8",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-400",
    badgeBorder: "border-sky-500/30",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  openai: {
    name: "OpenAI",
    description: "Industry-standard GPT-4o, GPT-4o-mini, and reasoning models.",
    defaultModel: "gpt-4o",
    recommendedModels: ["gpt-4o", "gpt-4o-mini", "o3-mini", "gpt-4-turbo"],
    defaultBaseUrl: "https://api.openai.com/v1",
    color: "#10B981",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/30",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet and Haiku with superior structured technical writing.",
    defaultModel: "claude-3-5-sonnet-20241022",
    recommendedModels: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    color: "#F97316",
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-400",
    badgeBorder: "border-orange-500/30",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  deepseek: {
    name: "DeepSeek",
    description: "High-performance DeepSeek-V3 and R1 reasoning models with low latency.",
    defaultModel: "deepseek-chat",
    recommendedModels: ["deepseek-chat", "deepseek-reasoner"],
    defaultBaseUrl: "https://api.deepseek.com/v1",
    color: "#6366F1",
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
    badgeBorder: "border-indigo-500/30",
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  groq: {
    name: "Groq",
    description: "Ultra-fast LPU inference for open-source Llama 3.3 and Mixtral models.",
    defaultModel: "llama-3.3-70b-versatile",
    recommendedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    color: "#EC4899",
    badgeBg: "bg-pink-500/10",
    badgeText: "text-pink-400",
    badgeBorder: "border-pink-500/30",
    docsUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Universal unified API gateway supporting 100+ models from all providers.",
    defaultModel: "google/gemini-2.0-flash-001",
    recommendedModels: ["google/gemini-2.0-flash-001", "anthropic/claude-3.5-sonnet", "openai/gpt-4o", "deepseek/deepseek-chat"],
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    color: "#8B5CF6",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    badgeBorder: "border-purple-500/30",
    docsUrl: "https://openrouter.ai/keys",
  },
  custom_openai: {
    name: "Custom / Local Endpoint",
    description: "Connect to Ollama, vLLM, LM Studio, or any private OpenAI-compatible gateway.",
    defaultModel: "llama3",
    recommendedModels: ["llama3", "mistral", "qwen2.5-coder", "phi3"],
    defaultBaseUrl: "http://localhost:11434/v1",
    color: "#A855F7",
    badgeBg: "bg-violet-500/10",
    badgeText: "text-violet-400",
    badgeBorder: "border-violet-500/30",
  },
  local_pmi: {
    name: "Local PMI Engine",
    description: "Deterministic offline calculation engine. Real PMBOK formulas with zero keys or internet needed.",
    defaultModel: "PMBOK 7th Ed. Deterministic Rules",
    recommendedModels: ["PMBOK 7th Ed. Deterministic Rules"],
    color: "#14B8A6",
    badgeBg: "bg-teal-500/10",
    badgeText: "text-teal-400",
    badgeBorder: "border-teal-500/30",
  },
};

export const AiManagerModal: React.FC = () => {
  const {
    configs,
    activeConfigId,
    activeConfig,
    setActiveConfigId,
    addConfig,
    updateConfig,
    deleteConfig,
    testConnection,
    isAiManagerOpen,
    setIsAiManagerOpen,
  } = useAiConfig();

  const [activeTab, setActiveTab] = useState<"list" | "add" | "edit">("list");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Form states for Add / Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formProvider, setFormProvider] = useState<AiProviderType>("openai");
  const [formApiKey, setFormApiKey] = useState<string>("");
  const [formModel, setFormModel] = useState<string>("gpt-4o");
  const [formBaseUrl, setFormBaseUrl] = useState<string>("https://api.openai.com/v1");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [isFormTesting, setIsFormTesting] = useState<boolean>(false);

  if (!isAiManagerOpen) return null;

  const handleTest = async (config: AiApiConfig) => {
    setTestingId(config.id);
    setTestResult(null);
    try {
      const res = await testConnection(config);
      setTestResult({
        id: config.id,
        success: res.success,
        message: res.message,
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormProvider("openai");
    setFormName("OpenAI GPT-4o");
    setFormApiKey("");
    setFormModel(PROVIDER_INFO["openai"].defaultModel);
    setFormBaseUrl(PROVIDER_INFO["openai"].defaultBaseUrl || "");
    setFormError("");
    setShowKey(false);
    setActiveTab("add");
  };

  const handleOpenEdit = (config: AiApiConfig) => {
    setEditingId(config.id);
    setFormProvider(config.provider);
    setFormName(config.name);
    setFormApiKey(config.apiKey || "");
    setFormModel(config.model);
    setFormBaseUrl(config.baseUrl || PROVIDER_INFO[config.provider].defaultBaseUrl || "");
    setFormError("");
    setShowKey(false);
    setActiveTab("edit");
  };

  const handleProviderChange = (provider: AiProviderType) => {
    setFormProvider(provider);
    const info = PROVIDER_INFO[provider];
    setFormModel(info.defaultModel);
    setFormBaseUrl(info.defaultBaseUrl || "");
    if (!formName || Object.values(PROVIDER_INFO).some((p) => p.name === formName)) {
      setFormName(info.name);
    }
  };

  const handleSaveForm = (andSetActive: boolean = true) => {
    if (!formName.trim()) {
      setFormError("Please enter a name for this AI configuration.");
      return;
    }
    if (!formModel.trim()) {
      setFormError("Please specify a model name.");
      return;
    }
    if (formProvider !== "local_pmi" && formProvider !== "gemini" && !formApiKey.trim()) {
      setFormError("API Key is required for this provider.");
      return;
    }

    if (editingId) {
      updateConfig(editingId, {
        name: formName.trim(),
        provider: formProvider,
        apiKey: formApiKey.trim(),
        model: formModel.trim(),
        baseUrl: formBaseUrl.trim() || undefined,
      });
      if (andSetActive) {
        setActiveConfigId(editingId);
      }
    } else {
      const newId = addConfig({
        name: formName.trim(),
        provider: formProvider,
        apiKey: formApiKey.trim(),
        model: formModel.trim(),
        baseUrl: formBaseUrl.trim() || undefined,
        isDefault: false,
      });
      if (andSetActive) {
        setActiveConfigId(newId);
      }
    }

    setActiveTab("list");
  };

  const handleTestInForm = async () => {
    if (formProvider !== "local_pmi" && formProvider !== "gemini" && !formApiKey.trim()) {
      setFormError("Please enter an API Key before testing.");
      return;
    }
    setIsFormTesting(true);
    setFormError("");
    const tempConfig: AiApiConfig = {
      id: "temp-test",
      name: formName || "Test",
      provider: formProvider,
      apiKey: formApiKey.trim(),
      model: formModel.trim(),
      baseUrl: formBaseUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await testConnection(tempConfig);
      if (res.success) {
        alert(`Success! ${res.message}`);
      } else {
        setFormError(`Connection test failed: ${res.message}`);
      }
    } finally {
      setIsFormTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="ai-manager-modal"
        className="bg-[#0B1120] border border-[#232F48] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#1E293B] bg-[#070D18] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/40 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>AI API & Multi-Model Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-normal">
                  Global Manager
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure multiple AI providers and switch seamlessly across PM Pal, WBS, and Reports.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAiManagerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Active Banner */}
        <div className="bg-[#091122] px-4 sm:px-6 py-2.5 border-b border-[#1A253E] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs text-slate-400">Active AI Provider:</span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  PROVIDER_INFO[activeConfig.provider]?.badgeBg || "bg-slate-800"
                } ${PROVIDER_INFO[activeConfig.provider]?.badgeText || "text-white"} ${
                  PROVIDER_INFO[activeConfig.provider]?.badgeBorder || "border-slate-700"
                }`}
              >
                {PROVIDER_INFO[activeConfig.provider]?.name || activeConfig.provider}
              </span>
              <span>{activeConfig.name}</span>
            </span>
            <span className="hidden md:inline text-[11px] text-slate-400 font-mono">
              ({activeConfig.model})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleTest(activeConfig)}
              disabled={testingId === activeConfig.id}
              className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${testingId === activeConfig.id ? "animate-spin" : ""}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 pt-3 pb-1 border-b border-[#1E293B] bg-[#080E1A] gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "list"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Configured APIs ({configs.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "add"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New AI API</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: LIST */}
          {activeTab === "list" && (
            <div className="space-y-3">
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                    testResult.success
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.success ? "Connection Verified" : "Connection Error"}</p>
                    <p className="text-[11px] mt-0.5 opacity-90">{testResult.message}</p>
                  </div>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {configs.map((config) => {
                  const isActive = config.id === activeConfigId;
                  const info = PROVIDER_INFO[config.provider] || PROVIDER_INFO["custom_openai"];
                  const isTesting = testingId === config.id;

                  return (
                    <div
                      key={config.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                        isActive
                          ? "bg-[#0E1B33] border-sky-500/50 shadow-lg shadow-sky-950/30"
                          : "bg-[#080E1C] border-[#1C273E] hover:border-slate-700"
                      } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setActiveConfigId(config.id)}
                          className="mt-0.5 shrink-0 cursor-pointer"
                          title={isActive ? "Currently Active" : "Click to set as Active"}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isActive
                                ? "border-sky-400 bg-sky-500 text-black"
                                : "border-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {isActive && <CheckCircle2 className="w-4 h-4 text-black" />}
                          </div>
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">
                              {config.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}
                            >
                              {info.name}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-300">{config.model}</span>
                            </span>

                            {config.provider === "local_pmi" ? (
                              <span className="text-teal-400 text-[11px]">Offline / No Key Needed</span>
                            ) : config.apiKey ? (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Key className="w-3 h-3" />
                                <span>••••{config.apiKey.slice(-4)}</span>
                              </span>
                            ) : config.id === "builtin-gemini" ? (
                              <span className="text-emerald-400 text-[11px]">Server Environment Key</span>
                            ) : (
                              <span className="text-amber-400 text-[11px]">Key Not Configured</span>
                            )}

                            {config.lastLatencyMs && (
                              <span className="text-emerald-400 text-[11px]">
                                {config.lastLatencyMs}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleTest(config)}
                          disabled={isTesting}
                          className="px-2.5 py-1.5 bg-[#142038] hover:bg-[#1C2C4E] border border-[#233355] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          title="Test Connection with this model"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin text-sky-400" : ""}`} />
                          <span>{isTesting ? "Testing..." : "Test"}</span>
                        </button>

                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => setActiveConfigId(config.id)}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-black rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                          >
                            Set Active
                          </button>
                        ) : (
                          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>In Use</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(config)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
                          title="Edit Configuration"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {config.id !== "builtin-gemini" && config.id !== "local-pmi-engine" && (
                          <button
                            type="button"
                            onClick={() => deleteConfig(config.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete API"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New API button below list */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-[#121E36] hover:bg-[#1A2B4C] border border-[#233456] text-sky-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another AI API / Provider</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: ADD / EDIT FORM */}
          {(activeTab === "add" || activeTab === "edit") && (
            <div className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  1. Select AI Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PROVIDER_INFO) as AiProviderType[]).map((pKey) => {
                    const info = PROVIDER_INFO[pKey];
                    const isSelected = formProvider === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => handleProviderChange(pKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-sky-500/15 border-sky-500 text-white shadow-md"
                            : "bg-[#080E1C] border-[#1C273E] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{info.name}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{info.defaultModel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider Description & Docs */}
              <div className="p-3 rounded-xl bg-[#080F1E] border border-[#1A253E] text-xs flex items-center justify-between gap-2">
                <div className="text-slate-300">
                  <span className="font-semibold text-white">{PROVIDER_INFO[formProvider].name}: </span>
                  <span>{PROVIDER_INFO[formProvider].description}</span>
                </div>
                {PROVIDER_INFO[formProvider].docsUrl && (
                  <a
                    href={PROVIDER_INFO[formProvider].docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0 font-medium hover:underline"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Configuration Fields */}
              <div className="space-y-3 bg-[#080E1C] p-4 rounded-xl border border-[#1C273E]">
                {/* Friendly Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Nickname / Label
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. My Team GPT-4o or Personal Claude"
                    className="w-full bg-[#050811] border border-[#1E293B] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                {/* API Key */}
                {formProvider !== "local_pmi" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>API Key</span>
                      {formProvider === "gemini" && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          Leave empty to use default server key
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder={
                          formProvider === "gemini"
                            ? "Paste Gemini API Key (or leave blank to use server default)"
                            : `Enter ${PROVIDER_INFO[formProvider].name} API Key`
                        }
                        className="w-full bg-[#050811] border border-[#1E293B] focus:border-sky-500 rounded-xl px-3 py-2 pr-10 text-xs text-white outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Model Identifier
                  </label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="e.g. gpt-4o, gemini-3.8-flash, claude-3-5-sonnet-20241022"
                    className="w-full bg-[#050811] border border-[#1E293B] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  {PROVIDER_INFO[formProvider].recommendedModels.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Presets:</span>
                      {PROVIDER_INFO[formProvider].recommendedModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormModel(m)}
                          className="px-2 py-0.5 rounded text-[10px] bg-[#121A2D] hover:bg-[#1A253E] border border-[#23314F] text-slate-300 hover:text-white font-mono cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Base URL (if applicable) */}
                {(formProvider === "custom_openai" ||
                  formProvider === "openrouter" ||
                  formProvider === "deepseek" ||
                  formProvider === "groq" ||
                  formProvider === "openai") && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      API Base URL
                    </label>
                    <input
                      type="text"
                      value={formBaseUrl}
                      onChange={(e) => setFormBaseUrl(e.target.value)}
                      placeholder="e.g. https://api.openai.com/v1 or http://localhost:11434/v1"
                      className="w-full bg-[#050811] border border-[#1E293B] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestInForm}
                    disabled={isFormTesting}
                    className="px-3 py-2 bg-[#142038] hover:bg-[#1C2C4E] border border-[#233355] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFormTesting ? "animate-spin text-sky-400" : ""}`} />
                    <span>{isFormTesting ? "Testing..." : "Test Connection"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveForm(true)}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 active:scale-95 text-black rounded-xl text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save & Set Active</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#1E293B] bg-[#070D18] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI configuration applies to PM Pal Chat, WBS Document Parsing, and Reports.</span>
          </div>
          <button
            onClick={() => setIsAiManagerOpen(false)}
            className="text-slate-300 hover:text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
