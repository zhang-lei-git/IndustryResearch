import type { IntelligenceItem } from "./types";

export function intelligenceBelongsToCompany(item: IntelligenceItem, companyId: string) {
  return item.companyIds.includes(companyId);
}

export function intelligenceIsRelevant(item: IntelligenceItem) {
  return item.verificationStatus !== "不相关" && item.verificationStatus !== "已失效";
}
