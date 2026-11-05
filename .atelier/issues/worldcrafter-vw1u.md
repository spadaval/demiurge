---
created_at: "2026-11-05T14:15:00.742499920+00:00"
id: "worldcrafter-vw1u"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lxmj"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T15:09:56.940249919+00:00"
status: "done"
title: "Trace noise, round three (Round 3 reading 6)"
updated_at: "2026-11-05T15:09:56.940249919+00:00"
---

## Goal

Inline trace suspects that are mostly real.

## Done when

- The batch exclusion also covers the writing scene's prose file; records created in the same batch are left out; a prose duration is matched only against spans that include the changed event; word-share-only suspects need a higher bar.
- Re-run on Round 3's 8 trace blocks shows what remains; a count insert that makes another event's note off (the poll-morning 70 vs 69 case) is caught if cheap, or recorded as not caught; tests; bun run check passes.

## Close Reason

Implementer report. Outcome: inline traces (an edit's 'What may still state the old ...') are mostly real on Round 3. Changes: (1) the batch list (temp file per shell command line) now holds the scenes being written and the records the batch added; the inline trace leaves out the writing scene's prose as well as its record, and any record an earlier edit in the same command line added. (2) Durations: after a change, a span in prose or in a nearby record counts only when it matched the time between the changed event and another before the move and no longer does; spans the move left true, and spans after an edit that didn't move the event, are no longer evidence (trace <ref> on its own is unchanged and still lists 'may state when this happened'). (3) Shared words: number words no longer count as shared stems; after a change, shared words are evidence in a text only when they number at least four (or all the uncommon words the change took away, if fewer) and at least a quarter of them, and never for an event that only moved (its year and spans are looked for instead). Weaker shares still score and trace lists them. (4) A count change whose old value still stands at another event traces nothing. (5) A count value added between two others checks the next value's note for a number stating the old change ('Seventy' for 400 to 330) and prints it with the new difference (69): cheap, and it catches the poll-morning case. --help updated. Proof: Round 3 replay of every Bash and Write call of all five phases, CLI called directly (scratch, story.json identical between the two runs): HEAD 837a737 8 blocks, 24 suspects; now 3 blocks, 5 suspects: the poll-morning note (real: 'Seventy have left' is 69 after the 399 insert), the vote-day note stating 18 after 172 was inserted at poll-morning (stale until the writer rewrote it later in the same batch), and count:seats on 'set-count seats recruitment none' listing three '1400' texts (noise: 1400 is set again later in that batch). Round 2 replay (r2/count-traces.sh): 1 trace, the stale watchers note ('five hundred' may state 540), still found. Round 1 outline replay: HEAD 2 traces (the two re-placed events, noise), now 0; the real 'remove-drive-turn novelty' trace (ledger-ruin, 'mothlight, sheepish') was already absent at HEAD, lost to vg6e's common-stem rule ('mothlight' is the holder's name, in 25 texts), not to this change. Tests: trace.test.ts (a moved event's shared words aren't text evidence; a span the move leaves true isn't; the quarter rule), story.test.ts (writing prose and a batch-added record left out, a later command line lists the prose; span made untrue listed, left true not; a value still standing traces nothing; the inserted-value note), and two older tests updated for the new rules (a rename no longer lists nearby spans; a prose file counts as being written until the story is next saved). bun run check 1142 pass (one earlier run had 1 failure that didn't recur in three reruns, likely flake worldcrafter-08kf). Open: independent review outstanding; the mid-batch removal case (scene-4) would need traces deferred to the batch's end; Round 1's novelty trace stays lost.
