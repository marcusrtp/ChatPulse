import { DEFAULT_CONFIG, normalizeConfig } from "./config.js";

export const LIVE_CONFIG_STORAGE_KEY = "chatpulse-live-config";

export const DEFAULT_LIVE_CONFIG = Object.freeze({
  automodSimulation: false,
  overlayConfig: DEFAULT_CONFIG,
  updatedAt: 0,
});

export function readLiveConfig(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_LIVE_CONFIG };

  try {
    return normalizeLiveConfig(JSON.parse(storage.getItem(LIVE_CONFIG_STORAGE_KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_LIVE_CONFIG };
  }
}

export function writeLiveConfig(storage = globalThis.localStorage, input = {}, now = Date.now) {
  const config = normalizeLiveConfig({
    ...readLiveConfig(storage),
    ...input,
    updatedAt: now(),
  });

  storage?.setItem(LIVE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  return config;
}

export function normalizeLiveConfig(input = {}) {
  return {
    automodSimulation: parseBoolean(input.automodSimulation, DEFAULT_LIVE_CONFIG.automodSimulation),
    overlayConfig: normalizeConfig(input.overlayConfig ?? DEFAULT_LIVE_CONFIG.overlayConfig),
    updatedAt: normalizeTimestamp(input.updatedAt),
  };
}

function normalizeTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : DEFAULT_LIVE_CONFIG.updatedAt;
}

function parseBoolean(value, fallback) {
  if (value === true || value === "1" || value === "true" || value === "on") return true;
  if (value === false || value === "0" || value === "false" || value === "off") return false;
  return fallback;
}
