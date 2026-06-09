# ADR 0001 — Electron desktop wrapper with GitHub Releases auto-update

**Status:** Accepted  
**Date:** 2026-06-04

## Context

The pricing calculator is a plain HTML/CSS/JS web app. The team wants a cross-platform desktop app (Mac + Windows) for internal sales/presales staff, distributed without a central web server.

## Decision

Wrap the existing web app with **Electron**. Use **electron-builder** for packaging and **electron-updater** pointing at **GitHub Releases** for auto-updates. CI/CD via **GitHub Actions** (free tier).

Key constraints accepted:
- **Single window** with nav toggle between Calculator and Admin (no separate `admin.html` window)
- **Local-only config** — `localStorage` per machine, no sync between laptops
- **No Apple Developer account** — Mac users do right-click → Open on first install to bypass Gatekeeper; no code signing for v1
- **Manual install, auto-update thereafter** — first install is a shared `.dmg`/`.exe`; subsequent updates are silent via electron-updater

## Alternatives considered

- **Tauri** — smaller binary, but requires Rust toolchain and has the same Gatekeeper problem without signing
- **PWA / installable web app** — no auto-update control, no offline guarantee, still needs a server
- **No auto-update (pure manual)** — rejected because GitHub Actions + electron-updater is free and eliminates redistribution friction after v1

## Consequences

- App bundle is ~150MB (Chromium bundled) — acceptable for internal tooling
- Mac Gatekeeper warning on first install is known friction; revisit if Apple Developer account ($99/yr) becomes worthwhile
- All existing HTML/CSS/JS runs unchanged inside Electron's renderer
