import assert from "node:assert/strict";

const {
  STRESS_TEST_TOTAL,
  createStressTestMessage,
  emitStressTestMessages,
} = await import("../src/chat/stress-fixtures.js");

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

await test("stress fixtures keep a saturated chat and Twitch visual samples", () => {
  const messages = Array.from({ length: STRESS_TEST_TOTAL }, (_, index) => createStressTestMessage(index));
  const visualMessages = messages.filter((message) => message.badges?.length || message.color || message.fragments?.some((fragment) => fragment.type === "emote"));

  assert.equal(STRESS_TEST_TOTAL, 120);
  assert.ok(visualMessages.length >= 24);
  assert.ok(messages.some((message) => badgeSetIds(message).includes("moderator")));
  assert.ok(messages.some((message) => badgeSetIds(message).includes("vip")));
  assert.ok(messages.some((message) => badgeSetIds(message).includes("subscriber")));
  assert.ok(messages.some((message) => message.badges.some((badge) => badge.setId === "moderator" && badge.imageUrl2x)));
  assert.ok(messages.some((message) => message.badges.some((badge) => badge.setId === "vip" && badge.imageUrl2x)));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "emote" && fragment.emoteId)));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "external-emote" && fragment.provider === "7TV")));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "external-emote" && fragment.provider === "BTTV")));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "external-emote" && fragment.provider === "FFZ")));
  assert.ok(messages.some((message) => message.author === "NovaCaster"));
  assert.ok(messages.some((message) => message.author === "PixelMod"));
  assert.ok(messages.some((message) => message.author.startsWith("PseudoTresLong_")));
  assert.equal(messages.every((message) => message.displayName === message.author), true);
  assert.equal(messages.every((message) => message.login && message.viewerKey === `login:${message.login}`), true);
  assert.equal(messages.every((message) => message.author.startsWith("PseudoTresLong_")), false);
  assert.ok(messages.some((message) => /son|clip|chat|overlay|OBS/i.test(message.text)));
  assert.ok(messages.some((message) => message.text.length > 130));
});

await test("stress test can be paced so history and preview update message by message", () => {
  const emitted = [];
  const scheduled = [];
  const demoSource = {
    emitTestMessage(author, text, options) {
      emitted.push({ author, text, options });
    },
  };

  emitStressTestMessages(demoSource, {
    totalMessages: 3,
    intervalMs: 25,
    scheduler(callback, delay) {
      scheduled.push({ callback, delay });
    },
  });

  assert.equal(emitted.length, 1);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 25);

  scheduled.shift().callback();
  assert.equal(emitted.length, 2);

  scheduled.shift().callback();
  assert.equal(emitted.length, 3);
  assert.equal(scheduled.length, 0);
});

await test("stress test can delay first message until a shared OBS start time", () => {
  const emitted = [];
  const scheduled = [];
  const demoSource = {
    emitTestMessage(author, text, options) {
      emitted.push({ author, text, options });
    },
  };

  emitStressTestMessages(demoSource, {
    totalMessages: 2,
    intervalMs: 25,
    startAt: 1050,
    now: () => 1000,
    scheduler(callback, delay) {
      scheduled.push({ callback, delay });
    },
  });

  assert.equal(emitted.length, 0);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 50);

  scheduled.shift().callback();
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].options.login, "novacaster");
  assert.equal(emitted[0].options.viewerKey, "login:novacaster");
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 25);

  scheduled.shift().callback();
  assert.equal(emitted.length, 2);
  assert.equal(scheduled.length, 0);
});

function badgeSetIds(message) {
  return message.badges.map((badge) => badge.setId ?? badge);
}
