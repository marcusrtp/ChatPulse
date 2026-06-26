import assert from "node:assert/strict";

const {
  createTwitchEventSubMapper,
  normalizeTwitchLogin,
  requiredEventSubScopes,
} = await import("../src/twitch/eventsub-mapper.js");

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

await test("normalizes Twitch logins without leaking unsafe characters", () => {
  assert.equal(normalizeTwitchLogin("  Streamer_Name  "), "streamer_name");
  assert.equal(normalizeTwitchLogin("bad.channel/access_token=secret"), "badchannelaccess_tokensecret");
});

await test("declares only the EventSub scopes needed for chat and moderation diagnostics", () => {
  assert.deepEqual(requiredEventSubScopes(), [
    "user:read:chat",
    "user:bot",
    "channel:bot",
    "moderator:read:chat_messages",
    "moderator:read:automod_settings",
    "moderator:read:banned_users",
  ]);
});

await test("maps channel.chat.message into an internal chat message with Twitch visual metadata", () => {
  const mapper = createTwitchEventSubMapper({
    channel: "Pantoufl",
    badgeResolver: (badge) => {
      if (badge.setId !== "moderator") return null;
      return {
        setId: "moderator",
        id: "1",
        title: "Moderator",
        description: "Moderator badge",
        imageUrl1x: "https://static-cdn.jtvnw.net/badges/mod-1.png",
        imageUrl2x: "https://static-cdn.jtvnw.net/badges/mod-2.png",
        imageUrl4x: "https://static-cdn.jtvnw.net/badges/mod-4.png",
      };
    },
  });
  const mapped = mapper.mapNotification({
    subscription: { type: "channel.chat.message" },
    event: {
      message_id: "msg-1",
      chatter_user_id: "user-1",
      chatter_user_login: "ViewerOne",
      chatter_user_name: "Viewer One",
      message: {
        text: "Salut le stream",
        fragments: [
          { type: "text", text: "Salut " },
          { type: "emote", text: "Kappa", emote: { id: "25" } },
        ],
      },
      badges: [
        { set_id: "moderator", id: "1", info: "" },
        { set_id: "subscriber", id: "6", info: "6" },
        { set_id: "vip", id: "1", info: "" },
      ],
      color: "#14f195",
    },
  });

  assert.equal(mapped.eventName, "chat:message");
  assert.equal(mapped.payload.id, "msg-1");
  assert.equal(mapped.payload.userId, "user-1");
  assert.equal(mapped.payload.author, "Viewer One");
  assert.equal(mapped.payload.login, "viewerone");
  assert.equal(mapped.payload.displayName, "Viewer One");
  assert.equal(mapped.payload.viewerKey, "id:user-1");
  assert.equal(mapped.payload.text, "Salut Kappa");
  assert.deepEqual(mapped.payload.fragments, [
    { type: "text", text: "Salut " },
    { type: "emote", text: "Kappa", emoteId: "25" },
  ]);
  assert.deepEqual(mapped.payload.badges, [
    {
      setId: "moderator",
      id: "1",
      info: "",
      title: "Moderator",
      description: "Moderator badge",
      imageUrl1x: "https://static-cdn.jtvnw.net/badges/mod-1.png",
      imageUrl2x: "https://static-cdn.jtvnw.net/badges/mod-2.png",
      imageUrl4x: "https://static-cdn.jtvnw.net/badges/mod-4.png",
    },
    { setId: "subscriber", id: "6", info: "6" },
    { setId: "vip", id: "1", info: "" },
  ]);
  assert.equal(mapped.payload.source, "twitch");
  assert.equal(mapped.payload.channel, "pantoufl");
  assert.equal(mapped.payload.color, "#14f195");
});

await test("maps external emote words into renderable message fragments", () => {
  const mapper = createTwitchEventSubMapper({
    channel: "pantoufl",
    externalEmoteResolver: (code) => {
      if (code !== "OMEGALUL") return null;
      return {
        code: "OMEGALUL",
        provider: "7TV",
        imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
      };
    },
  });

  const mapped = mapper.mapNotification({
    subscription: { type: "channel.chat.message" },
    event: {
      message_id: "msg-external-1",
      chatter_user_id: "user-1",
      chatter_user_login: "viewerone",
      chatter_user_name: "Viewer One",
      message: { text: "Salut OMEGALUL, le chat" },
      badges: [],
      color: "",
    },
  });

  assert.deepEqual(mapped.payload.fragments, [
    { type: "text", text: "Salut " },
    {
      type: "external-emote",
      text: "OMEGALUL",
      provider: "7TV",
      imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
    },
    { type: "text", text: ", le chat" },
  ]);
});

await test("maps message deletion to a moderation event by message id", () => {
  const mapper = createTwitchEventSubMapper({ channel: "pantoufl" });
  const mapped = mapper.mapNotification({
    subscription: { type: "channel.chat.message_delete" },
    event: {
      message_id: "msg-2",
      target_user_id: "user-2",
      target_user_login: "deleted_user",
      target_user_name: "Deleted User",
    },
  });

  assert.deepEqual(mapped, {
    eventName: "chat:moderation",
    payload: {
      type: "message_deleted",
      messageId: "msg-2",
      userId: "user-2",
      author: "Deleted User",
      login: "deleted_user",
      displayName: "Deleted User",
      viewerKey: "id:user-2",
      source: "twitch",
      channel: "pantoufl",
    },
  });
});

await test("maps user purge, clear chat, Automod hold, ban and timeout", () => {
  const mapper = createTwitchEventSubMapper({ channel: "pantoufl" });

  assert.equal(mapper.mapNotification({
    subscription: { type: "channel.chat.clear_user_messages" },
    event: { target_user_id: "user-3", target_user_name: "Spammer" },
  }).payload.type, "clear_user");

  assert.equal(mapper.mapNotification({
    subscription: { type: "channel.chat.clear" },
    event: {},
  }).payload.type, "clear_chat");

  const automod = mapper.mapNotification({
    subscription: { type: "automod.message.hold" },
    event: {
      message_id: "held-1",
      user_id: "user-4",
      user_login: "held_user",
      user_name: "Held User",
      message: { text: "Message à vérifier" },
    },
  });
  assert.equal(automod.payload.type, "automod_held");
  assert.equal(automod.payload.viewerKey, "id:user-4");
  assert.equal(automod.payload.message.id, "held-1");
  assert.equal(automod.payload.message.viewerKey, "id:user-4");
  assert.equal(automod.payload.message.text, "Message à vérifier");
  assert.equal(automod.payload.message.moderationReason, "AutoMod Twitch");

  const ban = mapper.mapNotification({
    subscription: { type: "channel.ban" },
    event: { user_id: "user-5", user_name: "Banned User", ends_at: null },
  });
  assert.equal(ban.payload.type, "user_banned");

  const timeout = mapper.mapNotification({
    subscription: { type: "channel.ban" },
    event: { user_id: "user-6", user_name: "Timed User", ends_at: "2026-06-25T16:00:00Z" },
  });
  assert.equal(timeout.payload.type, "user_timeout");
});

await test("ignores unsupported EventSub notification types safely", () => {
  const mapper = createTwitchEventSubMapper({ channel: "pantoufl" });
  assert.equal(mapper.mapNotification({
    subscription: { type: "channel.follow" },
    event: {},
  }), null);
});
