# Agent Guidelines for Demiurge

## ⚠️ CRITICAL WARNING
**DO NOT RUN THE DEV SERVER!** `bun dev` is a watch command that never terminates. The dev server is always running - starting it will duplicate the server _and_ cause you to wait indefinitely.

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