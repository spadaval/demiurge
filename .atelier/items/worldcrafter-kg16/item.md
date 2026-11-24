---
schema: atelier.item
schema_version: 3
id: worldcrafter-kg16
title: Stop Vercel building the deleted root app on every push to master
status: open
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-24T07:08:48.419165800Z
---

## Goal

Every push to master makes Vercel start a Production deployment that fails, and Sumeet gets the failure mail. The latest is `dpl_ERdku6o8excE68isr8PSWtbSYrU3` for `aece208` on 2026-11-23.

The Vercel project `worldcrafter` is connected to the GitHub repo and builds the repository root. Until 2026-11-11 the root held the old Nitro app, whose `package.json` had `"build": "bun --bun vite build"`; the last deployment that succeeded is `ef83841` on 2026-11-11. `d545f9c` ("Retire the old root app") deleted the root `package.json`, `vite.config.ts` and `src/`, so the next push, `aece208`, had nothing at the root to build. `app/` itself builds: at `aece208`, `bun install --frozen-lockfile && bun run build` in `app/` passes from a clean checkout.

The build log itself was not read: this machine is not signed in to Vercel, and `npx vercel inspect` waits for a login. The cause is inferred from the dates above.

The app is hosted on Cloudflare (`app/wrangler.jsonc`), and Sumeet said on 2026-11-02 that Vercel is a leftover. So the fix is to stop Vercel deploying from Git, not to teach it to build `app/`: a static copy on vercel.app would sit outside Cloudflare Access and have no sync Worker. Whether the Vercel project is kept or deleted stays Sumeet's call in `worldcrafter-v61k`.

## Done when

- [ ] A `vercel.json` at the repository root sets `git.deploymentEnabled` to `false`, so Vercel makes no deployment for a push to any branch.
- [ ] `AGENTS.md` or `README.md` says in a line why the file is there, and `worldcrafter-v61k`'s Background says the Vercel deploys are now off and the project still exists.
- [ ] `cd app && bun run check` passes.

## Scope

In: `vercel.json` at the root, one line of docs, the Background of `worldcrafter-v61k`.
Out: the Vercel project's own settings and its existing deployment at vercel.app, which stay as they are; the Cloudflare deploy.
