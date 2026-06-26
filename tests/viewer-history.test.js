import assert from "node:assert/strict";

const { createViewerHistoryStore } = await import("../src/core/viewer-history.js");

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

await test("viewer history groups messages by stable viewer key", () => {
  const store = createViewerHistoryStore({ maxMessagesPerViewer: 2, now: () => 5000 });

  store.recordMessage({ id: "m1", userId: "u1", author: "Alice", login: "alice", text: "Premier", timestamp: 1000 });
  store.recordMessage({ id: "m2", userId: "u2", author: "Bob", login: "bob", text: "Hello", timestamp: 1500 });
  store.recordMessage({ id: "m3", userId: "u1", author: "Alice", login: "alice", text: "Deuxieme", timestamp: 2000 });
  store.recordMessage({ id: "m4", userId: "u1", author: "Alice", login: "alice", text: "Troisieme", timestamp: 3000 });

  const profile = store.getViewerProfile("id:u1");

  assert.equal(profile.viewerKey, "id:u1");
  assert.equal(profile.displayName, "Alice");
  assert.equal(profile.login, "alice");
  assert.equal(profile.messageCount, 3);
  assert.equal(profile.firstSeenAt, 1000);
  assert.equal(profile.lastSeenAt, 3000);
  assert.deepEqual(profile.messages.map((message) => message.id), ["m3", "m4"]);
  assert.deepEqual(store.listViewerProfiles().map((item) => item.viewerKey), ["id:u1", "id:u2"]);
});

await test("viewer history links moderation events to existing and held messages", () => {
  const store = createViewerHistoryStore({ now: () => 9000 });

  store.recordMessage({ id: "m1", userId: "u1", author: "Alice", login: "alice", text: "A supprimer", timestamp: 1000 });
  store.recordModeration({ type: "message_deleted", messageId: "m1", userId: "u1", author: "Alice", login: "alice", timestamp: 2000 });
  store.recordModeration({
    type: "automod_held",
    message: { id: "held-1", userId: "u2", author: "Bob", login: "bob", text: "Bloque", timestamp: 3000 },
    timestamp: 3000,
  });

  const alice = store.getViewerProfile("id:u1");
  const bob = store.getViewerProfile("id:u2");

  assert.equal(alice.moderationCount, 1);
  assert.equal(alice.counters.deleted, 1);
  assert.equal(alice.messages[0].moderationStatus, "deleted");
  assert.deepEqual(alice.moderationEvents.map((event) => event.type), ["message_deleted"]);

  assert.equal(bob.moderationCount, 1);
  assert.equal(bob.counters.blocked, 1);
  assert.equal(bob.messages[0].moderationStatus, "blocked");
  assert.equal(bob.messages[0].text, "Bloque");
});

await test("viewer history applies global clear chat without creating a fake viewer", () => {
  const store = createViewerHistoryStore({ now: () => 4000 });

  store.recordMessage({ id: "m1", userId: "u1", author: "Alice", login: "alice", text: "A retirer", timestamp: 1000 });
  store.recordMessage({ id: "m2", userId: "u2", author: "Bob", login: "bob", text: "A retirer aussi", timestamp: 1500 });

  const profiles = store.recordModeration({ type: "clear_chat", timestamp: 2000 });

  assert.equal(Array.isArray(profiles), true);
  assert.deepEqual(store.listViewerProfiles().map((profile) => profile.viewerKey).sort(), ["id:u1", "id:u2"]);
  assert.equal(store.getViewerProfile("display:viewer"), null);
  assert.equal(store.getViewerProfile("id:u1").messages[0].moderationStatus, "removed");
  assert.equal(store.getViewerProfile("id:u2").messages[0].moderationStatus, "removed");
  assert.equal(store.getViewerProfile("id:u1").counters.removed, 1);
  assert.equal(store.getViewerProfile("id:u2").counters.removed, 1);
});
