import type { AppState } from "../domain/types";

export const STATE_VERSION = 5;

export function parseStoredState(raw: string | null): Partial<AppState> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed as Partial<AppState> : null;
  } catch {
    return null;
  }
}

export function applyStateVersion(state: Partial<AppState>): Partial<AppState> {
  return { ...state, dataVersion: STATE_VERSION };
}

export function serializeState(state: AppState): string {
  return JSON.stringify({ ...state, dataVersion: STATE_VERSION });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
