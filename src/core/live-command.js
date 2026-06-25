export const LIVE_COMMAND_STORAGE_KEY = "chatpulse-live-command";

export const LIVE_COMMAND_TYPES = new Set([
  "test-message",
  "obs-notification",
  "stress-test",
  "delete-message",
  "warning",
  "error",
]);

const DEFAULT_LIVE_COMMAND = Object.freeze({
  id: "",
  type: "",
  payload: {},
  createdAt: 0,
});

export function readLiveCommand(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_LIVE_COMMAND };

  try {
    return normalizeLiveCommand(JSON.parse(storage.getItem(LIVE_COMMAND_STORAGE_KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_LIVE_COMMAND };
  }
}

export function writeLiveCommand(storage = globalThis.localStorage, input = {}, now = Date.now) {
  const createdAt = now();
  const command = normalizeLiveCommand({
    ...input,
    id: `command-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
  });

  storage?.setItem(LIVE_COMMAND_STORAGE_KEY, JSON.stringify(command));
  return command;
}

export function normalizeLiveCommand(input = {}) {
  const type = LIVE_COMMAND_TYPES.has(input.type) ? input.type : "";

  return {
    id: String(input.id ?? ""),
    type,
    payload: sanitizePayload(input.payload),
    createdAt: normalizeTimestamp(input.createdAt),
  };
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};

  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key, value]) => key === "messages" || typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      .map(([key, value]) => {
        if (key === "messages") return [key, sanitizeMessages(value)];
        return [key, typeof value === "string" ? value.slice(0, 500) : value];
      }),
  );
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages.slice(0, 8).map((message) => {
    const safeMessage = message && typeof message === "object" ? message : {};

    return {
      author: String(safeMessage.author ?? "Viewer").slice(0, 80),
      text: String(safeMessage.text ?? "").slice(0, 500),
      source: String(safeMessage.source ?? "premium-test").slice(0, 40),
      color: /^#[0-9a-f]{6}$/i.test(String(safeMessage.color ?? "")) ? safeMessage.color : "",
      badges: sanitizeBadges(safeMessage.badges),
      fragments: sanitizeFragments(safeMessage.fragments),
    };
  });
}

function sanitizeBadges(badges) {
  if (!Array.isArray(badges)) return [];

  return badges.slice(0, 6).map((badge) => {
    if (typeof badge === "string") return badge.slice(0, 40);
    const safeBadge = badge && typeof badge === "object" ? badge : {};

    return {
      setId: String(safeBadge.setId ?? safeBadge.set_id ?? "").slice(0, 40),
      id: String(safeBadge.id ?? "").slice(0, 40),
      info: String(safeBadge.info ?? "").slice(0, 80),
      title: String(safeBadge.title ?? "").slice(0, 120),
      imageUrl1x: sanitizeTwitchAssetUrl(safeBadge.imageUrl1x),
      imageUrl2x: sanitizeTwitchAssetUrl(safeBadge.imageUrl2x),
      imageUrl4x: sanitizeTwitchAssetUrl(safeBadge.imageUrl4x),
    };
  }).filter((badge) => typeof badge === "string" || badge.setId);
}

function sanitizeFragments(fragments) {
  if (!Array.isArray(fragments)) return [];

  return fragments.slice(0, 20).map((fragment) => {
    const safeFragment = fragment && typeof fragment === "object" ? fragment : {};
    const type = fragmentType(safeFragment.type);
    const text = String(safeFragment.text ?? "").slice(0, 120);

    if (type === "external-emote") {
      return {
        type,
        text,
        provider: safeExternalProvider(safeFragment.provider),
        imageUrl: sanitizeExternalEmoteUrl(safeFragment.imageUrl),
        emoteId: undefined,
      };
    }

    return {
      type,
      text,
      emoteId: safeFragment.emoteId ? String(safeFragment.emoteId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : undefined,
    };
  }).filter((fragment) => fragment.text);
}

function fragmentType(type) {
  if (type === "emote") return "emote";
  if (type === "external-emote") return "external-emote";
  return "text";
}

function normalizeTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : DEFAULT_LIVE_COMMAND.createdAt;
}

function sanitizeTwitchAssetUrl(url) {
  const value = String(url ?? "").slice(0, 300);
  return /^https:\/\/static-cdn\.jtvnw\.net\//i.test(value) ? value : "";
}

function safeExternalProvider(provider) {
  const value = String(provider ?? "").toUpperCase();
  return ["7TV", "BTTV", "FFZ"].includes(value) ? value : "";
}

function sanitizeExternalEmoteUrl(url) {
  const value = String(url ?? "").slice(0, 300);
  return /^https:\/\/(cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com)\//i.test(value)
    ? value
    : "";
}
