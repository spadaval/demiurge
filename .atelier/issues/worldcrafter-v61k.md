---
created_at: "2026-11-02T03:56:08.546534576+00:00"
id: "worldcrafter-v61k"
issue_type: "task"
labels: []
priority: "P3"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-cogw"
    type: "implements"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Move the hosted app to demiurge.ink and rename the Worker"
updated_at: "2026-11-02T03:56:08.546534576+00:00"
---

## Goal

Once the domain is bought, move the hosted app to it and retire the `worldcrafter` name on Cloudflare (decision worldcrafter-cogw). Sumeet buys demiurge.ink first; until then nothing here should change.

## Done when

- demiurge.ink is bought and points at the app.
- Sumeet has decided what happens to data at the old address (see Background).
- `app/wrangler.jsonc` and its comment are updated, and any deploy wiring follows the new Worker name.
- The Vercel project behind the GitHub repo has been checked, and kept or retired on purpose.

## Background

- `app/wrangler.jsonc` names the Worker `worldcrafter`, served at https://worldcrafter.sumeet-padavala.workers.dev. Renaming it changes that URL and its deploy wiring, so it waits for the domain.
- **A new address is a new browser origin.** IndexedDB and localStorage belong to an origin, so worlds saved at the workers.dev address won't appear at a new one, whatever the storage keys are called. They would need an export and import, or a deliberate decision that nothing there matters.
- The storage names stay `worldcrafter` regardless (see AGENTS.md).
- The GitHub repo also deploys to Vercel: pushes to it have made Production deployments, the latest on 2026-10-31 at ed1282f. That project may carry the old name too. It's not visible from the repo.
