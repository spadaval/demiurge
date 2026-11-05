# Agent Guidelines for Demiurge

## ⚠️ CRITICAL WARNING
**DO NOT RUN THE DEV SERVER!** `bun dev` is a watch command that never terminates. The dev server is always running - starting it will duplicate the server _and_ cause you to wait indefinitely.

## Work tracking
This repository uses [Atelier](https://github.com/spadaval/atelier) for missions, issues, evidence and review (records live in `.atelier/`, base branch `master`).
- Orient with `atelier status`; find work with `atelier work ready`; run `atelier land` before handoff.
- Start work with `atelier start <id>` and integrate with `atelier merge <id>`. Only tracker records and mission strategies may be committed directly to `master`.
- The rebuilt app lives in `app/` (its own package: run `bun install` and `bun run check` there). The root `src/` is the old app, kept for reference until it is retired.
- Mission strategies live in `docs/strategies/`. The current mission is World first (`docs/strategies/world-demo.md`, mission worldcrafter-gwx3): a demonstration of the Demiurge-assisted process, in which a writer agent uses the story CLI (`app/scripts/story.ts`) and its skill (`.agents/skills/story-sketch/`) to build a rich world and outline, then writes scenes that a judging panel scores as prose. The model is the author's bible and is never shown to readers. Sumeet's decision worldcrafter-jeue opened it, dropped head-to-head comparisons and superseded Notes first (`docs/strategies/notes-first.md`). Before that, Structure first (`docs/strategies/structure-first.md`) ended after two blind comparisons preferred plain notes (decision worldcrafter-03rp); jeue puts its model, CLI and skill back in use. Design proposals for the app rebuild (`docs/strategies/rebuild.md`) are in `docs/rebuild/`; `docs/rebuild/story-model.md` describes the Structure first design and no longer sets direction. Where the rebuild docs conflict with the rest of this file, they describe the app's target and this file describes the old code.

## Naming
The product is Demiurge (decision `worldcrafter-cogw`), and `worldcrafter` stays in some places on purpose. Don't rename these as cleanup:
- Browser storage: the `worldcrafter-*` IndexedDB names and the `worldcrafter:*` localStorage and lock keys. Renaming them would strand existing data, and a lock under a new name wouldn't exclude tabs still running the old build.
- Atelier: the `worldcrafter-` issue IDs and past records.
- The Cloudflare Worker in `app/wrangler.jsonc`, until the domain is settled (`worldcrafter-v61k`).

## Commands
Use bun for all commands.
- **Build**: `bun run build` | **Start**: `bun run start`
- **Format**: `bun run format` | - **Lint**: `bun run lint --fix` (run after all changes)

## Architecture
- **State**: `@legendapp/state` for persistent/shared state, `useState` only for ephemeral UI state (reference `docs/legend-state.md`)
- **Error Handling**: `neverthrow` for functional errors, try/catch for async operations (reference `docs/neverthrow.md`)
- **Tech Stack**: Tanstack Start (React + Vite), tailwindcss (styling), trpc (API replacement)
- **Editor**: `platejs` - highly configurable and flexible react-based editor. Based on the `slate` editor. See `/src/components/editor` and `/src/docs/editor`.

## File Structure
Top-level has app/config/docs files (package.json, vite.config.ts, tailwind.config.mjs, README.md, AGENTS.md) plus generated/output dirs like dist/, .output/.
Core source code is under src/, organized by feature/type: routes/ (pages), components/ (UI), lib/ (logic), utils/ (helpers), plus hooks/, styles/, and llamacpp-client/.
Static assets live in public/, and project docs/reference material are in docs/

## Rules
Avoid using `any` type. Use `unknown` type instead. 
Using comments to suppress type errors is a last resort. Always try to fix the type error instead. If necessary, use `unknown` type and add a comment explaining why the type is unknown.