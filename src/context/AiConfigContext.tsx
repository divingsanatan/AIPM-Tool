import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AiApiConfig, AiProviderType } from "../types";

export const DEFAULT_AI_CONFIGS: AiApiConfig[] = [
  {
    id: "builtin-gemini",
    name: "Built-in Gemini (Server Default)",
    provider: "gemini",
    apiKey: "",
    model: "gemini-3.8-flash",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "custom-gemini",
    name: "Google Gemini (Custom Key)",
    provider: "gemini",
    apiKey: "",
    model: "gemini-3.8-flash",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "openai-gpt4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    apiKey: "",
    model: "gpt-4o",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "openai-gpt4o-mini",
    name: "OpenAI GPT-4o Mini",
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "claude-35-sonnet",
    name: "Anthropic Claude 3.5 Sonnet",
    provider: "anthropic",
    apiKey: "",
    model: "claude-3-5-sonnet-20241022",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "deepseek",
    apiKey: "",
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "groq-llama",
    name: "Groq (Llama 3.3 70B)",
    provider: "groq",
    apiKey: "",
    model: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "local-pmi-engine",
    name: "Local PMI Engine (Offline Rules)",
    provider: "local_pmi",
    apiKey: "",
    model: "PMBOK 7th Ed. Deterministic Engine",
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_CONFIGS_KEY = "pmi_ai_api_configs_v1";
const LOCAL_STORAGE_ACTIVE_KEY = "pmi_active_ai_config_id_v1";

interface AiConfigContextType {
  configs: AiApiConfig[];
  activeConfigId: string;
  activeConfig: AiApiConfig;
  setActiveConfigId: (id: string) => void;
  addConfig: (config: Omit<AiApiConfig, "id" | "createdAt">) => string;
  updateConfig: (id: string, updates: Partial<AiApiConfig>) => void;
  deleteConfig: (id: string) => void;
  testConnection: (config: AiApiConfig) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
  isAiManagerOpen: boolean;
  setIsAiManagerOpen: (open: boolean) => void;
}

const AiConfigContext = createContext<AiConfigContextType | null>(null);

export const AiConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<AiApiConfig[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONFIGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load AI configs from localStorage:", e);
    }
    return DEFAULT_AI_CONFIGS;
  });

  const [activeConfigId, setActiveConfigIdState] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
      if (savedActive) {
        return savedActive;
      }
    } catch (e) {
      console.warn("Failed to load active AI config from localStorage:", e);
    }
    return DEFAULT_AI_CONFIGS[0].id;
  });

  const [isAiManagerOpen, setIsAiManagerOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CONFIGS_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error("Error saving AI configs:", e);
    }
  }, [configs]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, activeConfigId);
    } catch (e) {
      console.error("Error saving active AI config id:", e);
    }
  }, [activeConfigId]);

  const activeConfig =
    configs.find((c) => c.id === activeConfigId) || configs[0] || DEFAULT_AI_CONFIGS[0];

  const setActiveConfigId = useCallback((id: string) => {
    setActiveConfigIdState(id);
  }, []);

  const addConfig = useCallback((newConfigData: Omit<AiApiConfig, "id" | "createdAt">) => {
    const newId = `custom-ai-${Date.now()}`;
    const newConfig: AiApiConfig = {
      ...newConfigData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setConfigs((prev) => [...prev, newConfig]);
    setActiveConfigIdState(newId);
    return newId;
  }, []);

  const updateConfig = useCallback((id: string, updates: Partial<AiApiConfig>) => {
    setConfigs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteConfig = useCallback(
    (id: string) => {
      setConfigs((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        if (filtered.length === 0) return DEFAULT_AI_CONFIGS;
        return filtered;
      });
      if (activeConfigId === id) {
        setActiveConfigIdState(configs[0]?.id || DEFAULT_AI_CONFIGS[0].id);
      }
    },
    [activeConfigId, configs]
  );

  const testConnection = useCallback(
    async (
      configToTest: AiApiConfig
    ): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
      const startTime = performance.now();
      try {
        const res = await fetch("/api/ai/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: configToTest }),
        });

        const latencyMs = Math.round(performance.now() - startTime);
        const data = await res.json();

        if (res.ok && data.success) {
          updateConfig(configToTest.id, {
            lastTestedAt: new Date().toISOString(),
            lastTestStatus: "success",
            lastTestError: undefined,
            lastLatencyMs: latencyMs,
          });
          return {
            success: true,
            message: `Connected successfully (${latencyMs}ms). ${data.modelName || configToTest.model} is operational.`,
            latencyMs,
          };
        } else {
          const errorMsg = data.error || data.message || "Failed to connect to AI provider";
          updateConfig(configToTest.id, {
            lastTestedAt: new Date().toISOString(),
            lastTestStatus: "error",
            lastTestError: errorMsg,
          });
          return {
            success: false,
            message: errorMsg,
          };
        }
      } catch (err: any) {
        const errorMsg = err.message || "Network error while connecting to server";
        updateConfig(configToTest.id, {
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: "error",
          lastTestError: errorMsg,
        });
        return {
          success: false,
          message: errorMsg,
        };
      }
    },
    [updateConfig]
  );

  return (
    <AiConfigContext.Provider
      value={{
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
      }}
    >
      {children}
    </AiConfigContext.Provider>
  );
};

export const useAiConfig = (): AiConfigContextType => {
  const context = useContext(AiConfigContext);
  if (!context) {
    throw new Error("useAiConfig must be used within an AiConfigProvider");
  }
  return context;
};
