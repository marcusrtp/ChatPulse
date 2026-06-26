import { twitchPreviewBadges } from "../twitch/preview-badges.js";
import { normalizeViewerIdentity, viewerHistoryKey } from "../core/viewer-identity.js";

export const STRESS_TEST_TOTAL = 120;

const VISUAL_PATTERNS = Object.freeze([
  Object.freeze({
    author: "NovaCaster",
    badges: Object.freeze(twitchPreviewBadges(["moderator"])),
    color: "#22c55e",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "Je garde un oeil sur le chat " }),
      Object.freeze({ type: "emote", text: "Kappa", emoteId: "25" }),
      Object.freeze({ type: "text", text: " vous voyez bien l'overlay ?" }),
    ]),
  }),
  Object.freeze({
    author: "VipNova",
    badges: Object.freeze(twitchPreviewBadges(["vip"])),
    color: "#ec4899",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "Coucou le chat " }),
      Object.freeze({ type: "emote", text: "HeyGuys", emoteId: "30259" }),
      Object.freeze({ type: "text", text: " le rendu OBS est clean chez moi." }),
    ]),
  }),
  Object.freeze({
    author: "SubSignal",
    badges: Object.freeze(twitchPreviewBadges(["subscriber"])),
    color: "#8b5cf6",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "GG le fight " }),
      Object.freeze({ type: "emote", text: "LUL", emoteId: "425618" }),
      Object.freeze({ type: "text", text: " l'overlay reste lisible meme quand ca spam." }),
    ]),
  }),
  Object.freeze({
    author: "RaidReady",
    badges: Object.freeze(twitchPreviewBadges(["moderator", "vip", "subscriber"])),
    color: "#06b6d4",
    fragments: Object.freeze([
      Object.freeze({ type: "text", text: "Raid entrant ? On spam proprement " }),
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

const REALISTIC_MESSAGES = Object.freeze([
  Object.freeze({ author: "PixelMod", text: "Message de test recu, l'overlay reagit bien." }),
  Object.freeze({ author: "ClipHunter", text: "Quelqu'un peut clip le dernier move ?" }),
  Object.freeze({ author: "ChatCoach", text: "Le son est bon chez vous ou je dois monter un peu ?" }),
  Object.freeze({ author: "LurkerMax", text: "Je lurk mais le chat est super lisible sur OBS." }),
  Object.freeze({ author: "BuildCheck", text: "La couleur du pseudo ressort mieux maintenant." }),
  Object.freeze({ author: "MeloView", text: "On voit bien les messages en bas de l'ecran." }),
  Object.freeze({ author: "NoLagPlease", text: "Pas de lag ici, ca defile nickel." }),
  Object.freeze({ author: "RaidReady", text: "Si un raid arrive maintenant, l'overlay tient ?" }),
  Object.freeze({ author: "SubSignal", text: "Le badge abo se voit bien sur fond sombre." }),
  Object.freeze({ author: "VipNova", text: "Les emotes passent bien dans le rendu OBS." }),
  Object.freeze({ author: "ModLuna", text: "Je surveille AutoMod, rien ne doit rester affiche si c'est bloque." }),
  Object.freeze({ author: "PantouChat", text: "C'est beaucoup plus naturel comme flux de chat." }),
  Object.freeze({ author: "GGViewer", text: "GG, le dernier timing etait propre !" }),
  Object.freeze({ author: "QuestionLive", text: "Tu comptes garder cette scene pour le vrai live ?" }),
  Object.freeze({ author: "DebugFan", text: "Le diagnostic OBS confirme bien les commandes ?" }),
  Object.freeze({ author: "MiniChat", text: "Court message pour verifier l'espacement." }),
]);

const LONG_TEXT = "Message plus long comme un vrai viewer qui raconte ce qu'il voit : le chat reste lisible, les badges ne mangent pas le texte, les emotes gardent leur taille et l'overlay OBS ne deborde pas.";

export function createStressTestMessage(index) {
  const visualPattern = index % 5 === 0
    ? VISUAL_PATTERNS[(index / 5) % VISUAL_PATTERNS.length]
    : undefined;
  const scenario = scenarioFor(index);
  const text = visualPattern
    ? visualPattern.fragments.map((fragment) => fragment.text).join("")
    : scenario.text;
  const identity = normalizeViewerIdentity({
    author: visualPattern?.author ?? scenario.author,
    badges: visualPattern ? [...visualPattern.badges] : ["demo"],
    color: visualPattern?.color,
  });

  return {
    author: identity.displayName,
    displayName: identity.displayName,
    login: identity.login,
    userId: identity.userId,
    viewerKey: viewerHistoryKey(identity),
    text,
    source: visualPattern ? "premium-test" : "demo",
    badges: identity.badges,
    color: identity.color || undefined,
    fragments: visualPattern ? [
      ...visualPattern.fragments.map((fragment) => ({ ...fragment })),
    ] : [{ type: "text", text }],
  };
}

export function emitStressTestMessages(demoSource, totalMessagesOrOptions = STRESS_TEST_TOTAL) {
  const options = normalizeStressOptions(totalMessagesOrOptions);
  const { totalMessages, intervalMs, scheduler, onComplete, startAt, now } = options;

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

    const initialDelayMs = millisecondsUntilStart(startAt, now);
    if (totalMessages > 0 && initialDelayMs > 0) scheduler(emitNext, initialDelayMs);
    else if (totalMessages > 0) emitNext();
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
      startAt: 0,
      now: Date.now,
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
    startAt: normalizeStartAt(options.startAt),
    now: typeof options.now === "function" ? options.now : Date.now,
    onComplete: typeof options.onComplete === "function" ? options.onComplete : undefined,
  };
}

function normalizeStartAt(value) {
  const startAt = Number(value);
  return Number.isFinite(startAt) && startAt > 0 ? startAt : 0;
}

function millisecondsUntilStart(startAt, now) {
  if (!startAt) return 0;

  const current = Number(now?.());
  if (!Number.isFinite(current)) return 0;

  return Math.max(0, Math.floor(startAt - current));
}

function emitStressTestMessage(demoSource, index) {
  const message = createStressTestMessage(index);
  demoSource.emitTestMessage(message.author, message.text, {
    source: message.source,
    displayName: message.displayName,
    login: message.login,
    userId: message.userId,
    viewerKey: message.viewerKey,
    badges: message.badges,
    color: message.color,
    fragments: message.fragments,
  });
}

function scenarioFor(index) {
  if (index > 0 && index % 17 === 0) {
    return {
      author: `PseudoTresLong_${String(index).padStart(3, "0")}_Streamer`,
      text: LONG_TEXT,
    };
  }

  return REALISTIC_MESSAGES[index % REALISTIC_MESSAGES.length];
}
