export const DEFAULT_CONFIG = Object.freeze({
  channel: "",
  twitchClientId: "",
  accentColor: "#8b5cf6",
  messageLifetimeMs: 12000,
  maxMessages: 12,
  messageOrder: "bottom",
  position: "left",
  density: "compact",
  fontScale: 100,
  gapPx: 8,
  backgroundOpacity: 0.88,
  radiusPx: 8,
  animation: "slide",
  showMeta: true,
  notifications: false,
  twitchVisuals: false,
  externalEmotes: false,
  automodSimulation: false,
  debug: false,
});

export const CONFIG_LIMITS = Object.freeze({
  messageLifetimeMs: Object.freeze({
    min: 5000,
    max: 30000,
  }),
  maxMessages: Object.freeze({
    min: 1,
    max: 24,
  }),
});

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MESSAGE_ORDERS = new Set(["top", "bottom"]);
const POSITIONS = new Set(["left", "center", "right"]);
const DENSITIES = new Set(["compact", "comfortable"]);
const ANIMATIONS = new Set(["slide", "fade", "none"]);

export function normalizeConfig(input = {}) {
  const channel = sanitizeChannel(input.channel ?? DEFAULT_CONFIG.channel);
  const twitchClientId = sanitizeClientId(input.twitchClientId ?? DEFAULT_CONFIG.twitchClientId);
  const accentColor = COLOR_PATTERN.test(String(input.accentColor ?? ""))
    ? String(input.accentColor).toLowerCase()
    : DEFAULT_CONFIG.accentColor;

  return {
    channel,
    twitchClientId,
    accentColor,
    messageLifetimeMs: clampNumber(
      input.messageLifetimeMs ?? input.life,
      CONFIG_LIMITS.messageLifetimeMs.min,
      CONFIG_LIMITS.messageLifetimeMs.max,
      DEFAULT_CONFIG.messageLifetimeMs,
    ),
    maxMessages: clampNumber(
      input.maxMessages,
      CONFIG_LIMITS.maxMessages.min,
      CONFIG_LIMITS.maxMessages.max,
      DEFAULT_CONFIG.maxMessages,
    ),
    messageOrder: pickOption(input.messageOrder ?? input.order, MESSAGE_ORDERS, DEFAULT_CONFIG.messageOrder),
    position: pickOption(input.position ?? input.pos, POSITIONS, DEFAULT_CONFIG.position),
    density: pickOption(input.density ?? input.style, DENSITIES, DEFAULT_CONFIG.density),
    fontScale: clampNumber(input.fontScale ?? input.font, 80, 140, DEFAULT_CONFIG.fontScale),
    gapPx: clampNumber(input.gapPx ?? input.gap, 4, 24, DEFAULT_CONFIG.gapPx),
    backgroundOpacity: input.backgroundOpacity === undefined
      ? clampOpacityPercent(input.opacity, DEFAULT_CONFIG.backgroundOpacity)
      : clampOpacityUnit(input.backgroundOpacity, DEFAULT_CONFIG.backgroundOpacity),
    radiusPx: clampNumber(input.radiusPx ?? input.radius, 0, 24, DEFAULT_CONFIG.radiusPx),
    animation: pickOption(input.animation ?? input.anim, ANIMATIONS, DEFAULT_CONFIG.animation),
    showMeta: parseBoolean(input.showMeta ?? input.meta, DEFAULT_CONFIG.showMeta),
    notifications: parseBoolean(input.notifications ?? input.notifs, DEFAULT_CONFIG.notifications),
    twitchVisuals: parseBoolean(input.twitchVisuals ?? input.visuals, DEFAULT_CONFIG.twitchVisuals),
    externalEmotes: parseBoolean(input.externalEmotes ?? input.extemotes, DEFAULT_CONFIG.externalEmotes),
    automodSimulation: parseBoolean(input.automodSimulation ?? input.automod, DEFAULT_CONFIG.automodSimulation),
    debug: Boolean(input.debug),
  };
}

export function createOverlayUrl(currentUrl, input = {}) {
  const base = new URL(currentUrl);
  const config = normalizeConfig(input);
  const overlay = new URL("overlay.html", `${base.origin}${base.pathname}`);

  if (config.channel) overlay.searchParams.set("channel", config.channel);
  overlay.searchParams.set("accent", config.accentColor);
  overlay.searchParams.set("life", String(config.messageLifetimeMs));
  overlay.searchParams.set("max", String(config.maxMessages));
  overlay.searchParams.set("order", config.messageOrder);
  overlay.searchParams.set("pos", config.position);
  overlay.searchParams.set("style", config.density);
  overlay.searchParams.set("font", String(config.fontScale));
  overlay.searchParams.set("gap", String(config.gapPx));
  overlay.searchParams.set("opacity", String(Math.round(config.backgroundOpacity * 100)));
  overlay.searchParams.set("radius", String(config.radiusPx));
  overlay.searchParams.set("anim", config.animation);
  overlay.searchParams.set("meta", config.showMeta ? "1" : "0");
  if (config.notifications) overlay.searchParams.set("notifs", "1");
  if (config.twitchVisuals) overlay.searchParams.set("visuals", "1");
  if (config.externalEmotes) overlay.searchParams.set("extemotes", "1");
  if (config.automodSimulation) overlay.searchParams.set("automod", "1");
  if (config.debug) overlay.searchParams.set("debug", "1");

  return overlay.toString();
}

export function loadConfig(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_CONFIG };

  try {
    const raw = storage.getItem("overlay-chat-config");
    return normalizeConfig(raw ? JSON.parse(raw) : DEFAULT_CONFIG);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config, storage = globalThis.localStorage) {
  const normalized = normalizeConfig(config);
  if (storage) {
    storage.setItem("overlay-chat-config", JSON.stringify(normalized));
  }
  return normalized;
}

function sanitizeChannel(channel) {
  return String(channel).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function sanitizeClientId(clientId) {
  return String(clientId).trim().replace(/[^a-zA-Z0-9]/g, "");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (number < min) return min;
  if (number > max) return max;
  return Math.round(number);
}

function clampOpacityUnit(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function clampOpacityPercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(0, number)) / 100;
}

function pickOption(value, options, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return options.has(normalized) ? normalized : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (value === true || value === "1" || value === "true" || value === "on") return true;
  if (value === false || value === "0" || value === "false" || value === "off") return false;
  return fallback;
}
