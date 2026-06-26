import { normalizeConfig } from "./config.js";

export const OVERLAY_HEARTBEAT_STORAGE_KEY = "chatpulse-overlay-heartbeat";
export const COMMAND_ACK_STORAGE_KEY = "chatpulse-command-ack";

const DEFAULT_OVERLAY_HEARTBEAT = Object.freeze({
  overlayId: "",
  configHash: "",
  visible: 0,
  pending: 0,
  received: 0,
  updatedAt: 0,
});

const DEFAULT_COMMAND_ACK = Object.freeze({
  commandId: "",
  type: "",
  overlayId: "",
  status: "",
  message: "",
  updatedAt: 0,
});

export function readOverlayHeartbeat(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_OVERLAY_HEARTBEAT };

  try {
    return normalizeOverlayHeartbeat(JSON.parse(storage.getItem(OVERLAY_HEARTBEAT_STORAGE_KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_OVERLAY_HEARTBEAT };
  }
}

export function writeOverlayHeartbeat(storage = globalThis.localStorage, input = {}, now = Date.now) {
  const heartbeat = normalizeOverlayHeartbeat({
    ...input,
    updatedAt: now(),
  });

  storage?.setItem(OVERLAY_HEARTBEAT_STORAGE_KEY, JSON.stringify(heartbeat));
  return heartbeat;
}

export function isOverlayHeartbeatFresh(heartbeat = {}, maxAgeMs = 5000, now = Date.now()) {
  const normalized = normalizeOverlayHeartbeat(heartbeat);
  const age = Number(now) - normalized.updatedAt;

  return normalized.updatedAt > 0 && Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

export function readCommandAck(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_COMMAND_ACK };

  try {
    return normalizeCommandAck(JSON.parse(storage.getItem(COMMAND_ACK_STORAGE_KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_COMMAND_ACK };
  }
}

export function writeCommandAck(storage = globalThis.localStorage, input = {}, now = Date.now) {
  const ack = normalizeCommandAck({
    ...input,
    updatedAt: now(),
  });

  storage?.setItem(COMMAND_ACK_STORAGE_KEY, JSON.stringify(ack));
  return ack;
}

export function createOverlayConfigHash(input = {}) {
  const config = normalizeConfig(input);

  return [
    `channel=${config.channel}`,
    `accent=${config.accentColor}`,
    `max=${config.maxMessages}`,
    `life=${config.messageLifetimeMs}`,
    `order=${config.messageOrder}`,
    `pos=${config.position}`,
    `style=${config.density}`,
    `font=${config.fontScale}`,
    `gap=${config.gapPx}`,
    `opacity=${Math.round(config.backgroundOpacity * 100)}`,
    `radius=${config.radiusPx}`,
    `anim=${config.animation}`,
    `meta=${config.showMeta ? "1" : "0"}`,
    `notifs=${config.notifications ? "1" : "0"}`,
    `visuals=${config.twitchVisuals ? "1" : "0"}`,
    `extemotes=${config.externalEmotes ? "1" : "0"}`,
    `automod=${config.automodSimulation ? "1" : "0"}`,
    `debug=${config.debug ? "1" : "0"}`,
  ].join("|");
}

export function normalizeOverlayHeartbeat(input = {}) {
  return {
    overlayId: stringValue(input.overlayId),
    configHash: stringValue(input.configHash),
    visible: positiveInteger(input.visible),
    pending: positiveInteger(input.pending),
    received: positiveInteger(input.received),
    updatedAt: positiveTimestamp(input.updatedAt),
  };
}

export function normalizeCommandAck(input = {}) {
  return {
    commandId: stringValue(input.commandId),
    type: stringValue(input.type),
    overlayId: stringValue(input.overlayId),
    status: stringValue(input.status),
    message: stringValue(input.message).slice(0, 500),
    updatedAt: positiveTimestamp(input.updatedAt),
  };
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function positiveTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}
