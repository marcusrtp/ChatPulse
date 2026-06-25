const SEVENTV_API = "https://7tv.io/v3";
const BTTV_API = "https://api.betterttv.net/3/cached";
const FFZ_ROOM_API = "https://api.frankerfacez.com/v1/room";

export function createExternalEmoteAssets(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const emotes = new Map();

  async function loadForTwitchUser(twitchUserId) {
    const userId = String(twitchUserId ?? "").trim();
    const status = {
      providers: { seventv: 0, bttv: 0, ffz: 0 },
      total: 0,
      errors: [],
    };
    if (!userId) return status;

    await loadProvider(status, "seventv", () => loadSevenTv(userId));
    await loadProvider(status, "bttv", () => loadBetterTtv(userId));
    await loadProvider(status, "ffz", () => loadFrankerFaceZ(userId));

    status.total = emotes.size;
    return status;
  }

  async function loadProvider(status, provider, loader) {
    try {
      status.providers[provider] = await loader();
    } catch (error) {
      status.errors.push({ provider, message: error.message || "Chargement impossible" });
    }
  }

  async function loadSevenTv(userId) {
    const payload = await fetchJson(`${SEVENTV_API}/users/twitch/${encodeURIComponent(userId)}`);
    const items = payload?.emote_set?.emotes ?? payload?.emotes ?? [];
    let count = 0;

    for (const item of Array.isArray(items) ? items : []) {
      if (addEmote(normalizeSevenTvEmote(item))) count += 1;
    }

    return count;
  }

  async function loadBetterTtv(userId) {
    let count = 0;
    const globalPayload = await fetchJson(`${BTTV_API}/emotes/global`);
    for (const item of Array.isArray(globalPayload) ? globalPayload : []) {
      if (addEmote(normalizeBetterTtvEmote(item))) count += 1;
    }

    const channelPayload = await fetchJson(`${BTTV_API}/users/twitch/${encodeURIComponent(userId)}`);
    const channelEmotes = [
      ...(Array.isArray(channelPayload?.channelEmotes) ? channelPayload.channelEmotes : []),
      ...(Array.isArray(channelPayload?.sharedEmotes) ? channelPayload.sharedEmotes : []),
    ];
    for (const item of channelEmotes) {
      if (addEmote(normalizeBetterTtvEmote(item))) count += 1;
    }

    return count;
  }

  async function loadFrankerFaceZ(userId) {
    const payload = await fetchJson(`${FFZ_ROOM_API}/id/${encodeURIComponent(userId)}`);
    let count = 0;

    for (const set of Object.values(payload?.sets ?? {})) {
      for (const item of Array.isArray(set?.emoticons) ? set.emoticons : []) {
        if (addEmote(normalizeFrankerFaceZEmote(item))) count += 1;
      }
    }

    return count;
  }

  async function fetchJson(url) {
    if (!fetchImpl) throw new Error("Fetch indisponible dans cet environnement.");
    const response = await fetchImpl(url);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message ?? `Erreur emotes externes ${response.status}`);
    }
    return payload;
  }

  function addEmote(input = {}) {
    const emote = normalizeExternalEmote(input);
    if (!emote) return null;
    emotes.set(emote.code, emote);
    return emote;
  }

  function resolveEmote(code) {
    return emotes.get(String(code ?? "")) ?? null;
  }

  function enrichFragments(fragments = []) {
    if (!Array.isArray(fragments)) return [];

    const enriched = [];
    for (const fragment of fragments) {
      if (fragment?.type !== "text") {
        enriched.push(fragment);
        continue;
      }

      for (const nextFragment of enrichTextFragment(String(fragment.text ?? ""))) {
        appendFragment(enriched, nextFragment);
      }
    }
    return enriched;
  }

  function enrichTextFragment(text) {
    const parts = text.split(/(\s+)/);
    const output = [];

    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        appendText(output, part);
        continue;
      }

      const exact = resolveEmote(part);
      if (exact) {
        output.push(toExternalFragment(exact));
        continue;
      }

      const token = splitToken(part);
      const emote = resolveEmote(token.code);
      if (!emote) {
        appendText(output, part);
        continue;
      }

      appendText(output, token.leading);
      output.push(toExternalFragment(emote));
      appendText(output, token.trailing);
    }

    return output;
  }

  function getStatus() {
    return { total: emotes.size };
  }

  return { loadForTwitchUser, addEmote, resolveEmote, enrichFragments, getStatus };
}

function normalizeSevenTvEmote(item = {}) {
  const code = item.name ?? item.data?.name;
  const id = item.data?.id ?? item.id;
  const hostUrl = normalizeProtocolUrl(item.data?.host?.url ?? item.host?.url);
  const imageUrl = hostUrl
    ? `${hostUrl.replace(/\/+$/, "")}/2x.webp`
    : `https://cdn.7tv.app/emote/${encodeURIComponent(String(id ?? ""))}/2x.webp`;

  return { code, provider: "7TV", imageUrl, animated: Boolean(item.data?.animated ?? item.animated) };
}

function normalizeBetterTtvEmote(item = {}) {
  return {
    code: item.code,
    provider: "BTTV",
    imageUrl: `https://cdn.betterttv.net/emote/${encodeURIComponent(String(item.id ?? ""))}/2x`,
    animated: Boolean(item.animated),
  };
}

function normalizeFrankerFaceZEmote(item = {}) {
  const urls = item.urls ?? {};
  const url = urls[4] ?? urls[2] ?? urls[1] ?? "";

  return {
    code: item.name,
    provider: "FFZ",
    imageUrl: normalizeProtocolUrl(url),
    animated: Boolean(item.animated),
  };
}

function normalizeExternalEmote(input = {}) {
  const code = String(input.code ?? input.name ?? "").trim();
  const provider = String(input.provider ?? "").trim();
  const imageUrl = safeExternalEmoteUrl(input.imageUrl);
  if (!code || !provider || !imageUrl) return null;

  return {
    code,
    provider,
    imageUrl,
    animated: Boolean(input.animated),
  };
}

function splitToken(token) {
  const leading = token.match(/^[([{"']+/)?.[0] ?? "";
  const trailing = token.match(/[.,!?;:)\]}"']+$/)?.[0] ?? "";
  const code = token.slice(leading.length, token.length - trailing.length);
  return { leading, code, trailing };
}

function appendFragment(target, fragment) {
  if (fragment.type === "text") {
    appendText(target, fragment.text);
    return;
  }
  target.push(fragment);
}

function appendText(target, text) {
  if (!text) return;
  const previous = target[target.length - 1];
  if (previous?.type === "text") {
    previous.text += text;
    return;
  }
  target.push({ type: "text", text });
}

function toExternalFragment(emote) {
  return {
    type: "external-emote",
    text: emote.code,
    provider: emote.provider,
    imageUrl: emote.imageUrl,
  };
}

function normalizeProtocolUrl(url) {
  const value = String(url ?? "").trim();
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function safeExternalEmoteUrl(url) {
  const value = normalizeProtocolUrl(url);
  return /^https:\/\/(cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com)\//i.test(value) ? value : "";
}
