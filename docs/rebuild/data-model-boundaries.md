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

Every block gets a persistent ID, assigned by `BlockIdPlugin` (`app/src/editor/block-id-plugin.ts`, an extension of Plate's `NodeIdPlugin`). IDs are kept on reload, stay with a block's leading content on split, and are restored exactly by undo and redo. On a merge the upper block keeps its ID. Pasted blocks always get fresh IDs, including after a cut; annotations anchored to a cut block re-attach to the pasted block by matching their quoted text (decided by Sumeet, 2026-10-17). Dragging a block by its handle is a move and keeps its ID. Repeated IDs found on load are repaired, after the stored original is kept as a snapshot. The per-case rules are recorded on worldcrafter-wtj4. Annotations, AI edit operations, entity anchors and "mentions" views all depend on it. This is the prerequisite for everything above, and it should be in place before any AI feature is rebuilt.

## Boundary 5: world context is assembled, not serialized

The text sent to the model is *assembled* by a context builder from:

- the current document's `prose` projection (windowed)
- world-fact cards for entities mentioned nearby (projected from structured data, not from their full documents by default)
- explicit pins

Every assembled request is stored and **viewable and editable before sending**. That's the "extreme AI control" promise, and it's also how we debug prompts.

As built (`app/src/context/`): `builder.ts` assembles the exact `LlmRequest` plus a breakdown for the context viewer, and its header comment documents the window, mention matching and budget priority (fixed text and minimum window, then pins, then the rest of the window, then mentioned cards nearest the cursor first). `cards.ts` renders cards at the scene's story position. A document that isn't a scene in the outline gets start-of-story values, with facts that change later flagged. `requests.ts` stores each request under an ID, with the block its output follows (`after`, where sending puts it by default); an edit is a new revision that points to its parent.

In the workspace (`app/src/app/generation.ts`), the request is shown in a slip in the gloss column, on a leader beside the block its output will follow, rather than in a side panel. The backend profile (base URL, key, model, sampler) is browser configuration, not world data: it is kept per world in localStorage (`app/src/generate/profile.ts`), like the open tabs, and the key never reaches documents, stored requests or provenance. Requests name the profile by a stable identifier, not its label; when a stored request's URL no longer matches the profile (it moved server), regenerating stores and sends a revision retargeted to the profile's own URL and model, so a key only ever goes to its profile's server.

## Passage anchors

Status: design from spike worldcrafter-4vxp (2026-10-30), for the passages work (worldcrafter-jd8b). Nothing here needs Sumeet's decision: anchors stay out of the tree, as Boundary 1 already requires. The one option that would need his decision, anchors as a property on content blocks, is set out under question 1 as the alternative not taken. **Shown** marks an answer checked in a headless Plate experiment with the real document plugins; the experiments and their results are listed in the spike's handoff and its note on worldcrafter-4vxp. **Reasoning** marks answers that were not tested.

The model: every top-level block of a scene document has exactly one anchor, either a beat of that scene or the scene itself. A passage is the blocks anchored to one beat, normally one contiguous run. Blocks inside a container, such as an AI segment's children, are not anchored on their own; they belong to their top-level block.

### 1. Where anchors live: one sidecar record per scene document

The anchors are a map `{ [blockId]: beatId | null }`, where `null` means the scene. They are stored as one annotation record per scene document (kind `passage_anchors`), and only that document's session writes it. While a session is open, the map lives in memory beside the editor, outside Plate's history. Whenever the map has changed, the session writes the record in the same atomic batch as the content, through the batch path that `saveWith` already uses. The two are never saved apart. A scene with no record has every block anchored to the scene, so scenes without beats never write one. The record is created by the first anchor command. The scene structure record (worldcrafter-8tbh) doesn't change.

Costs of the sidecar:

- **Don't prune while undo can bring a block back.** Undo restores a deleted block with its old ID (Boundary 4). If its anchor had been dropped, it is re-resolved by position, and the first block of a passage falls into the previous beat (shown). Prune anchors of blocks that are not in the document only when a session opens, while its history is still empty.
- **New blocks need hooks** (question 2).
- **Snapshot restore.** Restoring a snapshot would bring back blocks whose anchors were pruned, and they would fall back by position (reasoning). Restore isn't built yet.
- **Two records per scene.** Sync would have to merge two records per scene. The map merges key by key (reasoning); that isn't designed here.

**The alternative, which would need Sumeet's decision:** a `beat` property on each top-level content block. It breaks Boundary 1's "annotations never write to the tree", and changes Boundary 2's schema (`schema.ts`, `ContentSchemaPlugin`, `canonicalize`, the markdown export). Today the schema plugin strips it on load, and `validateDocument` rejects it (`property "beat" is not allowed here`) (shown).

What the property gets for free (shown): Slate copies a block's properties when it splits, so Enter anywhere in a block, including at its start, gives both halves the beat. Undo of a delete, split or merge restores the property exactly, with nothing to prune or save separately. Content and anchors are one record, which suits sync.

What it does not get for free (shown):

- A same-document paste carries the source block's beat into another passage.
- A paste into an empty block replaces that block, and its beat with it.
- A paste from another scene carries that scene's beat ID.
- Enter at the end of a heading inserts a paragraph with no beat.
- Accepting an AI segment leaves its blocks with no beat.

So the property needs the same paste, insert and accept handling as the sidecar. It saves only the split hook and the pruning rule. It would also put structure IDs inside the prose. They would dangle once a beat is removed, travel with copies, and have to be stripped on export. The sidecar is recommended because it meets every need without that. Choose the property only if, later, keeping one record per scene (for sync) is worth the boundary change.

### 2. New blocks take the anchor of the block the action started in

An anchor is assigned once, when the block is created, and never re-derived from position afterwards.

- **Enter, or a split.** The new half takes the anchor of the block that was split. With position alone, Enter at the very start of a passage's first block puts the new empty block in the previous passage. Boundary 4 keeps the ID on the content, so the empty block above is the new one. A hook on top-level `split_node` fixes this, and agrees with position for Enter mid-block and at the end (shown).
- **Paste or drop (`insertData`).** Every top-level block that is new after the paste takes the anchor of the block holding the cursor when the paste started. This holds for HTML pasted at the start of a passage's first block, for three paragraphs pasted mid-block, for blocks copied from another passage, and for a paste into an empty block that the paste replaces (shown). Position alone puts a paste at the start of a passage into the previous one (shown). Cut and paste is a paste: the blocks get fresh IDs (Boundary 4), so they take the anchor of the place they land.
- **A block lifted out of a container takes the container's anchor.** Accepting an AI segment (`unwrapSegment`) is a series of `move_node` operations from `[i, k]` to the top level, then `remove_node`. Without a hook on those lifts, the accepted blocks of a segment that opened a passage fell into the previous passage. With the hook they kept the segment's beat (shown).
- **Any other top-level insert takes the anchor of the block before it** (after it, if it is first). Enter at the end of a heading is an insert, not a split (shown), and so is a new AI segment placed after a block.

A merge needs no rule. Backspace at the start of a passage's first block joins its text to the last block of the previous passage, and the upper block keeps its ID and anchor; undo restores both blocks (shown). The joined text now tells the earlier beat, which the writer can see.

### 3. Beat order wins, and moving a block never changes its anchor

The scene structure's `beats` order is the only authority for beat order, and the editor never writes it. Block order is only how the prose is laid out. A block's anchor changes when it is created (question 2) or through an explicit command, never because it moved.

Dragging a block by its handle keeps its ID (Boundary 4), so it keeps its anchor. Dragging one block into another passage leaves both passages split, with runs out of order. Dragging a whole passage above an earlier one leaves every passage contiguous but out of beat order (shown).

A check reports both cases: a passage split into more than one run, and runs out of beat order. It also reports anchors to beats the scene no longer has. Removing a beat (worldcrafter-cly1) leaves anchors alone on purpose. The writer resolves a report in one of two ways:

- **Re-anchor the moved block** with the anchor command.
- **Reorder beats.** The reorder command, even with the current order, gathers each beat's blocks together in beat order and keeps their order within the beat (shown).

When passages are gathered, blocks without a current beat (anchored to the scene, or to a removed beat) stay with the block before them (shown).

Rejected:

- **Position wins** (re-anchor a moved block to its new neighbours). It silently changes what the prose tells, which is the drift this design exists to prevent. It is also ambiguous when a block is dropped between two passages, and a whole-passage drag would need mass re-anchoring.
- **Block order wins** (rewrite `beats` from the prose). A beat with no prose has no position, and editing prose would write structure.

The cost is an inconsistency the writer may notice: a drag keeps the old anchor, but cut and paste takes the new place's anchor. The check makes the dragged case visible instead of hiding it.

### 4. A beat reorder is one undo step, and undo restores both orders

The reorder command runs through the document session in four steps:

1. Compute the target block order: beats in the new order, each beat's blocks in their current document order, and blocks without a current beat riding with the block before them.
2. Apply it as `moveNodes` inside one `withNewBatch`.
3. Save the new `beats` order through the story store.
4. Tag the history batch (below).

This makes one undo step. Block IDs and anchors are unchanged, and undo and redo restore the prose order (shown).

Plate's history covers content only. Undo alone reverts the prose and leaves `beats` in the new order, so the check then reports runs out of order (shown). The session therefore records, on the reorder's history batch, the beat order before and after. Its undo and redo apply that order through the story store.

Store the tag as a property on the batch, not in a map keyed by the batch. Plate's undo pushes a copy (`{ ...batch, selectionAfter }`) onto the redo stack, so the batch object changes identity (shown). A property survives undo, redo and undo again, and the scene's prose and beat order agree at each step (shown). The spike wrapped `undo` and `redo` in the test; doing it inside a plugin's `overrideEditor` is untested. If the scene's beats were added or removed after the reorder, undo restores only the prose, and the check reports the order (reasoning, to keep this simple).

Never move prose outside history (`withoutSaving`) to avoid this. Slate's history doesn't rebase earlier steps over unsaved operations. After typing in the last block and then an unsaved reorder, undo silently deleted the typed length from a different block (shown). Clearing the editor's history on reorder is the safe fallback if the tag proves fragile.

Undo covers a reorder only while the session that made it is open. There is no structure-level undo.

For tests: operations applied in the same tick as the reorder merge into its batch (shown), so start each step with `withNewBatch`.

### 5. A block anchors to exactly one beat

Reasoning only. A passage moves with its beat, and a block can only be in one place. A block anchored to two beats would have no defined position once those beats were reordered apart. Prose that tells two beats anchors to the first. If that keeps happening, the beats are finer than the prose, and the writer can merge them. Staleness (`anchored-prose`) can still consider a beat's neighbours. Allowing several anchors later would need a primary beat for position, which this record shape can grow into.

### Effects on later work

- **Drafting.** Drafting into a beat with no prose inserts after the previous beat's passage, and the drafted segment takes its anchor explicitly (reasoning). This is the same in either storage option.
- **Sync.** This design doesn't decide sync. The sidecar adds a second record per scene that must merge consistently with the content. The tree option would avoid that.

## Open questions

- Anchoring annotations within a block: offsets (fast, but fragile while typing) or quote-plus-context (robust, slower)? We could use offsets live and re-anchor by quote on load.
- Should world facts be editable inline in the document (frontmatter block) or only in a side panel? Either way, storage stays structured.
- Time-indexed facts (Novelcrafter calls them "progressions"): a fact is true *from* a point in the story. That affects the world-fact schema early.
