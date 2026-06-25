import { twitchPreviewBadges } from "../twitch/preview-badges.js";

export const STRESS_TEST_TOTAL = 120;

const VISUAL_PATTERNS = Object.freeze([
  Object.freeze({
    badges: Object.freeze(twitchPreviewBadges(["moderator"])),
    color: "#22c55e",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "MOD vérifie la lisibilité " }),
      Object.freeze({ type: "emote", text: "Kappa", emoteId: "25" }),
      Object.freeze({ type: "text", text: " pendant la rafale." }),
    ]),
  }),
  Object.freeze({
    badges: Object.freeze(twitchPreviewBadges(["vip"])),
    color: "#ec4899",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "VIP garde le chat visible " }),
      Object.freeze({ type: "emote", text: "HeyGuys", emoteId: "30259" }),
      Object.freeze({ type: "text", text: " sans chevauchement." }),
    ]),
  }),
  Object.freeze({
    badges: Object.freeze(twitchPreviewBadges(["subscriber"])),
    color: "#8b5cf6",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "SUB teste les emotes " }),
      Object.freeze({ type: "emote", text: "LUL", emoteId: "425618" }),
      Object.freeze({ type: "text", text: " dans un message long." }),
    ]),
  }),
  Object.freeze({
    badges: Object.freeze(twitchPreviewBadges(["moderator", "vip", "subscriber"])),
    color: "#06b6d4",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "Combo badges + emotes " }),
      Object.freeze({ type: "emote", text: "Kappa", emoteId: "25" }),
      Object.freeze({ type: "text", text: " " }),
      Object.freeze({ type: "emote", text: "HeyGuys", emoteId: "30259" }),
      Object.freeze({ type: "text", text: " " }),
      Object.freeze({
        type: "external-emote",
        text: "wideVIBE",
        provider: "7TV",
        imageUrl: "https://cdn.7tv.app/emote/01G1GXCR380004YN3NKDRR9QHD/2x.webp",
      }),
      Object.freeze({ type: "text", text: " " }),
      Object.freeze({
        type: "external-emote",
        text: "monkaS",
        provider: "BTTV",
        imageUrl: "https://cdn.betterttv.net/emote/56e9f494fff3cc5c35e5287e/2x",
      }),
      Object.freeze({ type: "text", text: " " }),
      Object.freeze({
        type: "external-emote",
        text: "Pog",
        provider: "FFZ",
        imageUrl: "https://cdn.frankerfacez.com/emote/210748/2",
      }),
    ]),
  }),
]);

const LONG_TEXT = "Message très long pour vérifier la saturation de l'overlay OBS, les retours à la ligne, les badges, les couleurs de pseudo et les emotes Twitch sans débordement horizontal.";

export function createStressTestMessage(index) {
  const visualPattern = index % 5 === 0
    ? VISUAL_PATTERNS[(index / 5) % VISUAL_PATTERNS.length]
    : undefined;
  const id = index + 1;
  const text = visualPattern
    ? `${visualPattern.fragments.map((fragment) => fragment.text).join("")} ${LONG_TEXT} #${id}`
    : `${LONG_TEXT} #${id}`;

  return {
    author: `PseudoTresLong_${String(index).padStart(3, "0")}_Streamer`,
    text,
    source: visualPattern ? "premium-test" : "demo",
    badges: visualPattern ? [...visualPattern.badges] : ["demo"],
    color: visualPattern?.color,
    fragments: visualPattern ? [
      ...visualPattern.fragments.map((fragment) => ({ ...fragment })),
      { type: "text", text: ` ${LONG_TEXT} #${id}` },
    ] : [{ type: "text", text }],
  };
}

export function emitStressTestMessages(demoSource, totalMessagesOrOptions = STRESS_TEST_TOTAL) {
  const options = normalizeStressOptions(totalMessagesOrOptions);
  const { totalMessages, intervalMs, scheduler, onComplete } = options;

  if (intervalMs > 0 && typeof scheduler === "function") {
    let index = 0;
    let cancelled = false;

    function emitNext() {
      if (cancelled) return;
      emitStressTestMessage(demoSource, index);
      index += 1;

      if (index < totalMessages) {
        scheduler(emitNext, intervalMs);
        return;
      }

      onComplete?.();
    }

    if (totalMessages > 0) emitNext();
    else onComplete?.();

    return {
      cancel() {
        cancelled = true;
      },
    };
  }

  for (let index = 0; index < totalMessages; index += 1) {
    emitStressTestMessage(demoSource, index);
  }

  onComplete?.();
  return { cancel() {} };
}

function normalizeStressOptions(totalMessagesOrOptions) {
  if (typeof totalMessagesOrOptions === "number") {
    return {
      totalMessages: Math.max(0, Math.floor(totalMessagesOrOptions)),
      intervalMs: 0,
      scheduler: globalThis.setTimeout?.bind(globalThis),
      onComplete: undefined,
    };
  }

  const options = totalMessagesOrOptions && typeof totalMessagesOrOptions === "object"
    ? totalMessagesOrOptions
    : {};

  return {
    totalMessages: Math.max(0, Math.floor(Number(options.totalMessages ?? STRESS_TEST_TOTAL))),
    intervalMs: Math.max(0, Math.floor(Number(options.intervalMs ?? 0))),
    scheduler: options.scheduler ?? globalThis.setTimeout?.bind(globalThis),
    onComplete: typeof options.onComplete === "function" ? options.onComplete : undefined,
  };
}

function emitStressTestMessage(demoSource, index) {
  const message = createStressTestMessage(index);
  demoSource.emitTestMessage(message.author, message.text, {
    source: message.source,
    badges: message.badges,
    color: message.color,
    fragments: message.fragments,
  });
}
