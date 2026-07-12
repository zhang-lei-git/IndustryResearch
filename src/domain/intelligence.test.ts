import { describe, expect, it } from "vitest";
import { intelligenceBelongsToCompany, intelligenceIsRelevant } from "./intelligence";
import type { IntelligenceItem } from "./types";

const item: IntelligenceItem = {
  id: "signal-1",
  workspaceId: "workspace-1",
  type: "招投标",
  title: "测试线索",
  sourceUrl: "https://example.com",
  publishedAt: "2026-07-12",
  capturedAt: "2026-07-12",
  summary: "测试摘要",
  verificationStatus: "待验证",
  companyIds: ["company-1"],
  topicIds: ["topic-1"]
};

describe("intelligence associations", () => {
  it("matches an item to its related company", () => {
    expect(intelligenceBelongsToCompany(item, "company-1")).toBe(true);
    expect(intelligenceBelongsToCompany(item, "company-2")).toBe(false);
  });

  it("excludes invalidated intelligence from relevant context", () => {
    expect(intelligenceIsRelevant(item)).toBe(true);
    expect(intelligenceIsRelevant({ ...item, verificationStatus: "不相关" })).toBe(false);
  });
});
