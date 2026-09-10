import { StatusConfig, WbsItem } from "../types";

export const DEFAULT_STATUS_CONFIGS: StatusConfig[] = [
  {
    id: "done",
    key: "Done",
    label: "DONE",
    progressPercent: 100,
    color: "emerald",
    dotColor: "bg-emerald-400",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    isDefault: true,
    order: 1,
  },
  {
    id: "demoable",
    key: "Demoable",
    label: "DEMO READY",
    progressPercent: 60,
    color: "amber",
    dotColor: "bg-amber-400",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    isDefault: true,
    order: 2,
  },
  {
    id: "blocked",
    key: "Blocked",
    label: "BLOCKED",
    progressPercent: 50,
    color: "rose",
    dotColor: "bg-rose-400",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/30",
    isDefault: true,
    order: 3,
  },
  {
    id: "in-progress",
    key: "In Progress",
    label: "IN PROGRESS",
    progressPercent: 40,
    color: "blue",
    dotColor: "bg-blue-400",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    badgeBorder: "border-blue-500/30",
    isDefault: true,
    order: 4,
  },
  {
    id: "to-do",
    key: "To Do",
    label: "TO DO",
    progressPercent: 0,
    color: "slate",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-700/40",
    badgeText: "text-slate-300",
    badgeBorder: "border-slate-600/40",
    isDefault: true,
    order: 5,
  },
  {
    id: "backlog",
    key: "Backlog",
    label: "BACKLOG",
    progressPercent: 0,
    color: "indigo",
    dotColor: "bg-indigo-400",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/30",
    isDefault: true,
    order: 6,
    description: "Work items queued in backlog awaiting sprint or schedule allocation",
  },
];

export const STATUS_COLOR_PALETTES: Record<
  string,
  { name: string; dotColor: string; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  emerald: {
    name: "Emerald Green",
    dotColor: "bg-emerald-400",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
  },
  amber: {
    name: "Amber Gold",
    dotColor: "bg-amber-400",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
  },
  rose: {
    name: "Rose Coral",
    dotColor: "bg-rose-400",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/30",
  },
  blue: {
    name: "Sky Blue",
    dotColor: "bg-blue-400",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    badgeBorder: "border-blue-500/30",
  },
  purple: {
    name: "Royal Purple",
    dotColor: "bg-purple-400",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
  },
  cyan: {
    name: "Cyan Glow",
    dotColor: "bg-cyan-400",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-300",
    badgeBorder: "border-cyan-500/30",
  },
  indigo: {
    name: "Indigo Night",
    dotColor: "bg-indigo-400",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/30",
  },
  orange: {
    name: "Vibrant Orange",
    dotColor: "bg-orange-400",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300",
    badgeBorder: "border-orange-500/30",
  },
  slate: {
    name: "Neutral Slate",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-700/40",
    badgeText: "text-slate-300",
    badgeBorder: "border-slate-600/40",
  },
};

const STORAGE_KEY = "wbs_status_configs_v2";

/**
 * Load status configs from localStorage or return updated defaults.
 * Guarantees that built-in statuses have the exact required progress defaults
 * unless customized.
 */
export function loadStatusConfigs(): StatusConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StatusConfig[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default statuses exist with their proper progress if not overwritten
        const merged: StatusConfig[] = [...parsed];
        DEFAULT_STATUS_CONFIGS.forEach((def) => {
          const idx = merged.findIndex(
            (m) => m.key.toLowerCase() === def.key.toLowerCase() || m.id === def.id
          );
          if (idx === -1) {
            merged.push(def);
          }
        });
        // Sort by order
        return merged.sort((a, b) => a.order - b.order);
      }
    }
  } catch (e) {
    console.warn("Could not parse status configs from storage", e);
  }
  return [...DEFAULT_STATUS_CONFIGS];
}

export function saveStatusConfigs(configs: StatusConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (e) {
    console.warn("Could not save status configs to storage", e);
  }
}

/**
 * Get config for a status by key. Falls back to a reasonable default if missing.
 */
export function getStatusConfig(
  statusKey?: string,
  configs?: StatusConfig[]
): StatusConfig {
  const list = configs && configs.length > 0 ? configs : DEFAULT_STATUS_CONFIGS;
  if (!statusKey) {
    return (
      list.find((c) => c.key === "To Do") ||
      DEFAULT_STATUS_CONFIGS.find((c) => c.key === "To Do")!
    );
  }

  const normalized = statusKey.trim().toLowerCase();
  const matched = list.find(
    (c) => c.key.toLowerCase() === normalized || c.id.toLowerCase() === normalized
  );

  if (matched) return matched;

  // Derive an auto-styled custom status config
  const isDone = normalized.includes("done") || normalized.includes("complete");
  const isDemo = normalized.includes("demo") || normalized.includes("ready");
  const isBlocked = normalized.includes("block");
  const isInProg = normalized.includes("progress") || normalized.includes("doing");

  const progress = isDone ? 100 : isDemo ? 60 : isBlocked ? 50 : isInProg ? 40 : 0;
  const palette = isDone
    ? STATUS_COLOR_PALETTES.emerald
    : isDemo
    ? STATUS_COLOR_PALETTES.amber
    : isBlocked
    ? STATUS_COLOR_PALETTES.rose
    : isInProg
    ? STATUS_COLOR_PALETTES.blue
    : STATUS_COLOR_PALETTES.purple;

  return {
    id: `custom-${statusKey.replace(/\s+/g, "-").toLowerCase()}`,
    key: statusKey,
    label: statusKey.toUpperCase(),
    progressPercent: progress,
    color: isDone ? "emerald" : isDemo ? "amber" : isBlocked ? "rose" : isInProg ? "blue" : "purple",
    dotColor: palette.dotColor,
    badgeBg: palette.badgeBg,
    badgeText: palette.badgeText,
    badgeBorder: palette.badgeBorder,
    isDefault: false,
    order: 99,
  };
}

/**
 * Returns the automatic progress percentage (0-100) linked to this status.
 */
export function getProgressForStatus(
  statusKey?: string,
  configs?: StatusConfig[]
): number {
  const conf = getStatusConfig(statusKey, configs);
  return conf.progressPercent;
}

/**
 * Returns an item with its status set and its progressPercent automatically marked.
 */
export function applyStatusToItem(
  item: WbsItem,
  newStatus: string,
  configs?: StatusConfig[]
): WbsItem {
  const progress = getProgressForStatus(newStatus, configs);
  return {
    ...item,
    status: newStatus,
    progressPercent: progress,
  };
}

/**
 * Bulk updates an array of items so each item's progressPercent reflects its status.
 */
export function syncAllItemsWithStatusProgress(
  items: WbsItem[],
  configs?: StatusConfig[]
): WbsItem[] {
  return items.map((item) => {
    const progress = getProgressForStatus(item.status, configs);
    return {
      ...item,
      progressPercent: progress,
    };
  });
}
