import assert from "node:assert/strict";

const { formatOverlayUrl } = await import("../src/ui/overlay-url-display.js");

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

await test("visible overlay URL summary shows channel changes clearly", () => {
  const summary = formatOverlayUrl("http://127.0.0.1:8080/overlay.html?channel=nouvellechaine&accent=%230044cc&max=42&order=top");

  assert.equal(summary, "overlay.html - chaine nouvellechaine - 4 reglages");
});

await test("visible overlay URL summary stays safe with sensitive query params", () => {
  const summary = formatOverlayUrl("http://127.0.0.1:8080/overlay.html?channel=pantoufl&token=secret&access_token=secret&client_id=clientid");

  assert.equal(summary, "overlay.html - chaine pantoufl - 4 reglages");
  assert.equal(summary.includes("secret"), false);
  assert.equal(summary.includes("clientid"), false);
});
