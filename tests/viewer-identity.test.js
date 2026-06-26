import assert from "node:assert/strict";

const {
  normalizeViewerIdentity,
  viewerHistoryKey,
} = await import("../src/core/viewer-identity.js");

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

await test("viewer identity prefers Twitch user id and keeps safe display fields", () => {
  const identity = normalizeViewerIdentity({
    userId: " 12345 ",
    login: " Pantoufl ",
    author: "Pantoufl",
    color: "#14F195",
    badges: [{ setId: "moderator", id: "1" }],
  });

  assert.equal(identity.userId, "12345");
  assert.equal(identity.login, "pantoufl");
  assert.equal(identity.displayName, "Pantoufl");
  assert.equal(identity.color, "#14f195");
  assert.deepEqual(identity.badges, [{ setId: "moderator", id: "1" }]);
  assert.equal(viewerHistoryKey(identity), "id:12345");
});

await test("viewer identity falls back to sanitized login for demo and stress messages", () => {
  const identity = normalizeViewerIdentity({
    author: " Viewer Test ",
    login: "",
    userId: "",
  });

  assert.equal(identity.userId, "");
  assert.equal(identity.login, "viewer_test");
  assert.equal(identity.displayName, "Viewer Test");
  assert.equal(viewerHistoryKey(identity), "login:viewer_test");
});

await test("viewer identity strips unsafe values before future profile storage", () => {
  const identity = normalizeViewerIdentity({
    userId: "<script>42</script>",
    login: "Bad Login!!!",
    author: "Bad <Viewer>",
    color: "javascript:red",
    badges: new Array(12).fill("subscriber"),
  });

  assert.equal(identity.userId, "script42script");
  assert.equal(identity.login, "bad_login");
  assert.equal(identity.displayName, "Bad Viewer");
  assert.equal(identity.color, "");
  assert.equal(identity.badges.length, 8);
});
