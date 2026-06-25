const TWITCH_CDN_BADGE_BASE = "https://static-cdn.jtvnw.net/badges/v1";

const GLOBAL_PREVIEW_BADGES = Object.freeze({
  moderator: previewBadge({
    setId: "moderator",
    id: "1",
    title: "Bouclier moderateur Twitch",
    uuid: "3267646d-33f0-4b17-b3df-f923a41db1d0",
  }),
  vip: previewBadge({
    setId: "vip",
    id: "1",
    title: "Badge VIP Twitch",
    uuid: "b817aba4-fad8-49e2-b88a-7cc744dfa6ec",
  }),
});

const CHANNEL_PREVIEW_BADGES = Object.freeze({
  subscriber: Object.freeze({
    setId: "subscriber",
    id: "0",
    title: "Badge abonne Twitch de la chaine",
  }),
});

export function twitchPreviewBadge(setId) {
  const safeSetId = String(setId ?? "").trim();
  const badge = GLOBAL_PREVIEW_BADGES[safeSetId] ?? CHANNEL_PREVIEW_BADGES[safeSetId];
  if (!badge) return safeSetId;
  return { ...badge };
}

export function twitchPreviewBadges(setIds = []) {
  return setIds.map(twitchPreviewBadge).filter(Boolean);
}

function previewBadge({ setId, id, title, uuid }) {
  return Object.freeze({
    setId,
    id,
    title,
    imageUrl1x: `${TWITCH_CDN_BADGE_BASE}/${uuid}/1`,
    imageUrl2x: `${TWITCH_CDN_BADGE_BASE}/${uuid}/2`,
    imageUrl4x: `${TWITCH_CDN_BADGE_BASE}/${uuid}/3`,
  });
}
