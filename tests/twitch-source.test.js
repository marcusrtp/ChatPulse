import assert from "node:assert/strict";

const {
  buildTwitchAuthUrl,
  readTwitchTokenFromUrl,
} = await import("../src/twitch/oauth.js");
const {
  createTwitchEventSubSource,
} = await import("../src/twitch/eventsub-source.js");

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

await test("builds a browser OAuth URL without client secrets or OBS parameters", () => {
  const url = buildTwitchAuthUrl({
    clientId: "client-123",
    redirectUri: "http://127.0.0.1:8080/",
    state: "state-1",
    scopes: ["user:read:chat", "channel:bot"],
  });

  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://id.twitch.tv");
  assert.equal(parsed.pathname, "/oauth2/authorize");
  assert.equal(parsed.searchParams.get("client_id"), "client-123");
  assert.equal(parsed.searchParams.get("redirect_uri"), "http://127.0.0.1:8080/");
  assert.equal(parsed.searchParams.get("response_type"), "token");
  assert.equal(parsed.searchParams.get("state"), "state-1");
  assert.equal(parsed.searchParams.get("scope"), "user:read:chat channel:bot");
  assert.equal(url.includes("client_secret"), false);
  assert.equal(url.includes("overlay.html"), false);
});

await test("reads an OAuth token from the URL fragment only", () => {
  assert.deepEqual(readTwitchTokenFromUrl("http://127.0.0.1:8080/#access_token=abc123&scope=user%3Aread%3Achat&expires_in=3600&state=s1"), {
    accessToken: "abc123",
    scopes: ["user:read:chat"],
    expiresIn: 3600,
    state: "s1",
  });

  assert.equal(readTwitchTokenFromUrl("http://127.0.0.1:8080/?access_token=bad"), null);
});

await test("EventSub source resolves Twitch users, subscribes after welcome, and emits mapped events", async () => {
  const emitted = [];
  const fetchCalls = [];
  const sockets = [];

  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.sent = [];
      sockets.push(this);
    }

    send(payload) {
      this.sent.push(JSON.parse(payload));
    }

    close() {
      this.closed = true;
    }
  }

  const source = createTwitchEventSubSource({
    channel: "pantoufl",
    clientId: "client-123",
    accessToken: "token-123",
    twitchVisuals: true,
    externalEmotes: true,
    emit: (eventName, payload) => emitted.push({ eventName, payload }),
    WebSocketImpl: FakeWebSocket,
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url: String(url), options });
      if (String(url).includes("login=pantoufl")) {
        return jsonResponse({ data: [{ id: "broadcaster-1", login: "pantoufl", display_name: "Pantoufl" }] });
      }
      if (String(url).endsWith("/users")) {
        return jsonResponse({ data: [{ id: "user-1", login: "diagnostic", display_name: "Diagnostic" }] });
      }
      if (String(url).endsWith("/chat/badges/global")) {
        return jsonResponse({
          data: [{
            set_id: "moderator",
            versions: [{
              id: "1",
              title: "Moderator",
              description: "Moderator badge",
              image_url_1x: "https://static-cdn.jtvnw.net/badges/mod-1.png",
              image_url_2x: "https://static-cdn.jtvnw.net/badges/mod-2.png",
              image_url_4x: "https://static-cdn.jtvnw.net/badges/mod-4.png",
            }],
          }],
        });
      }
      if (String(url).endsWith("/chat/badges?broadcaster_id=broadcaster-1")) {
        return jsonResponse({ data: [] });
      }
      if (String(url).endsWith("/v3/users/twitch/broadcaster-1")) {
        return jsonResponse({
          emote_set: {
            emotes: [{
              name: "OMEGALUL",
              data: { id: "01F7WQ2J000000000000000001" },
            }],
          },
        });
      }
      if (String(url).endsWith("/3/cached/emotes/global")) {
        return jsonResponse([]);
      }
      if (String(url).endsWith("/3/cached/users/twitch/broadcaster-1")) {
        return jsonResponse({ channelEmotes: [], sharedEmotes: [] });
      }
      if (String(url).endsWith("/v1/room/id/broadcaster-1")) {
        return jsonResponse({ sets: {} });
      }
      if (String(url).endsWith("/eventsub/subscriptions")) {
        return jsonResponse({ data: [{ id: `sub-${fetchCalls.length}` }] }, 202);
      }
      throw new Error(`Unexpected fetch ${url}`);
    },
  });

  await source.start();
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].url, "wss://eventsub.wss.twitch.tv/ws");

  await sockets[0].onmessage({
    data: JSON.stringify({
      metadata: { message_type: "session_welcome" },
      payload: { session: { id: "session-1" } },
    }),
  });

  const subscriptionCalls = fetchCalls.filter((call) => call.url.endsWith("/eventsub/subscriptions"));
  assert.equal(subscriptionCalls.length, 6);
  assert.equal(subscriptionCalls[0].options.headers["Client-Id"], "client-123");
  assert.equal(subscriptionCalls[0].options.headers.Authorization, "Bearer token-123");

  await sockets[0].onmessage({
    data: JSON.stringify({
      metadata: { message_type: "notification" },
      payload: {
        subscription: { type: "channel.chat.message" },
        event: {
          message_id: "msg-live",
          chatter_user_id: "viewer-1",
          chatter_user_name: "Viewer Live",
          message: { text: "Live branché OMEGALUL" },
          badges: [{ set_id: "moderator", id: "1", info: "" }],
        },
      },
    }),
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].eventName, "chat:message");
  assert.equal(emitted[0].payload.id, "msg-live");
  assert.equal(emitted[0].payload.text, "Live branché OMEGALUL");
  assert.equal(emitted[0].payload.badges[0].imageUrl1x, "https://static-cdn.jtvnw.net/badges/mod-1.png");
  assert.deepEqual(emitted[0].payload.fragments, [
    { type: "text", text: "Live branché " },
    {
      type: "external-emote",
      text: "OMEGALUL",
      provider: "7TV",
      imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
    },
  ]);
  assert.equal(source.getStatus().connected, true);
});

await test("EventSub source rejects missing credentials before opening a socket", async () => {
  const source = createTwitchEventSubSource({
    channel: "pantoufl",
    clientId: "",
    accessToken: "",
    emit: () => {},
    WebSocketImpl: class {},
    fetchImpl: async () => jsonResponse({ data: [] }),
  });

  await assert.rejects(source.start(), /Client ID Twitch manquant/);
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}
