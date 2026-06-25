import { normalizeConfig } from "../core/config.js";

const DISPLAY_FIELDS = new Set([
  "messageLifetimeMs",
  "maxMessages",
  "messageOrder",
  "position",
  "density",
  "fontScale",
  "gapPx",
  "backgroundOpacity",
  "radiusPx",
  "animation",
]);

export const SETTING_PRESETS = Object.freeze([
  Object.freeze({
    id: "just-chatting",
    label: "Just Chatting",
    description: "Lisible et posé",
    values: Object.freeze({
      messageLifetimeMs: 14000,
      maxMessages: 8,
      messageOrder: "bottom",
      position: "right",
      density: "comfortable",
      fontScale: 110,
      gapPx: 10,
      backgroundOpacity: 0.74,
      radiusPx: 10,
      animation: "slide",
    }),
  }),
  Object.freeze({
    id: "fps",
    label: "FPS",
    description: "Compact et discret",
    values: Object.freeze({
      messageLifetimeMs: 7000,
      maxMessages: 5,
      messageOrder: "bottom",
      position: "left",
      density: "compact",
      fontScale: 95,
      gapPx: 6,
      backgroundOpacity: 0.58,
      radiusPx: 4,
      animation: "fade",
    }),
  }),
  Object.freeze({
    id: "mobile",
    label: "Mobile",
    description: "Texte plus grand",
    values: Object.freeze({
      messageLifetimeMs: 10000,
      maxMessages: 4,
      messageOrder: "bottom",
      position: "center",
      density: "comfortable",
      fontScale: 120,
      gapPx: 10,
      backgroundOpacity: 0.78,
      radiusPx: 12,
      animation: "slide",
    }),
  }),
  Object.freeze({
    id: "minimal",
    label: "Minimal",
    description: "Très léger",
    values: Object.freeze({
      messageLifetimeMs: 8000,
      maxMessages: 3,
      messageOrder: "bottom",
      position: "right",
      density: "compact",
      fontScale: 90,
      gapPx: 5,
      backgroundOpacity: 0.36,
      radiusPx: 0,
      animation: "fade",
    }),
  }),
  Object.freeze({
    id: "big-screen",
    label: "Grand écran",
    description: "Confort 16:9",
    values: Object.freeze({
      messageLifetimeMs: 12000,
      maxMessages: 12,
      messageOrder: "bottom",
      position: "right",
      density: "comfortable",
      fontScale: 115,
      gapPx: 12,
      backgroundOpacity: 0.68,
      radiusPx: 8,
      animation: "slide",
    }),
  }),
]);

export const PRESET_IDS = Object.freeze(SETTING_PRESETS.map((preset) => preset.id));

export function getSettingsPreset(id) {
  return SETTING_PRESETS.find((preset) => preset.id === id);
}

export function applySettingsPreset(currentConfig, id) {
  const preset = getSettingsPreset(id);
  const normalizedCurrent = normalizeConfig(currentConfig);
  if (!preset) return normalizedCurrent;

  const displayValues = Object.fromEntries(
    Object.entries(preset.values).filter(([key]) => DISPLAY_FIELDS.has(key)),
  );

  return normalizeConfig({
    ...normalizedCurrent,
    ...displayValues,
  });
}
