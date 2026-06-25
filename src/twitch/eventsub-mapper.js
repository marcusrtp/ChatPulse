const EVENTSUB_SCOPES = Object.freeze([
  "user:read:chat",
  "user:bot",
  "channel:bot",
  "moderator:read:chat_messages",
  "moderator:read:automod_settings",
  "moderator:read:banned_users",
]);

export function requiredEventSubScopes() {
  return [...EVENTSUB_SCOPES];
}

export function normalizeTwitchLogin(login = "") {
  return String(login).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function createTwitchEventSubMapper(options = {}) {
  const channel = normalizeTwitchLogin(options.channel);
  const badgeResolver = typeof options.badgeResolver === "function" ? options.badgeResolver : () => null;
  const externalEmoteResolver = typeof options.externalEmoteResolver === "function" ? options.externalEmoteResolver : () => null;

  function mapNotification(notification = {}) {
    const type = notification.subscription?.type;
    const event = notification.event ?? {};

    if (type === "channel.chat.message") {
      return emit("chat:message", mapChatMessage(event));
    }

    if (type === "channel.chat.message_delete") {
      return emit("chat:moderation", mapDeletedMessage(event));
    }

    if (type === "channel.chat.clear_user_messages") {
      return emit("chat:moderation", mapUserModeration(event, "clear_user"));
    }

    if (type === "channel.chat.clear") {
      return emit("chat:moderation", withBase({ type: "clear_chat" }));
    }

    if (type === "automod.message.hold") {
      return emit("chat:moderation", mapAutomodHold(event));
    }

    if (type === "channel.ban") {
      return emit("chat:moderation", mapBanOrTimeout(event));
    }

    return null;
  }

  function mapChatMessage(event) {
    return withBase({
      id: stringOrFallback(event.message_id, `twitch-${Date.now()}`),
      userId: stringOrFallback(event.chatter_user_id, event.user_id),
      author: stringOrFallback(event.chatter_user_name, event.chatter_user_login, "Viewer"),
      login: normalizeTwitchLogin(event.chatter_user_login ?? event.chatter_user_name),
      text: messageText(event.message),
      fragments: enrichExternalEmotes(messageFragments(event.message)),
      badges: enrichBadges(badges(event.badges)),
      color: event.color,
      timestamp: Date.now(),
      source: "twitch",
    });
  }

  function mapDeletedMessage(event) {
    return withBase({
      type: "message_deleted",
      messageId: stringOrFallback(event.message_id),
      userId: stringOrFallback(event.target_user_id, event.user_id),
      author: stringOrFallback(event.target_user_name, event.target_user_login),
      login: normalizeTwitchLogin(event.target_user_login ?? event.target_user_name),
      source: "twitch",
    });
  }

  function mapUserModeration(event, type) {
    return withBase({
      type,
      userId: stringOrFallback(event.target_user_id, event.user_id),
      author: stringOrFallback(event.target_user_name, event.target_user_login, event.user_name, event.user_login),
      login: normalizeTwitchLogin(event.target_user_login ?? event.target_user_name ?? event.user_login ?? event.user_name),
      source: "twitch",
    });
  }

  function mapAutomodHold(event) {
    const message = withBase({
      id: stringOrFallback(event.message_id, `automod-${Date.now()}`),
      userId: stringOrFallback(event.user_id, event.chatter_user_id),
      author: stringOrFallback(event.user_name, event.user_login, event.chatter_user_name, "Viewer"),
      login: normalizeTwitchLogin(event.user_login ?? event.user_name ?? event.chatter_user_login),
      text: messageText(event.message),
      fragments: enrichExternalEmotes(messageFragments(event.message)),
      badges: enrichBadges(badges(event.badges)),
      timestamp: Date.now(),
      source: "twitch",
      moderationReason: "AutoMod Twitch",
    });

    return withBase({
      type: "automod_held",
      messageId: message.id,
      userId: message.userId,
      author: message.author,
      login: message.login,
      message,
      source: "twitch",
    });
  }

  function mapBanOrTimeout(event) {
    return withBase({
      type: event.ends_at ? "user_timeout" : "user_banned",
      userId: stringOrFallback(event.user_id),
      author: stringOrFallback(event.user_name, event.user_login),
      login: normalizeTwitchLogin(event.user_login ?? event.user_name),
      expiresAt: event.ends_at ?? null,
      source: "twitch",
    });
  }

  function withBase(payload) {
    return {
      ...payload,
      channel,
    };
  }

  function enrichBadges(nextBadges) {
    return nextBadges.map((badge) => {
      try {
        return { ...badge, ...(badgeResolver(badge) ?? {}) };
      } catch {
        return badge;
      }
    });
  }

  function enrichExternalEmotes(fragments) {
    const enriched = [];
    for (const fragment of fragments) {
      if (fragment.type !== "text") {
        enriched.push(fragment);
        continue;
      }

      for (const nextFragment of splitExternalEmoteText(fragment.text, externalEmoteResolver)) {
        appendTextOrFragment(enriched, nextFragment);
      }
    }
    return enriched;
  }

  return { mapNotification };
}

function emit(eventName, payload) {
  return { eventName, payload };
}

function messageText(message = {}) {
  if (Array.isArray(message.fragments) && message.fragments.length > 0) {
    return message.fragments.map((fragment) => fragment.text ?? "").join("").trim();
  }

  return String(message.text ?? "").trim();
}

function messageFragments(message = {}) {
  if (Array.isArray(message.fragments) && message.fragments.length > 0) {
    return message.fragments
      .map((fragment) => {
        const type = String(fragment.type ?? "text");
        const text = String(fragment.text ?? "");

        if (type === "emote") {
          return {
            type: "emote",
            text,
            emoteId: stringOrFallback(fragment.emote?.id, fragment.id, fragment.emote_id),
          };
        }

        return { type: "text", text };
      })
      .filter((fragment) => fragment.text);
  }

  const text = String(message.text ?? "").trim();
  return text ? [{ type: "text", text }] : [];
}

function splitExternalEmoteText(text, resolver) {
  const parts = String(text ?? "").split(/(\s+)/);
  const output = [];

  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      appendTextOrFragment(output, { type: "text", text: part });
      continue;
    }

    const exact = safeResolveExternalEmote(part, resolver);
    if (exact) {
      output.push(externalEmoteFragment(part, exact));
      continue;
    }

    const token = splitToken(part);
    const emote = safeResolveExternalEmote(token.code, resolver);
    if (!emote) {
      appendTextOrFragment(output, { type: "text", text: part });
      continue;
    }

    appendTextOrFragment(output, { type: "text", text: token.leading });
    output.push(externalEmoteFragment(token.code, emote));
    appendTextOrFragment(output, { type: "text", text: token.trailing });
  }

  return output;
}

function safeResolveExternalEmote(code, resolver) {
  try {
    return resolver(code);
  } catch {
    return null;
  }
}

function splitToken(token) {
  const leading = token.match(/^[([{"']+/)?.[0] ?? "";
  const trailing = token.match(/[.,!?;:)\]}"']+$/)?.[0] ?? "";
  const code = token.slice(leading.length, token.length - trailing.length);
  return { leading, code, trailing };
}

function externalEmoteFragment(code, emote) {
  return {
    type: "external-emote",
    text: code,
    provider: emote.provider,
    imageUrl: emote.imageUrl,
  };
}

function appendTextOrFragment(target, fragment) {
  if (fragment.type !== "text") {
    target.push(fragment);
    return;
  }

  if (!fragment.text) return;
  const previous = target[target.length - 1];
  if (previous?.type === "text") {
    previous.text += fragment.text;
    return;
  }
  target.push(fragment);
}

function badges(rawBadges) {
  if (!Array.isArray(rawBadges)) return [];
  return rawBadges.map((badge) => {
    if (typeof badge === "string") {
      return { setId: badge, id: "", info: "" };
    }

    return {
      setId: stringOrFallback(badge?.set_id, badge?.setId, badge?.name),
      id: stringOrFallback(badge?.id, badge?.version_id, badge?.versionId),
      info: stringOrFallback(badge?.info),
    };
  }).filter((badge) => badge.setId);
}

function stringOrFallback(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}
