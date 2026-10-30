# Data Model Boundaries

Status: proposal (2026-10-17). Written while reviving the project. It is about where the boundaries sit, not a finished design.

## The problem

Plate wants a rich JSON tree: nodes, marks and custom elements carrying arbitrary props. LLMs want plain text, and they give back plain text.

The old codebase kept losing data at that seam:

- **Persistence.** It originally stored markdown, then switched to saving the editor model ("Replace markdown with editor model persistence"). The open bugs in the backlog are still "Preserve AI segments during sync" and "Prevent conversion to plain text". Whole-document round trips through markdown dropped whatever markdown couldn't express.
- **Entity candidates.** These were stored as marks inside the content tree. Each detection rerun rewrote the content, so it could clobber links. `docs/NER_OVERHAUL.md` exists because of this.
- **Generation.** "Generate Next" serializes the whole document to markdown and streams markdown back into the tree. Output structure is never constrained, which is why we got the stray `<callout>` tag bug.
- **No stable block IDs.** Nothing in the tree can be addressed reliably, so there's no safe way for an LLM to say "change *this* paragraph".

There is no neat solution, because the tree will always hold more than the text. What we can do is be explicit about **which data lives where** and **which direction conversions are allowed to go**.

## Boundary 1: three kinds of data, three homes

| Kind | Examples | Home | Edited by |
|---|---|---|---|
| **Content** | prose, headings, lists, quotes, internal links, AI-segment *boundaries*, placeholders | Plate tree (canonical) | user, accepted AI output |
| **Annotations** | entity candidates, dismissals, AI provenance (prompt, messages, model, sampler, logprobs), comments, passage anchors (see "Passage anchors") | Sidecar store keyed by `blockId` (+ offset or quote anchor) | the system; the user only through UI actions |
| **World facts** | doc type and template, frontmatter fields, aliases, typed relations, tags | Structured store (not in prose) | user, AI as *proposals* |
| **Discussions** | talk-page topics and messages (see `talk-pages.md`) | Discussion store, scoped to world / document / block | user and AI; results go into the other three only as proposals |
| **Story structure** | drives, questions, scene summaries and beats (see `story-model.md`) | Typed records in `app/src/story/` (decision worldcrafter-ddha) | user, AI as proposals |

Rules:

- **Content is only what the author would expect to see in an export.** If deleting the app would make a piece of data meaningless, it isn't content.
- **Annotations never write to the tree.** They render through Plate's `decorate` (or overlays) and are anchored to stable block IDs. If an anchor goes stale, the annotation is dropped or re-resolved. The prose is never touched. This removes the class of bugs where entity reruns corrupted links.
- **An AI segment is content plus a pointer.** The tree stores only `{ type: "ai_segment", id, status }` and its children. Prompt, source messages and token probabilities live in the sidecar under `id`. Accepting the segment unwraps the node and archives the sidecar record. That keeps the provenance philosophy without bloating the tree.

## Boundary 2: a restricted content schema

Every node type allowed in content must define its **AI projections** (`prose`, `addressable` and `plain+map`, Boundary 3). Those are what keep the LLM boundary manageable, so they are what gate the schema. The allowed types are:

- paragraph, heading (1–3), bulleted and numbered list, blockquote, horizontal rule
- marks: bold, italic, strikethrough, code
- internal link `[label](canonical-name)`, external link
- `ai_segment` and `placeholder` (as directives, e.g. `:::ai{id=…}` … `:::`)

Tables, columns, media, equations, callouts, toggles and the rest are out until there's a concrete need. Each one would also need its AI projections defined. Adding a node type still comes back to the human.

**Exact round-trips go through the typed model, not markdown** (decided by Sumeet, 2026-10-19, worldcrafter-7hjn; reframed 2026-10-29). The TypeScript model is the source of truth, and serialisation belongs to the storage and export adapters. Every adapter preserves the model exactly, including block IDs, so annotations stay anchored. JSON is simply the obvious format for the exact export. Markdown export is readable and one-way: it may drop IDs and anything outside the content tree.

This replaces an earlier goal: making the markdown lossless so it could become a storage format and keep plain files on disk open. That goal was dropped. The app's value is structure that lives outside the tree (annotations, world facts, story time, discussions), and markdown can only hold the prose. Editing such files outside the app would break block-ID anchors, and agents writing them would skip the proposal flow. Ownership comes from the export instead.

### Markdown syntax (as built, `app/src/content/`)

This was built when markdown was still meant to round-trip, so it carries every block ID and has a strict parser. Nothing in the product calls either one yet (only tests do). Under the 2026-10-19 decision it can become the readable one-way export, without the IDs, and the parser is no longer required. The full spec is the comment at the top of `app/src/content/markdown.ts`. In short:

- Every block ends with its ID as a trailing `{#id}` (alone when the block is empty): `Some _text_. {#b_2}`, `--- {#r_1}`.
- Headings use `#`/`##`/`###`, quotes `> `, bullets `- `, numbered items `N. `. Nested items are indented to the parent's content column. An indent that can't be derived from nesting (a skipped level, or a list that starts indented) is written explicitly: `{#b_10 indent=4}`, with values from 1 to 32.
- AI segments and placeholders are container directives: `:::ai{#seg_1 status=ready}` … `:::` and `:::placeholder{#b_9}` … `:::`.
- Inline marks are `**bold**`, `_italic_`, `~~strike~~` and `` `code` ``; links are `[label](canonical-name)` or `[label](https://…)`. A canonical name is lowercase letters, marks and digits from any script joined by single hyphens, in NFC (`old-mill`, `café`); `app/src/world/names.ts` defines it. A line break inside a block is a backslash at the end of the line.
- Text is escaped so it can never be read as syntax. The parser is strict to this format; it is not a general markdown importer.

Plate stores some derived or invisible state that the schema doesn't allow (`listStart` on list items, marks on empty text). The save path runs `canonicalize()` before validating, which removes exactly those and changes nothing else. Numbering restarts, to-do items, and list styles on headings or quotes are rejected, so the editor must be configured not to produce them.

## Boundary 3: conversions are asymmetric

**Tree → text is a *projection*.** It is deterministic, may be lossy, and is specific to its purpose. Each projection returns text **plus a source map** (text range → `blockId` + offset), so results computed on the text can be mapped back.

| Projection | Used for | Notes |
|---|---|---|
| `prose` | continuation, summaries, world context | strips placeholders and annotations; AI segments rendered inline |
| `addressable` | AI edits | every block prefixed with its ID, e.g. `[b_7f3a] text…` |
| `plain+map` | entity matching and extraction, consistency checks | flat text per block with an offset map |
| `export` | reading, sharing outside the app | readable markdown, one-way; exact export and import go through an adapter that preserves the model |

**Text → tree is only allowed at narrow, typed entry points:**

1. **Generated content → inside one AI segment.** We parse only a tiny grammar (paragraphs + emphasis + links). Anything else is flattened to text. The model never gets to write arbitrary structure.
2. **AI edits → block operations.** The model returns operations against block IDs from the `addressable` projection, e.g. `replace(b_7f3a, newText)`, `insertAfter(b_7f3a, text)`, `delete(b_7f3a)`. They are applied as reviewable suggestions. Inside a block we diff old text against new and keep marks and links on the unchanged spans. This is the same shape as Tiptap's AI Toolkit (read/insert/patch tools plus a diff-based review).
3. **Import → the whole document or world**, once, explicitly, from the exact export.

**We never re-parse a whole document from markdown during normal editing.**

## Boundary 4: stable block IDs are mandatory

Every block gets a persistent ID, assigned by `BlockIdPlugin` (`app/src/editor/block-id-plugin.ts`, an extension of Plate's `NodeIdPlugin`). IDs are kept on reload, stay with a block's leading content on split, and are restored exactly by undo and redo. On a merge the upper block keeps its ID. Pasted blocks always get fresh IDs, including after a cut; annotations anchored to a cut block re-attach to the pasted block by matching their quoted text (decided by Sumeet, 2026-10-17). Passage anchors are the one exception: they don't re-attach by quote, because an anchor says which beat the prose tells, not what text it marks, so prose moved into another beat's passage takes the beat where it lands (decided by Sumeet, 2026-10-30; see "Passage anchors"). Dragging a block by its handle would be a move and keep its ID, but no such handle exists yet: the workspace's only drag is slate-react's text drag, a delete plus `insertData`, which is a paste. Repeated IDs found on load are repaired, after the stored original is kept as a snapshot. The per-case rules are recorded on worldcrafter-wtj4. Annotations, AI edit operations, entity anchors and "mentions" views all depend on it. This is the prerequisite for everything above, and it should be in place before any AI feature is rebuilt.

## Boundary 5: world context is assembled, not serialized

The text sent to the model is *assembled* by a context builder from:

- the current document's `prose` projection (windowed)
- world-fact cards for entities mentioned nearby (projected from structured data, not from their full documents by default)
- explicit pins

Every assembled request is stored and **viewable and editable before sending**. That's the "extreme AI control" promise, and it's also how we debug prompts.

As built (`app/src/context/`): `builder.ts` assembles the exact `LlmRequest` plus a breakdown for the context viewer, and its header comment documents the window, mention matching and budget priority (fixed text and minimum window, then pins, then the rest of the window, then mentioned cards nearest the cursor first). `cards.ts` renders cards at the scene's story position. A document that isn't a scene in the outline gets start-of-story values, with facts that change later flagged. `requests.ts` stores each request under an ID, with the block its output follows (`after`, where sending puts it by default); an edit is a new revision that points to its parent.

In the workspace (`app/src/app/generation.ts`), the request is shown in a slip in the gloss column, on a leader beside the block its output will follow, rather than in a side panel. The backend profile (base URL, key, model, sampler) is browser configuration, not world data: it is kept per world in localStorage (`app/src/generate/profile.ts`), like the open tabs, and the key never reaches documents, stored requests or provenance. Requests name the profile by a stable identifier, not its label; when a stored request's URL no longer matches the profile (it moved server), regenerating stores and sends a revision retargeted to the profile's own URL and model, so a key only ever goes to its profile's server.

## Passage anchors

Status: design from spike worldcrafter-4vxp (2026-10-30), for the passages work (worldcrafter-jd8b). Anchors stay out of the tree, as Boundary 1 already requires, so that choice needs no decision. Anchors as a property on content blocks, which would need one, is set out under question 1 as the alternative not taken. Sumeet decided what happens to moved prose (2026-10-30, question 3). **Shown** marks an answer checked in a headless Plate experiment with the real document plugins; the experiments and their results are in the notes on worldcrafter-4vxp. **Reasoning** marks answers that were not tested.

The model: every top-level block of a scene document has exactly one anchor, either a beat of that scene or the scene itself. A passage is the blocks anchored to one beat. Blocks inside a container, such as an AI segment's children, are not anchored on their own; they belong to their top-level block.

### 1. Where anchors live: one sidecar record per scene document

The anchors are a map `{ [blockId]: beatId | null }`, where `null` means the scene. They are stored as one annotation record per scene document, with kind `passage_anchors` and ID `passage-anchors:<documentId>`. The colon can't appear in a block ID (`BLOCK_ID_CHARS`), so this can't collide with a block or segment record. Readers of `listForDocument` already filter by kind. Only that document's session writes the record. While a session is open, the map lives in memory beside the editor, outside Plate's history. Whenever the map has changed, the session writes the record in the same atomic batch as the content, through the batch path that `saveWith` already uses. The two are never saved apart.

A scene with no record has every block anchored to the scene, and writes nothing, so scenes without beats never get a record. The first anchor command creates it, and records every current top-level block, `null` unless anchored. After that, "not in the map" always means a new block (question 2). The scene structure record (worldcrafter-8tbh) doesn't change.

Costs of the sidecar:

- **Don't prune while undo can bring a block back.** Undo restores a deleted block with its old ID (Boundary 4). If its anchor had been dropped, it is treated as new, and the first block of a passage falls into the previous beat (shown). Prune anchors of blocks that are not in the document only when a session opens, while its history is still empty.
- **New blocks need hooks** (question 2).
- **Snapshot restore.** Restoring a snapshot would bring back blocks whose anchors were pruned, and they would be treated as new (reasoning). Restore isn't built yet; the note is on worldcrafter-jd8b.
- **Two records per scene.** Sync would have to merge two records per scene. The map merges key by key (reasoning); that isn't designed here.

**The alternative, which would need Sumeet's decision:** a `beat` property on each top-level content block. It breaks Boundary 1's "annotations never write to the tree", and changes Boundary 2's schema (`schema.ts`, `ContentSchemaPlugin`, `canonicalize`, the markdown export). Today the schema plugin strips it on load, and `validateDocument` rejects it (`property "beat" is not allowed here`) (shown).

What the property gets for free (shown): Slate copies a block's properties when it splits, so Enter inside a paragraph, including at its start, gives both halves the beat. Undo of a delete, split or merge restores the property exactly, with nothing to prune or save separately. Content and anchors are one record, which suits sync.

What it does not get for free (shown):

- A same-document paste carries the source block's beat into another passage.
- A paste into an empty block replaces that block, and its beat with it.
- A paste from another scene carries that scene's beat ID.
- Enter at the end of a heading splits it, and Plate then clears the new paragraph's extra properties, so the beat is lost.
- Accepting an AI segment leaves its blocks with no beat. Regenerating one would give the new segment none, since `generatingSegment` sets no such property (from the code, not run).

So the property needs the same paste, replace and accept handling as the sidecar. It saves only the split hook and the pruning rule. It would also put structure IDs inside the prose. They would dangle once a beat is removed, travel with copies, and have to be stripped on export. The sidecar is recommended because it meets every need without that. Choose the property only if, later, keeping one record per scene (for sync) is worth the boundary change.

### 2. A new block takes the anchor of the block the action started in

These rules assign an anchor only to a top-level block whose ID is not in the map. A block already in the map keeps its anchor, whatever operation brought it back. Undo and redo replay `split_node` and `insert_node` with old IDs. Without this check, undoing a Backspace across two passages or the delete of a passage's first block re-anchors it to the previous beat, and redoing a paste at the start of a passage does the same (shown, as negative controls). A scene with no record assigns nothing.

- **Enter, or a split.** The new half takes the anchor of the block that was split. After `apply`, the hook on a top-level `split_node` looks at both halves and gives the one not in the map the other's anchor. Don't look for `BlockIdPlugin`'s extra `set_node`: it goes to the inner `apply`, so later plugins never see it (note on worldcrafter-wtj4). With position alone, Enter at the very start of a passage's first block puts the new empty block in the previous passage, because Boundary 4 keeps the ID on the content (shown). Enter at the end of a heading is a split followed by a `set_node` to `p`, so this rule covers it (shown).
- **Paste or drop (`insertData`).** Every top-level block that is new after the paste takes the anchor of the block at the start of the selection, read before the paste runs. This holds for forward and backward selections, for a selection across two passages, for HTML pasted at the start of a passage's first block, for blocks copied from another passage, and for a paste into an empty block that the paste replaces (shown). The other hooks stand down during `insertData`, or they would assign first. Cut and paste, and slate-react's text drag, are this case (question 3).
- **A replacement takes the anchor of what it replaces.** An `insert_node` at the index of the `remove_node` just before it takes the removed block's anchor. Regenerating a segment is exactly this (`startGeneration` with `replace`). Without the rule, a regenerated segment that opened b2 comes back in b1; with it, it stays in b2, and undo and redo keep both right (shown).
- **A block lifted out of a container takes the container's anchor.** Accepting an AI segment (`unwrapSegment`) is a series of `move_node` operations from `[i, k]` to the top level, then `remove_node`. Without this hook, the accepted blocks of a segment that opened a passage fell into the previous one; with it they kept the segment's beat (shown).
- **Any other top-level insert takes the anchor of the block before it** (after it, if it is first). A new AI segment placed after a block is this case (shown).

A merge needs no rule. Backspace at the start of a passage's first block joins its text to the last block of the previous passage, and the upper block keeps its ID and anchor; undo restores both blocks (shown). Deleting an expanded selection across two passages likewise pulls the tail of the later passage into the earlier block. Both are accepted: the joined text now tells the earlier beat, and the writer can see that.

### 3. Beat order wins, and moved prose takes the beat where it lands

The scene structure's `beats` order is the only authority for beat order, and the editor never writes it. Block order is only how the prose is laid out.

**Prose moved into another beat's passage takes the beat where it lands** (decided by Sumeet, 2026-10-30). This applies to cut and paste, and to any future block drag handle. It is an explicit exception to Boundary 4's rule that annotations on a cut block re-attach by quote, because an anchor says which beat the prose tells, not what text it marks.

The workspace has no block drag and drop today (`ai-segment.ts`, the `GeneratingSegmentPlugin` notes). A drag is slate-react's text drag: the selection moves to the drop point, the dragged range is deleted, and the data goes through `insertData`. So it is a paste, and question 2's paste rule gives moved prose the beat where it lands (shown). A whole block dragged this way leaves its emptied block behind in the old passage, as text drag does today (shown). A future handle would move a block and keep its ID, so it must re-anchor the block in the same step (reasoning). The reorder command's moves leave anchors alone, so there is no hook on top-level moves.

Ordinary editing therefore can't put a scene's anchored blocks out of beat order. 500 seeded random runs of 60 steps each (Enter, typing, Backspace, range delete, HTML and fragment paste, text drag, block removal, generating, regenerating, accepting, undo, redo) ended with no violation and no block missing from the map (shown). Treating pasted blocks as anchored to the wrong beat made the same run fail, so it can detect a violation.

Three paths can still reach it:

- **The anchor command.** Anchoring a block to a later beat while later blocks stay on an earlier one (shown).
- **Undo past an anchor command.** Anchors are outside history, so undo can pair older content with newer anchors. Delete, anchor, undo and reorder, anchor, undo both do it (shown).
- **A reorder whose two writes end up apart** (question 4).

One check covers them: in document order, ignoring blocks with no current beat, the beats of anchored blocks must follow `beats`. A passage split into two runs fails it too, so it needs no report of its own. The check also reports anchors to beats the scene no longer has, because removing a beat (worldcrafter-cly1) leaves anchors alone on purpose. The writer repairs an order problem by re-anchoring, or by running the reorder command with the current order, which puts each beat's blocks together (shown).

Rejected:

- **Block order wins** (rewrite `beats` from the prose). A beat with no prose has no position, and editing prose would write structure.
- **Refusing an anchor command that breaks the order.** It would add an error and still leave the undo and reorder paths, so the check and the repair would stay.

### 4. A beat reorder is one undo step, and undo restores both orders

The reorder command runs through the document session, in this order:

1. In a read-only session, fail with a typed error and change nothing. The check is needed because a read-only editor still applies `moveNodes` (shown).
2. Check that the order is a permutation of the scene's current beats.
3. Save the new `beats` order. If that fails, return the error with the prose unchanged and no undo step.
4. Compute the target block order from the live document: blocks with no current beat first if nothing precedes them, then the beats in the new order, each with its blocks in current document order, with blocks without a current beat riding with the block before them (shown). Leading blocks stay at the top of the scene (shown).
5. Apply it as `moveNodes` inside one `withNewBatch`. Block IDs and anchors are unchanged (shown).
6. If anything moved, tag the new history batch and call `setSplittingOnce(true)`, so the next edit is its own step even in the same tick (shown), as `startGeneration` does. If nothing moved there is no new batch, and `undos.at(-1)` is the writer's previous step, so it must not be tagged (shown). That reorder has no undo step; the writer reorders back.
7. Flush the document. A failed save retries as it does today.

The two writes are never atomic. If the tab closes before the prose saves, or the content is refused as invalid, the reloaded scene has the new `beats` and the old prose. The check reports it, and running the reorder command again repairs it (reasoning; the repair itself is shown).

Plate's history covers content only. Undo alone reverts the prose and leaves `beats` in the new order (shown). So the tag records the beat order before and after, and a plugin's `overrideEditor` wraps `undo` and `redo` to report the tagged order, which the session saves through the story store (shown: undo, redo, undo gave before, after, before, with the prose restored, alongside `GeneratingSegmentPlugin`'s own overrides). Store the tag as a property on the batch, not in a map keyed by the batch. Plate's undo pushes a copy (`{ ...batch, selectionAfter }`) onto the redo stack, so the batch changes identity (shown). If the scene's beats were added or removed after the reorder, or the save fails, only the prose is restored, and the check reports the order (reasoning).

Never move prose outside history (`withoutSaving`) to avoid this. Slate's history doesn't rebase earlier steps over unsaved operations. After typing in the last block and then an unsaved reorder, undo silently deleted the typed length from a different block (shown). Clearing the editor's history on reorder is the safe fallback if the tag proves fragile.

A reorder is safe during a live generation: rendering finds the segment by ID, so text keeps streaming into the moved segment, and undoing the reorder mid-stream and then the generation leaves the document as it was (shown).

Undo covers a reorder only while the session that made it is open. There is no structure-level undo.

### 5. A block anchors to exactly one beat

Reasoning only. A passage moves with its beat, and a block can only be in one place. A block anchored to two beats would have no defined position once those beats were reordered apart. Prose that tells two beats anchors to the first. If that keeps happening, the beats are finer than the prose, and the writer can merge them. Staleness (`anchored-prose`) can still consider a beat's neighbours. Allowing several anchors later would need a primary beat for position, which this record shape can grow into.

### Commands and wiring

`DocumentSession` gets `anchorBlocks(blockIds, beatId | null)` and `reorderBeats(order)`. The workspace wraps both with a lease, as its other commands do, so they work on a scene that isn't open in a tab. In a read-only session both fail with a typed error and change nothing.

Editor undo doesn't revert an anchor command. The command makes no content operation, so there is no history batch to tag, and Ctrl-Z after one undoes the writer's previous text edit. The writer reverts an anchor by re-anchoring, and the UI must show the anchor so that this is visible.

The session reaches beats through a narrow port in `SessionOptions`, which `workspace.ts` builds: load a scene's beat IDs (`null` if the document isn't a scene in the outline), and save a beat order. The save is `saveBeatOrder` in `app/src/story/beat-order.ts`. It is deliberately not in the `StoryCommand` union, runs on the story store's command queue, and is imported only by `workspace.ts`. A biome `noRestrictedImports` rule with an override for that file enforces this, in the same way `src/storage` is exempted from `noRestrictedGlobals`; the rule catches both alias and relative imports (shown). So the session's `reorderBeats` remains the only way to reorder beats.

### Effects on later work

- **Drafting.** Drafting into a beat with no prose inserts after the previous beat's passage, and the drafted segment takes its anchor explicitly (reasoning). This is the same in either storage option.
- **Sync.** This design doesn't decide sync. The sidecar adds a second record per scene that must merge consistently with the content. The tree option would avoid that.

## Open questions

- Anchoring annotations within a block: offsets (fast, but fragile while typing) or quote-plus-context (robust, slower)? We could use offsets live and re-anchor by quote on load.
- Should world facts be editable inline in the document (frontmatter block) or only in a side panel? Either way, storage stays structured.
- Time-indexed facts (Novelcrafter calls them "progressions"): a fact is true *from* a point in the story. That affects the world-fact schema early.
