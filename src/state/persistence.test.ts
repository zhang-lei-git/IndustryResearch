import { describe, expect, it } from "vitest";
import { applyStateVersion, parseStoredState, serializeState, STATE_VERSION } from "./persistence";

describe("local state persistence", () => {
  it("returns null for absent or malformed stored state", () => {
    expect(parseStoredState(null)).toBeNull();
    expect(parseStoredState("not-json")).toBeNull();
    expect(parseStoredState("[]")).toBeNull();
  });

  it("upgrades a legacy state without a version while preserving its data", () => {
    const legacy = parseStoredState(JSON.stringify({ companies: [{ id: "company-1", name: "样例企业" }] }));
    const upgraded = applyStateVersion(legacy ?? {});

    expect(upgraded.dataVersion).toBe(STATE_VERSION);
    expect(upgraded.companies).toEqual([{ id: "company-1", name: "样例企业" }]);
  });

  it("writes the current version with the full application state", () => {
    const serialized = serializeState({
      dataVersion: 1,
      workspaces: [],
      activeWorkspaceId: "workspace-1",
      topics: [],
      hypotheses: [],
      researchTasks: [],
      samplingStrategies: [],
      researchSamples: [],
      questionSets: [],
      planTargets: [],
      companies: [],
      plans: [],
      records: [],
      policies: [],
      intelligence: [],
      capabilities: [],
      questionTemplates: []
    });

    expect(JSON.parse(serialized)).toMatchObject({
      dataVersion: STATE_VERSION,
      activeWorkspaceId: "workspace-1"
    });
  });
});
