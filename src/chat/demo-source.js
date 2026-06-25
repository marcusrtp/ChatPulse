const SAMPLE_MESSAGES = [
  ["NovaCaster", "Overlay en ligne, le chat est lisible."],
  ["PixelMod", "Message de test reçu avant le live."],
  ["SubSignal", "Le panneau de diagnostic indique que tout est sain."],
  ["RaidReady", "Voilà ce que les viewers verront dans OBS."],
];

const PREMIUM_TWITCH_TEST_MESSAGES = Object.freeze([
  {
    author: "ModLuna",
    text: "Badge moderateur visible avec couleur verte et emote Kappa.",
    badges: ["moderator"],
    color: "#22c55e",
    fragments: [
      { type: "text", text: "Badge moderateur visible " },
      { type: "emote", text: "Kappa", emoteId: "25" },
      { type: "text", text: " couleur pseudo verte." },
    ],
  },
  {
    author: "VipNova",
    text: "Badge VIP visible avec couleur rose et emote HeyGuys.",
    badges: ["vip"],
    color: "#ec4899",
    fragments: [
      { type: "text", text: "Badge VIP visible " },
      { type: "emote", text: "HeyGuys", emoteId: "30259" },
      { type: "text", text: " couleur pseudo rose." },
    ],
  },
  {
    author: "SubSignal",
    text: "Badge abonne visible avec couleur violette et emote LUL.",
    badges: ["subscriber"],
    color: "#8b5cf6",
    fragments: [
      { type: "text", text: "Badge abonne visible " },
      { type: "emote", text: "LUL", emoteId: "425618" },
      { type: "text", text: " couleur pseudo violette." },
    ],
  },
  {
    author: "ComboPremium",
    text: "Test complet : moderateur, VIP, abonne, emotes Twitch et couleur cyan.",
    badges: ["moderator", "vip", "subscriber"],
    color: "#06b6d4",
    fragments: [
      { type: "text", text: "Test complet : MOD VIP SUB " },
      { type: "emote", text: "Kappa", emoteId: "25" },
      { type: "text", text: " + " },
      { type: "emote", text: "HeyGuys", emoteId: "30259" },
    ],
  },
]);

export function createDemoChatSource(options = {}) {
  const now = options.now ?? (() => Date.now());
  const emit = options.emit ?? (() => {});
  let index = 0;
  let timer = null;

  function emitTestMessage(author = "UtilisateurDémo", text = "Ceci est un message de test", messageOptions = {}) {
    return emitMessage({
      author,
      text,
      ...messageOptions,
    });
  }

  function emitPremiumTestMessages() {
    return PREMIUM_TWITCH_TEST_MESSAGES.map((message) => emitMessage({
      ...message,
      source: "premium-test",
    }));
  }

  function emitMessage(input = {}) {
    const text = String(input.text || "Ceci est un message de test");
    const message = {
      id: `demo-${now()}-${index++}`,
      author: String(input.author || "UtilisateurDémo"),
      text,
      fragments: normalizeFragments(input.fragments, text),
      timestamp: now(),
      source: String(input.source || "demo"),
      badges: Array.isArray(input.badges) ? input.badges : ["demo"],
      color: input.color,
    };
    emit("chat:message", message);
    return message;
  }

  function start(intervalMs = 4500) {
    stop();
    timer = setInterval(() => {
      const [author, text] = SAMPLE_MESSAGES[index % SAMPLE_MESSAGES.length];
      emitTestMessage(author, text);
    }, intervalMs);
    return stop;
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { emitTestMessage, emitPremiumTestMessages, start, stop };
}

function normalizeFragments(fragments, fallbackText) {
  if (Array.isArray(fragments) && fragments.length > 0) {
    return fragments.map((fragment) => {
      const type = String(fragment.type || "text");
      const normalized = {
        type,
        text: String(fragment.text || ""),
        emoteId: fragment.emoteId ? String(fragment.emoteId) : undefined,
      };

      if (type === "external-emote") {
        normalized.provider = String(fragment.provider || "");
        normalized.imageUrl = String(fragment.imageUrl || "");
      }

      return normalized;
    }).filter((fragment) => fragment.text);
  }

  return [{ type: "text", text: fallbackText }];
}
