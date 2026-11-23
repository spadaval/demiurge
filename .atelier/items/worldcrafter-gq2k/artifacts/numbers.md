# Numbers, garden run worldcrafter-gq2k

Window: 2026-11-11T15:20:16Z (the first line `atelier log` prints; this is demiurge's first run) to 2026-11-11T18:21:49Z (`date -u` taken once).

Items whose `merge` line falls in the window:

```
atelier log | awk -v s=2026-11-11T15:20:16Z -v e=2026-11-11T18:21:49Z '$4 == "merge" && $1 > s && $1 <= e {print $3}'
worldcrafter-s9lp
```

## worldcrafter-s9lp

`atelier log worldcrafter-s9lp`, all of it:

```
2026-11-11T15:43:39Z c9e3bba worldcrafter-s9lp ready - draft -> ready; by sumeet
2026-11-11T15:44:12Z 2fb4eb9 worldcrafter-s9lp start thread:delegated-task:command%3Amcp%3A2074a88e-920b-49f9-bd17-caf5903cc60f%3Adelegate-task%3A484ff27f-40b9-413e-b59f-ae79d6a20f57 ready -> building
2026-11-11T15:44:59Z 6acfc09 worldcrafter-s9lp submit thread:delegated-task:command%3Amcp%3A2074a88e-920b-49f9-bd17-caf5903cc60f%3Adelegate-task%3A484ff27f-40b9-413e-b59f-ae79d6a20f57 building -> in_review
2026-11-11T15:59:52Z a839c30 worldcrafter-s9lp review thread:delegated-task:command%3Amcp%3A6cf351dd-4bce-441c-ab4b-721d1b876885%3Adelegate-task%3A47bf0447-fe22-4fd4-8457-8640cc9f8af6 1-vfvz
2026-11-11T15:59:52Z a839c30 worldcrafter-s9lp verdict thread:delegated-task:command%3Amcp%3A6cf351dd-4bce-441c-ab4b-721d1b876885%3Adelegate-task%3A47bf0447-fe22-4fd4-8457-8640cc9f8af6 1-vfvz approve; in_review -> approved
2026-11-11T16:00:03Z 13b07f3 worldcrafter-s9lp merge thread:delegated-task:command%3Amcp%3A2074a88e-920b-49f9-bd17-caf5903cc60f%3Adelegate-task%3A484ff27f-40b9-413e-b59f-ae79d6a20f57 approved -> done
```

| Status | From | To | Seconds | Minutes |
| --- | --- | --- | --- | --- |
| ready | 15:43:39 | 15:44:12 | 33 | 1 |
| building | 15:44:12 | 15:44:59 | 47 | 1 |
| in_review | 15:44:59 | 15:59:52 | 893 | 15 |
| changes_requested | never reached | | 0 | 0 |
| approved | 15:59:52 | 16:00:03 | 11 | 0 |

Rounds: 1 (`submit` lines). Take-overs: 0. Escalations: 0. Skips: 0 (no `skip` part on any line).

With one item, each median is this item's value, and it is the worst beside each measure.

Review: round 1, `reviews/1-vfvz.md`, approve with no findings. Fix-now findings in the window: 0.

## Open work, at the end of the window

```
atelier list | grep -oE '^ +[^ ]+ \([a-z_]+' | awk '{print $2}' | sort | uniq -c
      1 (building
     17 (draft
      2 (ready
```

The one building item is this run. The two ready items are labelled `needs-human` and wait on a decision.

```
atelier list --blocked | grep -oE '^ +[^ ]+ \([a-z_]+' | awk '{print $2}' | sort | uniq -c
      3 (draft
```

Blocked: worldcrafter-8agg, worldcrafter-lhh3 and worldcrafter-vw7x, each on a draft.

```
atelier list --deferred
No deferred finding of a done item is left to settle.
```

## Carried measures

No earlier run, so each is the November 2026 baseline's demiurge column (`docs/architecture/quality/scorecard-baseline-2026-11.md` in atelier), measured 2026-11-10: defects after merge 0 of 86; interventions per mission 0, 0 and 17; process share 7.6% of 3,021 shell commands and 12.5% of token cost; confusion 16.39 per 100 of 671 `atelier` calls; tokens per merged item median 7.9 USD (mean 11.79); gate precision 1 of 6; review yield 8 of 20; calls before first edit median 10 (49 threads); rework 3.4% of 38,189 lines; where caught about 29 in review, no CI, 0 after merge; non-test lines 73,155 TypeScript.

## Navigation sample

One implementer thread, worldcrafter-s9lp's, read up to its first edit: 4 tool calls before it (`atelier start`, a read of its item record, two `git log` and `git grep` searches). It read one file, `.atelier/items/worldcrafter-s9lp/item.md`; the item named the search that found the files to edit.

## In review

Of s9lp's 893 seconds in review, the first run of its implementer ended at 15:45:11 without starting a reviewer, and the reviewer started at about 15:58:52, after its lead told it to. The review itself took about one minute. One `delegate_task` call failed before that, refused for naming a project.

## Where the last month's work landed

```
git log --since=30.days --name-only --format= -- . ':!.atelier' | cut -d/ -f1 | sort | uniq -c | sort -rn | head
    756 app
    196 docs
     29 .impeccable
     25 .agents
     17 PRODUCT.md
     11 README.md
      9 AGENTS.md
      4 .gitignore
      3 src
      3 package.json
```

1,068 file changes in all.
