import { normalizeViewerIdentity, viewerHistoryKey } from "./viewer-identity.js";

const DEFAULT_LIMITS = Object.freeze({
  maxMessagesPerViewer: 100,
  maxEventsPerViewer: 100,
});

export function createViewerHistoryStore(options = {}) {
  const maxMessagesPerViewer = positiveInteger(options.maxMessagesPerViewer, DEFAULT_LIMITS.maxMessagesPerViewer);
  const maxEventsPerViewer = positiveInteger(options.maxEventsPerViewer, DEFAULT_LIMITS.maxEventsPerViewer);
  const now = typeof options.now === "function" ? options.now : Date.now;
  const profiles = new Map();

  function recordMessage(message = {}) {
    const identity = normalizeViewerIdentity(message);
    const key = safeViewerKey(message.viewerKey) || viewerHistoryKey(identity);
    const timestamp = safeTimestamp(message.timestamp, now);
    const profile = getOrCreateProfile(key, identity, timestamp);
    const storedMessage = normalizeStoredMessage(message, identity, key, timestamp);

    profile.messages.push(storedMessage);
    profile.messages.splice(0, Math.max(0, profile.messages.length - maxMessagesPerViewer));
    profile.messageCount += 1;
    refreshProfileIdentity(profile, identity, timestamp);
    return cloneProfile(profile);
  }

  function recordModeration(event = {}) {
    if (event.type === "clear_chat") {
      return recordGlobalClearChat(event);
    }

    if (event.message) {
      const status = moderationStatusFor(event.type);
      const messageProfile = recordMessage({
        ...event.message,
        moderationStatus: status,
        timestamp: event.message.timestamp ?? event.timestamp,
      });
      const profile = profiles.get(messageProfile.viewerKey);
      recordModerationEvent(profile, event, status);
      return cloneProfile(profile);
    }

    const profile = findModeratedProfile(event);
    if (!profile) return null;

    const status = moderationStatusFor(event.type);
    if (status) markModeratedMessages(profile, event, status);
    recordModerationEvent(profile, event, status);
    return cloneProfile(profile);
  }

  function recordGlobalClearChat(event) {
    const status = moderationStatusFor(event.type);

    for (const profile of profiles.values()) {
      markModeratedMessages(profile, event, status);
      recordModerationEvent(profile, event, status);
    }

    return listViewerProfiles();
  }

  function getViewerProfile(viewerOrKey) {
    const key = typeof viewerOrKey === "string"
      ? viewerOrKey
      : safeViewerKey(viewerOrKey?.viewerKey) || viewerHistoryKey(viewerOrKey ?? {});
    const profile = profiles.get(key);
    return profile ? cloneProfile(profile) : null;
  }

  function listViewerProfiles() {
    return [...profiles.values()]
      .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
      .map(cloneProfile);
  }

  function clear() {
    profiles.clear();
  }

  function getOrCreateProfile(key, identity, timestamp) {
    if (profiles.has(key)) return profiles.get(key);

    const profile = {
      viewerKey: key,
      userId: identity.userId,
      login: identity.login,
      displayName: identity.displayName,
      color: identity.color,
      badges: identity.badges,
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      lastModerationAt: 0,
      messageCount: 0,
      moderationCount: 0,
      counters: {
        deleted: 0,
        blocked: 0,
        removed: 0,
      },
      messages: [],
      moderationEvents: [],
    };

    profiles.set(key, profile);
    return profile;
  }

  function findModeratedProfile(event) {
    if (event.messageId) {
      const profile = findProfileByMessageId(event.messageId);
      if (profile) return profile;
    }

    const identity = normalizeViewerIdentity(event);
    const key = safeViewerKey(event.viewerKey) || viewerHistoryKey(identity);
    return getOrCreateProfile(key, identity, safeTimestamp(event.timestamp, now));
  }

  function findProfileByMessageId(messageId) {
    for (const profile of profiles.values()) {
      if (profile.messages.some((message) => message.id === messageId)) return profile;
    }
    return null;
  }

  function markModeratedMessages(profile, event, status) {
    const predicate = event.messageId
      ? (message) => message.id === event.messageId
      : (message) => message.viewerKey === profile.viewerKey && !message.moderationStatus;

    let changed = 0;
    for (const message of profile.messages) {
      if (predicate(message) && message.moderationStatus !== status) {
        message.moderationStatus = status;
        changed += 1;
      }
    }

    if (changed > 0) incrementCounter(profile, status, changed);
  }

  function recordModerationEvent(profile, event, status) {
    const timestamp = safeTimestamp(event.timestamp, now);
    profile.moderationCount += 1;
    profile.lastModerationAt = timestamp;
    profile.lastSeenAt = Math.max(profile.lastSeenAt, timestamp);
    profile.moderationEvents.push(normalizeStoredModerationEvent(event, status, timestamp));
    profile.moderationEvents.splice(0, Math.max(0, profile.moderationEvents.length - maxEventsPerViewer));

    if (event.message) incrementCounter(profile, status, 1);
  }

  return {
    recordMessage,
    recordModeration,
    getViewerProfile,
    listViewerProfiles,
    clear,
  };
}

function normalizeStoredMessage(message, identity, viewerKey, timestamp) {
  return {
    id: String(message.id ?? ""),
    viewerKey,
    userId: identity.userId,
    login: identity.login,
    author: identity.displayName,
    displayName: identity.displayName,
    text: String(message.text ?? ""),
    timestamp,
    source: String(message.source ?? "demo"),
    moderationStatus: message.moderationStatus,
  };
}

function normalizeStoredModerationEvent(event, status, timestamp) {
  return {
    type: String(event.type ?? ""),
    messageId: String(event.messageId ?? event.message?.id ?? ""),
    status,
    timestamp,
    reason: String(event.reason ?? event.moderationReason ?? event.message?.moderationReason ?? ""),
  };
}

function refreshProfileIdentity(profile, identity, timestamp) {
  profile.userId = identity.userId || profile.userId;
  profile.login = identity.login || profile.login;
  profile.displayName = identity.displayName || profile.displayName;
  profile.color = identity.color || profile.color;
  profile.badges = identity.badges.length ? identity.badges : profile.badges;
  profile.lastSeenAt = Math.max(profile.lastSeenAt, timestamp);
}

function moderationStatusFor(type) {
  if (type === "message_deleted") return "deleted";
  if (type === "automod_held" || type === "blocked") return "blocked";
  if (type === "user_banned" || type === "user_timeout" || type === "clear_user" || type === "clear_chat") return "removed";
  return "";
}

function incrementCounter(profile, status, amount) {
  if (status === "deleted") profile.counters.deleted += amount;
  if (status === "blocked") profile.counters.blocked += amount;
  if (status === "removed") profile.counters.removed += amount;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function safeTimestamp(value, now) {
  const timestamp = Number(value);
  if (Number.isFinite(timestamp) && timestamp >= 0) return timestamp;
  return Number(now());
}

function safeViewerKey(value) {
  const key = String(value ?? "").trim();
  return /^(id|login|display):[a-zA-Z0-9_.:-]+$/.test(key) ? key : "";
}

function cloneProfile(profile) {
  return {
    ...profile,
    badges: [...profile.badges],
    counters: { ...profile.counters },
    messages: profile.messages.map((message) => ({ ...message })),
    moderationEvents: profile.moderationEvents.map((event) => ({ ...event })),
  };
}
