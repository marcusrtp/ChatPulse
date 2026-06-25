# ChatPulse MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-cost static MVP for a Twitch/OBS chat overlay with a control/debug center, demo mode, and maintainable modules ready for optional OAuth later.

**Architecture:** The app is static-first and split into focused ES modules: event bus, diagnostics, config, demo chat source, renderer, overlay bootstrap, and control bootstrap. Tests cover pure modules first; browser smoke checks validate that both pages load and expose expected UI.

**Tech Stack:** Plain HTML, CSS, JavaScript ES modules, Node.js test runner through standalone scripts, no npm dependencies for the first sprint.

---

## File Structure

- `index.html`: control/debug center used by streamers before and during live.
- `overlay.html`: OBS Browser Source page.
- `src/core/event-bus.js`: tiny pub/sub primitive.
- `src/core/diagnostics.js`: status aggregation and readable event log.
- `src/core/config.js`: default config, validation, persistence, OBS URL generation.
- `src/chat/demo-source.js`: deterministic simulated chat source for no-account demo mode.
- `src/ui/chat-renderer.js`: DOM renderer for messages.
- `src/ui/control-app.js`: wires controls, diagnostic panel, preview and URL copy.
- `src/ui/overlay-app.js`: wires overlay rendering and demo source.
- `styles/base.css`: shared design tokens and layout.
- `styles/control.css`: control/debug center styling.
- `styles/overlay.css`: OBS overlay styling.
- `tests/unit.test.js`: core behavior tests.
- `tests/browser-smoke.js`: static browser smoke without external dependencies.
- `tools/build-targets.js`: structural verification for expected files and imports.
- `README.md`: local usage and OBS setup.

## Tasks

### Task 1: Core Tests

**Files:**
- Create: `tests/unit.test.js`

- [ ] Write failing tests for diagnostics status transitions, event logging, config validation, OBS URL generation, event bus delivery, and demo source message emission.
- [ ] Run `node tests/unit.test.js` and confirm failure because modules do not exist.

### Task 2: Core Modules

**Files:**
- Create: `src/core/event-bus.js`
- Create: `src/core/diagnostics.js`
- Create: `src/core/config.js`
- Create: `src/chat/demo-source.js`

- [ ] Implement minimal modules to satisfy tests.
- [ ] Run `node tests/unit.test.js` and confirm all assertions pass.

### Task 3: Static UI

**Files:**
- Create: `index.html`
- Create: `overlay.html`
- Create: `src/ui/chat-renderer.js`
- Create: `src/ui/control-app.js`
- Create: `src/ui/overlay-app.js`
- Create: `styles/base.css`
- Create: `styles/control.css`
- Create: `styles/overlay.css`

- [ ] Build a professional control/debug center with demo mode, status cards, event log, test message, OBS URL field and preview.
- [ ] Build an OBS overlay page with transparent background, compact premium messages and demo feed.

### Task 4: Verification Scripts and Docs

**Files:**
- Create: `tests/browser-smoke.js`
- Create: `tools/build-targets.js`
- Create: `README.md`

- [ ] Verify expected files, imports and page markers without external dependencies.
- [ ] Document OBS setup, demo mode, security posture, and future OAuth boundary.

### Task 5: Final Verification

**Commands:**
- `node --check src/core/event-bus.js`
- `node --check src/core/diagnostics.js`
- `node --check src/core/config.js`
- `node --check src/chat/demo-source.js`
- `node --check src/ui/chat-renderer.js`
- `node --check src/ui/control-app.js`
- `node --check src/ui/overlay-app.js`
- `node tests/unit.test.js`
- `node tools/build-targets.js`
- `node tests/browser-smoke.js`

Expected: every command exits with code 0.

## Self-Review

Spec coverage: this plan implements the no-cost static MVP, demo mode, diagnostic center, OBS overlay, maintainable modular structure, and security boundary that avoids token exposure in OBS URLs. OAuth is intentionally not implemented in the first coding pass, but the connector boundary is reserved through the chat source/module split.

Placeholder scan: no implementation placeholders are intended in this plan.

Type consistency: modules use plain JavaScript objects and ES module exports so they can run in both browser and Node tests.

