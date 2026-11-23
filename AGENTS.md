# Agent Guidelines for Demiurge

## ⚠️ CRITICAL WARNING
**Don't start a dev server or any other watch command** (`vite`, `bun --watch`). It never exits, so you would wait on it indefinitely. The app has no dev script on purpose.

## Work Tracking

Work is tracked with Atelier, in `.atelier/`: missions in
`missions/<id>/mission.md`, items in `items/<id>/item.md` with their
reviews beside them, and the rules in `config.toml`.

- Run `atelier status` first; Claude Code and Codex run it at session start
  through `.claude/settings.json` and `.codex/hooks.json`. It says what you
  hold and the next command, and `atelier <command> --help` says what each
  does. Agent Factory, loaded as `/agent-factory`, says how to decide.
- An item, in order: `atelier start <id>`, implement, tick every Done when
  line and write the `## Report`, `atelier submit`. A reviewer, in a thread
  that did not write the change, runs `atelier review <id>` and `atelier
  verdict`. Once approved, the implementer runs `atelier merge`, which
  marks the item done on `master`.
- Planning happens on `master` with `atelier new`, `set` and `ready`;
  `ready`, `drop`, `close` and `lead` make their own commit. A mission is
  read with `atelier show <mission>`.
- This repository's config names no forge, so nothing pushes for you.
  After `atelier merge`, or after planning on `master`, push it with
  `git push origin master`. The pre-push hook checks every commit the push
  brings to `master`: code arrives only through an Atelier merge. A rule
  can be passed on purpose with `ATELIER_SKIP="<reason>"` on the command;
  use it only when you mean to.
- `atelier setup` installs the Git hooks in a new clone.

## Naming
The product is Demiurge (decision `worldcrafter-cogw`), and `worldcrafter` stays in some places on purpose. Don't rename these as cleanup:
- Browser storage: the `worldcrafter-*` IndexedDB names and the `worldcrafter:*` localStorage and lock keys. Renaming them would strand existing data, and a lock under a new name wouldn't exclude tabs still running the old build.
- Atelier: the `worldcrafter-` issue IDs and past records.
- The Cloudflare Worker in `app/wrangler.jsonc`, until the domain is settled (`worldcrafter-v61k`).

## Commands
The application is `app/`, and its commands run from there with bun, after a `bun install` in `app/`. The repository root has no `package.json`.
- `bun run check` runs the type check (`tsc`), lint (Biome) and tests. Run it before you submit.
- `bun test` runs the tests alone. `bun run format` formats, and `bun run lint` lints.
- `bun run build` type-checks and writes the static web app to `app/dist/` for any static server.
- `bun scripts/story.ts --help` runs the story CLI.

## Architecture
- **Stack**: React 19 and TypeScript, built with Vite, routed with TanStack Router (`app/src/app/router.tsx`). Styling is plain CSS in `app/src/app/styles.css`; the design system is in `DESIGN.md`.
- **Editor**: Plate (`platejs`, on Slate), configured in `app/src/editor/`. The content schema and its Markdown projection are in `app/src/content/`.
- **Storage**: everything persistent goes through the `StorageAdapter` in `app/src/storage/` (IndexedDB in the browser, in-memory in tests). Biome refuses `indexedDB` anywhere else. Small per-world UI state uses a key-value store passed in (localStorage in the browser), as `app/src/workspace/tabs.ts` does.
- **Errors**: `neverthrow` `Result`s for expected failures; a thrown error means a bug.
- **Tests**: `bun test`, with happy-dom and fake-indexeddb for browser APIs (`app/src/test/`). Tests sit next to the code as `*.test.ts(x)`.

## File Structure
- `app/`: the application. `app/src/` is organised by area: `app/` (shell, routes, pages), `editor/`, `content/`, `storage/`, `world/` (entries, kinds, names, facts), `story/`, `time/`, `outline/`, `layers/`, `context/` and `generate/` (model context and generation), `agent/` (the story agent runner, `docs/rebuild/story-agent.md`), `talk/` (talk pages and the World inbox, `docs/rebuild/talk-pages.md`), `llm/`, `workspace/`, `sync/` (the sync client) and `worker/` (the Cloudflare Worker: sync API and static assets, `docs/rebuild/sync.md`). `app/scripts/` holds the story CLI and measurement scripts.
- `docs/`: `rebuild/` holds the design of the current app, `rounds/`, `strategies/` and `verdicts/` hold the story-model trial rounds and their results, and `philosophy.md` the product's principles.
- `PRODUCT.md`, `DESIGN.md` and `README.md` describe the product and its design. `.atelier/` holds work tracking and `.impeccable/` design-system metadata.

## Rules
Avoid using `any` type. Use `unknown` type instead. 
Using comments to suppress type errors is a last resort. Always try to fix the type error instead. If necessary, use `unknown` type and add a comment explaining why the type is unknown.