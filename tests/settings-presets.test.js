import assert from "node:assert/strict";

const { DEFAULT_CONFIG, normalizeConfig } = await import("../src/core/config.js");
const { PRESET_IDS, SETTING_PRESETS, applySettingsPreset, getSettingsPreset } = await import("../src/ui/settings-presets.js");

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

await test("settings presets expose streamer-ready choices in a stable order", () => {
  assert.deepEqual(PRESET_IDS, ["just-chatting", "fps", "mobile", "minimal", "big-screen"]);
  assert.equal(SETTING_PRESETS.length, 5);
  assert.equal(SETTING_PRESETS[0].label, "Just Chatting");
  assert.equal(SETTING_PRESETS.at(-1).label, "Grand écran");
});

await test("settings presets only change OBS display fields and preserve sensitive setup fields", () => {
  const current = normalizeConfig({
    ...DEFAULT_CONFIG,
    channel: "Pantoufl",
    twitchClientId: "clientid123",
    accentColor: "#14f195",
    debug: true,
    notifications: true,
    showMeta: false,
  });

  const next = applySettingsPreset(current, "fps");

  assert.equal(next.channel, "pantoufl");
  assert.equal(next.twitchClientId, "clientid123");
  assert.equal(next.accentColor, "#14f195");
  assert.equal(next.debug, true);
  assert.equal(next.notifications, true);
  assert.equal(next.showMeta, false);
  assert.equal(next.position, "left");
  assert.equal(next.maxMessages, 5);
  assert.equal(next.messageLifetimeMs, 7000);
});

await test("unknown settings preset keeps the current normalized config", () => {
  const current = normalizeConfig({ channel: "Pantoufl", maxMessages: 3 });

  assert.deepEqual(applySettingsPreset(current, "missing"), current);
  assert.equal(getSettingsPreset("missing"), undefined);
});
