---
schema: atelier.item
schema_version: 3
id: worldcrafter-km59
title: Atelier pre-commit hook refuses a catch-up merge of master into an item branch
status: open
mission: null
labels: []
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T05:25:10.053530668Z
---

## Goal

Merging `master` into an item's branch to catch up fails at Atelier's pre-commit hook. The hook reads the item records that arrive unchanged from `master` as status changes made on the branch, and refuses the merge commit. It happened twice on 2026-11-23: on `worldcrafter-wknl` (merge `c9034b7`) and on `worldcrafter-xodp`, where 15 item statuses came in from `master`. Both implementers went past it with `ATELIER_SKIP`, so every catch-up merge in a busy repository now needs a deliberate bypass, which teaches agents to bypass the hook.

## Done when

- [ ] The cause is confirmed with a reproduction: an item branch, a `master` that has since merged other items, and `git merge master` refused by the pre-commit hook.
- [ ] The bug is fixed in Atelier or reported to it with the reproduction, so a merge commit whose record changes all come from `master` commits without `ATELIER_SKIP`.

## Scope

The hook lives in Atelier, not in this repository. If the fix belongs upstream, this item ends at a filed upstream report and a note here of where it went.
