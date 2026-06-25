import assert from "node:assert/strict";

const { STRESS_TEST_TOTAL, createStressTestMessage } = await import("../src/chat/stress-fixtures.js");

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
  assert.ok(messages.some((message) => message.badges.includes("moderator")));
  assert.ok(messages.some((message) => message.badges.includes("vip")));
  assert.ok(messages.some((message) => message.badges.includes("subscriber")));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "emote" && fragment.emoteId)));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "external-emote" && fragment.provider === "7TV")));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "external-emote" && fragment.provider === "BTTV")));
  assert.ok(messages.some((message) => message.fragments.some((fragment) => fragment.type === "external-emote" && fragment.provider === "FFZ")));
  assert.ok(messages.every((message) => message.author.startsWith("PseudoTresLong_")));
});
