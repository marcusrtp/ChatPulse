import assert from "node:assert/strict";

const {
  createExternalEmoteAssets,
} = await import("../src/chat/external-emotes.js");

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

await test("external emote assets load 7TV BTTV and FFZ channel emotes", async () => {
  const calls = [];
  const assets = createExternalEmoteAssets({
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).endsWith("/v3/users/twitch/broadcaster-1")) {
        return jsonResponse({
          emote_set: {
            emotes: [{
              name: "OMEGALUL",
              data: {
                id: "01F7WQ2J000000000000000001",
                animated: false,
                host: { url: "//cdn.7tv.app/emote/01F7WQ2J000000000000000001" },
              },
            }],
          },
        });
      }
      if (String(url).endsWith("/3/cached/emotes/global")) {
        return jsonResponse([{ id: "56e9f494fff3cc5c35e5287e", code: "monkaS", animated: false }]);
      }
      if (String(url).endsWith("/3/cached/users/twitch/broadcaster-1")) {
        return jsonResponse({
          channelEmotes: [{ id: "channel-bttv-1", code: "widepeepoHappy", animated: false }],
          sharedEmotes: [{ id: "shared-bttv-1", code: "peepoHappy", animated: true }],
        });
      }
      if (String(url).endsWith("/v1/room/id/broadcaster-1")) {
        return jsonResponse({
          sets: {
            123: {
              emoticons: [{
                name: "Pog",
                animated: false,
                urls: { 1: "//cdn.frankerfacez.com/emote/123/1", 2: "//cdn.frankerfacez.com/emote/123/2" },
              }],
            },
          },
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    },
  });

  const status = await assets.loadForTwitchUser("broadcaster-1");

  assert.equal(status.providers.seventv, 1);
  assert.equal(status.providers.bttv, 3);
  assert.equal(status.providers.ffz, 1);
  assert.equal(assets.resolveEmote("OMEGALUL").provider, "7TV");
  assert.equal(assets.resolveEmote("OMEGALUL").imageUrl, "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp");
  assert.equal(assets.resolveEmote("monkaS").provider, "BTTV");
  assert.equal(assets.resolveEmote("Pog").imageUrl, "https://cdn.frankerfacez.com/emote/123/2");
  assert.equal(calls.length, 4);
});

await test("external emote assets enrich text fragments without touching Twitch emotes", async () => {
  const assets = createExternalEmoteAssets({ fetchImpl: async () => jsonResponse([]) });
  assets.addEmote({
    code: "OMEGALUL",
    provider: "7TV",
    imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
  });
  assets.addEmote({
    code: "monkaS",
    provider: "BTTV",
    imageUrl: "https://cdn.betterttv.net/emote/56e9f494fff3cc5c35e5287e/2x",
  });

  const fragments = assets.enrichFragments([
    { type: "text", text: "Salut OMEGALUL, monkaS " },
    { type: "emote", text: "Kappa", emoteId: "25" },
  ]);

  assert.deepEqual(fragments, [
    { type: "text", text: "Salut " },
    {
      type: "external-emote",
      text: "OMEGALUL",
      provider: "7TV",
      imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
    },
    { type: "text", text: ", " },
    {
      type: "external-emote",
      text: "monkaS",
      provider: "BTTV",
      imageUrl: "https://cdn.betterttv.net/emote/56e9f494fff3cc5c35e5287e/2x",
    },
    { type: "text", text: " " },
    { type: "emote", text: "Kappa", emoteId: "25" },
  ]);
});

await test("external emote assets continue when one provider fails", async () => {
  const assets = createExternalEmoteAssets({
    fetchImpl: async (url) => {
      if (String(url).includes("7tv")) throw new Error("7TV down");
      if (String(url).includes("betterttv")) return jsonResponse([{ id: "bttv-1", code: "monkaS" }]);
      return jsonResponse({ sets: {} });
    },
  });

  const status = await assets.loadForTwitchUser("broadcaster-1");

  assert.equal(status.providers.seventv, 0);
  assert.equal(status.providers.bttv, 1);
  assert.equal(status.errors.length, 1);
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
