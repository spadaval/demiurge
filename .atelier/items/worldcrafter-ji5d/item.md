---
schema: atelier.item
schema_version: 3
id: worldcrafter-ji5d
title: Cloudflare Worker sync backend and optional inference proxy for laptop and phone
status: open
mission: worldcrafter-3z9j
labels:
- sync
- worker
priority: medium
blocked_by:
- worldcrafter-4t98
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.598196939Z
---

## Goal

Build the Cloudflare Worker sync backend (behind Cloudflare Access, per `worldcrafter-gcox`) using `worldcrafter-4t98`'s sync-ready tombstones and change timestamps so one writer can switch seamlessly between laptop and phone, plus an optional inference proxy for hosted providers and a home `llama.cpp` over Cloudflare Tunnel.

## Done when

- [ ] Sync protocol pushes and pulls changed records and tombstones cleanly across two simulated devices (memory/IndexedDB adapters) without data loss, with conflict handling documented and tested.
- [ ] Optional inference proxy forwards OpenAI-compatible chat/tool/completion requests (including custom sampler params) without exposing provider API keys to world data or stored provenance.
- [ ] Contract and integration tests pass locally; `bun run check` passes in `app/`.

## Scope

In: Cloudflare Worker sync endpoints, client sync adapter, optional inference proxy, and tests.
Out: Multi-user collaboration, public auth/billing, and live deployment/domain cutover (`worldcrafter-v61k`, waits for Sumeet).
