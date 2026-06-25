import assert from "node:assert/strict";

const {
  createTwitchChatAssets,
} = await import("../src/twitch/chat-assets.js");

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

await test("Twitch chat assets load global and channel badge images", async () => {
  const calls = [];
  const assets = createTwitchChatAssets({
    clientId: "client-123",
    accessToken: "token-123",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
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
        return jsonResponse({
          data: [{
            set_id: "subscriber",
            versions: [{
              id: "6",
              title: "6-Month Subscriber",
              description: "Subscriber badge",
              image_url_1x: "https://static-cdn.jtvnw.net/badges/sub-1.png",
              image_url_2x: "https://static-cdn.jtvnw.net/badges/sub-2.png",
              image_url_4x: "https://static-cdn.jtvnw.net/badges/sub-4.png",
            }],
          }],
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    },
  });

  await assets.loadForBroadcaster("broadcaster-1");

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers["Client-Id"], "client-123");
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-123");
  assert.deepEqual(assets.resolveBadge({ setId: "moderator", id: "1" }), {
    setId: "moderator",
    id: "1",
    title: "Moderator",
    description: "Moderator badge",
    imageUrl1x: "https://static-cdn.jtvnw.net/badges/mod-1.png",
    imageUrl2x: "https://static-cdn.jtvnw.net/badges/mod-2.png",
    imageUrl4x: "https://static-cdn.jtvnw.net/badges/mod-4.png",
  });
  assert.equal(assets.resolveBadge({ setId: "subscriber", id: "6" }).imageUrl2x, "https://static-cdn.jtvnw.net/badges/sub-2.png");
});

await test("Twitch chat assets fall back safely when a badge version is unknown", async () => {
  const assets = createTwitchChatAssets({
    clientId: "client-123",
    accessToken: "token-123",
    fetchImpl: async () => jsonResponse({ data: [] }),
  });

  await assets.loadForBroadcaster("broadcaster-1");

  assert.equal(assets.resolveBadge({ setId: "vip", id: "1" }), null);
  assert.equal(assets.resolveBadge("moderator"), null);
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
