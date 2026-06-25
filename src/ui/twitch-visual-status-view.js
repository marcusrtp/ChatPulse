export function createTwitchVisualStatusView({ listElement, documentRef = globalThis.document }) {
  return {
    render(state = {}) {
      const rows = [
        statusRow(documentRef, "OAuth Twitch", state.oauthConnected ? "Connecté" : "Non connecté", state.oauthConnected ? "ok" : "warning"),
        statusRow(documentRef, "Badges officiels", twitchBadgeStatus(state), state.config?.twitchVisuals ? "info" : "muted"),
        statusRow(documentRef, "Badges abonnés", subscriberBadgeStatus(state), state.config?.twitchVisuals ? "info" : "muted"),
        statusRow(documentRef, "Emotes externes", externalEmoteStatus(state), state.config?.externalEmotes ? "info" : "muted"),
      ];

      listElement.replaceChildren(...rows);
    },
  };
}

function statusRow(documentRef, label, value, tone = "info") {
  const row = documentRef.createElement("div");
  const title = documentRef.createElement("span");
  const status = documentRef.createElement("strong");

  row.className = `visual-status-row visual-status-${tone}`;
  title.textContent = label;
  status.textContent = value;
  row.append(title, status);
  return row;
}

function twitchBadgeStatus(state) {
  if (!state.config?.twitchVisuals) return "Désactivé";
  if (!state.oauthConnected) return "Aperçu local";

  const badgeCount = Number(state.assets?.badges?.badges ?? 0);
  if (state.assets?.badges?.status === "loaded" && badgeCount > 0) {
    return `${badgeCount} badges chargés`;
  }

  return "Fallback actif";
}

function subscriberBadgeStatus(state) {
  if (!state.config?.twitchVisuals) return "Désactivé";
  if (!state.oauthConnected) return "Fallback abonné";

  const badgeSetCount = Number(state.assets?.badges?.badgeSets ?? 0);
  if (state.assets?.badges?.status === "loaded" && badgeSetCount > 0) {
    return `${badgeSetCount} familles chargées`;
  }

  return "Fallback abonné";
}

function externalEmoteStatus(state) {
  if (!state.config?.externalEmotes) return "Désactivé";
  if (!state.oauthConnected) return "Mode test";

  const providers = state.assets?.externalEmotes?.providers ?? {};
  if (state.assets?.externalEmotes?.status !== "loaded") return "Fallback actif";

  return [
    `7TV ${Number(providers.seventv ?? 0)}`,
    `BTTV ${Number(providers.bttv ?? 0)}`,
    `FFZ ${Number(providers.ffz ?? 0)}`,
  ].join(" · ");
}
