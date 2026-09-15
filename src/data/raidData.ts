import { RaidItem } from "../types";
import { initialRaidItems } from "./seedData";

const RAID_STORAGE_KEY = "pmi_raid_items_v2";

export function normalizeRaidItem(item: RaidItem): RaidItem {
  const ids: string[] = [];
  if (Array.isArray(item.wbsItemIds) && item.wbsItemIds.length > 0) {
    ids.push(...item.wbsItemIds.filter(Boolean));
  } else if (item.wbsItemId) {
    ids.push(item.wbsItemId);
  }
  const uniqueIds = Array.from(new Set(ids));
  return {
    ...item,
    wbsItemIds: uniqueIds,
    wbsItemId: uniqueIds[0] || item.wbsItemId || undefined,
  };
}

export function loadRaidItems(): RaidItem[] {
  try {
    const raw = localStorage.getItem(RAID_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeRaidItem);
      }
    }
  } catch (err) {
    console.warn("Failed to load RAID items from localStorage:", err);
  }
  return initialRaidItems.map(normalizeRaidItem);
}

export function saveRaidItems(items: RaidItem[]): void {
  try {
    const normalized = items.map(normalizeRaidItem);
    localStorage.setItem(RAID_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn("Failed to save RAID items to localStorage:", err);
  }
}
