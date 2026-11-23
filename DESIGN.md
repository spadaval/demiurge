---
name: Demiurge
description: Night Edition. The manuscript is the page and the world is its apparatus.
colors:
  ground: "#14120f"
  rail: "#110f0d"
  raised: "#221e18"
  ink: "#e6dfcf"
  ink-2: "#b3aa98"
  ink-3: "#9a917f"
  rule: "#2f2a23"
  rule-strong: "#4a4237"
  ai: "#e34b2f"
  time: "#8da2f0"
  time-band: "rgb(141 162 240 / 0.28)"
  subtext: "#e8b923"
  say-0: "#7cc4b5"
  say-1: "#e7a59b"
  say-2: "#c4a8e0"
  say-3: "#b4c98c"
  say-4: "#d9a67e"
typography:
  display:
    fontFamily: "Old Standard TT, Iowan Old Style, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.25
  headline:
    fontFamily: "Old Standard TT, Iowan Old Style, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Old Standard TT, Iowan Old Style, Georgia, serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Old Standard TT, Iowan Old Style, Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.62
  stamp:
    fontFamily: "Old Standard TT, Iowan Old Style, Georgia, serif"
    fontSize: "14px"
    fontWeight: 400
    letterSpacing: "0.06em"
  apparatus:
    fontFamily: "Source Sans 3, Source Sans Pro, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  gloss:
    fontFamily: "Source Sans 3, Source Sans Pro, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Source Sans 3, Source Sans Pro, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.1em"
  key:
    fontFamily: "Source Sans 3, Source Sans Pro, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
  sheet-title:
    fontFamily: "Source Sans 3, Source Sans Pro, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.25
  talk:
    fontFamily: "Source Sans 3, Source Sans Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  excerpt:
    fontFamily: "Old Standard TT, Iowan Old Style, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "5px"
  small: "4px"
spacing:
  rail-width: "300px"
  header-height: "56px"
  margin-width: "96px"
  prose-width: "620px"
  gutter-width: "40px"
  gloss-width: "340px"
  rail-inset: "20px"
  paragraph: "20px"
  note-gap: "14px"
  ledger-row: "32px" # minimum row height; rows with secondary lines grow
  turn-gap: "18px"
components:
  button:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
    typography: "{typography.apparatus}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
  button-primary-hover:
    backgroundColor: "#f3eee2"
    textColor: "{colors.ground}"
  layer-toggle:
    textColor: "{colors.ink-3}"
    padding: "6px 10px"
  layer-toggle-on:
    backgroundColor: "#2b261f"
    textColor: "{colors.ink}"
  view-switch-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    padding: "6px 8px"
  title-field:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  ai-segment-plate:
    textColor: "{colors.ink}"
    padding: "12px 16px"
  ai-segment-caption:
    textColor: "{colors.ai}"
    typography: "{typography.label}"
  gloss-note:
    textColor: "{colors.ink-2}"
    typography: "{typography.gloss}"
  scene-row:
    textColor: "{colors.ink-2}"
    height: "32px"
    padding: "0 92px 0 20px"
  notice-error:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    padding: "8px 32px"
  sheet-title:
    textColor: "{colors.ink}"
    typography: "{typography.sheet-title}"
  ledger-row:
    textColor: "{colors.ink-2}"
    typography: "{typography.apparatus}"
    padding: "7px 0"
  reference:
    textColor: "{colors.ink}"
  talk-turn-head:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
  talk-turn-body:
    textColor: "{colors.ink}"
    typography: "{typography.talk}"
  talk-excerpt:
    textColor: "{colors.ink-2}"
    typography: "{typography.excerpt}"
  slip-part:
    textColor: "{colors.ink-2}"
    typography: "{typography.gloss}"
    padding: "7px 0"
  tool-call-name:
    textColor: "{colors.ink}"
    typography: "{typography.code}"
---

# Design System: Demiurge

## Overview

**Creative North Star: "The Night Edition"**

A late-printed edition of the writer's own manuscript, read by lamplight. The page is a warm near-black ground with bone ink in three steps and hairline rules; the prose sits in a single serif column at book measure, and everything the world knows about it (who speaks, when it is, what is implied, which names are canon) is set around it as apparatus: margin cues to the left, a lettered gloss to the right, marks painted behind the words. The prose is the stage; the apparatus is quiet, small, sans-serif, and attached to the words it is about.

Density is that of an annotated edition, not a dashboard. Chrome is a rail, a masthead and hairlines; there are no panels, no cards around notes, and no chat surface. Conversation with the model happens only on talk pages, each about one thing (the world, a scene, a passage or a bible record) and opened like any other sheet: there is no global chat, docked chat or chat launcher anywhere (see [Topics](#topics-talk-pages)). The story bible is read the same way, as ledgers set in hairlines on a sheet of their own (see [World Inspector](#world-inspector)), not as dashboard panels. AI work is always visible and signed but never loud: the one saturated warm colour in the system belongs to AI-made text and nothing else.

Layers are paint, not layout. Every mark is in the DOM all the time; turning a layer on changes only colour, background size and opacity, so the prose never moves (measured 0 px of movement, click to paint within 34 ms in the shipped build). Motion follows the same grammar: marks fade, underlines draw left to right, nothing slides or bounces.

**Key Characteristics:**
- Warm near-black ground, bone ink in three steps, 1px hairline rules for all structure.
- Old Standard TT for the writer's words and the page's stamps; Source Sans 3 for every piece of apparatus.
- Vermilion reserved for the double-ruled AI segment plate.
- Each layer hue does one job: speaker tints, time blue, subtext gold.
- Gloss notes are lettered keys on gutter ticks, never cards.
- The bible, talk pages and agent traces are apparatus too: sans, hairlines, no fills, no cards.
- Every conversation is scoped to one thing and shows its scope; there is no global chat.
- Paint-only layers: colour, background size and opacity; never box geometry.
- Fade 140 ms, draw 150 ms, one expo-out ease; reduced motion zeroes both.

## Colors

A dark, warm, low-chroma ground and ink, with four saturated hues each bound to exactly one meaning.

### Primary
- **Bone Ink** (`ink`): the writer's prose, document titles, the active scene and tab, the primary button's fill and the selected view switch. The brightest neutral and the only one used as a fill for action.

### Secondary
- **Night-Edition Vermilion** (`ai`): AI-made text only. It draws the double ruling of the AI segment plate and colours its caption. Nowhere else.

### Tertiary
- **Almanac Blue** (`time`): story time. The chronology spark in the rail and on the Reader-Order sheet, scene years, story-time values in the World inspector and the agent slip (dates, spans, durations), the "inferred" mark on the story-time stamp, the time key letters and time note heads, and the Time toggle's underline. Its translucent form (`time-band`) is the lower-half highlight behind time expressions.
- **Subtext Gold** (`subtext`): implication and reveal. The dotted underline beneath implied passages, subtext keys and note heads, and the Subtext toggle's underline.
- **Speaker Tints** (`say-0` Sea Glass, `say-1` Rose Clay, `say-2` Lilac Ash, `say-3` Lichen, `say-4` Tawny): one per speaker, assigned per scene in order of first speech, only to speakers present. A tint always travels with its speaker's name: the caps cue in the margin, the swatch in the rail's speaker list, and the spoken words when Speakers is on. `say-4` is also the fallback for a fifth and later speaker.

### Neutral
- **Lamp-Black Ground** (`ground`): the page and masthead.
- **Rail Black** (`rail`): the left rail, one step darker than the page so the page reads as lit.
- **Raised Umber** (`raised`): the only filled surface: error notices, the save-problem block, the hovered tab-close, a failed tool call or agent turn. Never a kept contradiction, which is story material, not an error.
- **Second Ink** (`ink-2`): apparatus text, inactive rail rows, gloss bodies, the stamp, quotations.
- **Third Ink** (`ink-3`): labels, scene numbers, dimmed controls, placeholders, the World hairline and the writer's own notes, ledger metadata (counts, status, authority), rejected candidates and the underline of a reference. Still legible on the ground (about 6:1).
- **Hairline** (`rule`): every structural border: rail edge, masthead base, tab separators, control outlines, gloss divider.
- **Strong Hairline** (`rule-strong`): hover border on controls, the gutter ticks, blockquote rule, scrollbar thumb.

### Named Rules
**The Vermilion Signature Rule.** Vermilion marks AI-made text and only AI-made text: the plate's two rules and its caption. If a surface is not an AI segment, it carries no vermilion, not even as an accent or an error. A model's turn on a talk page, a tool call, a tool result and a bible record the agent wrote are not AI segments: they are signed by their author line ("Model · profile", "inferred", "suggested"), never by vermilion. AI-made prose meant for the manuscript is an AI segment wherever it is shown, a talk page included, and is always set in the plate.

**The One Job Rule.** Each layer hue means one thing everywhere it appears. Blue is always story time, gold is always subtext, a speaker tint is always that speaker in that scene. A new feature that needs colour takes a neutral, not a layer hue. The World inspector, talk pages and agent slip use neutrals throughout, and blue only for story-time values; speaker tints never appear on them, because a tint is assigned per scene and those surfaces are not one scene.

**The Paired Tint Rule.** A speaker tint never appears alone: it is always paired with the speaker's name, in the margin cue or the rail swatch row, so colour is never the only carrier of who is speaking.

## Typography

**Display Font:** Old Standard TT (with Iowan Old Style, Georgia, serif), self-hosted at 400, 400 italic and 700.
**Body Font:** Old Standard TT for prose; Source Sans 3 (with Source Sans Pro, system-ui) for apparatus, self-hosted at 400, 400 italic, 500 and 600.

**Character:** A nineteenth-century book face for the writer's words against a clear humanist sans for the edition's apparatus. The serif belongs to the text; the sans belongs to everything said about the text.

### Hierarchy
- **Display** (Old Standard 400, 32px, 1.25; 27px at 860px and below): the document title field at the head of the sheet.
- **Headline** (Old Standard 400, 30 / 25 / 21px for h1 / h2 / h3, 1.25, 1.4em above, 0.5em below): headings inside the prose. Headings stay at regular weight; size alone ranks them.
- **Body** (Old Standard 400, 19px, 1.62, 620px measure; 18px at 860px and below): manuscript prose. Paragraphs are separated by 20px of space, not indents.
- **Stamp** (Old Standard 400, 14px, 0.06em, uppercase): the story-time stamp in the masthead ("FROST 12, 1203 · NIGHT"). The wordmark is the one 700 serif setting (16px).
- **Apparatus** (Source Sans 3 400–500, 13–14px): rail rows, tabs, controls, notices.
- **Gloss** (Source Sans 3 400, 13.5px, 1.45): note bodies; emphasised phrases lift to `ink`, not to bold.
- **Label** (Source Sans 3 600, 12px, 0.1–0.12em, uppercase): rail section headings, margin cues, gloss note heads, the AI caption. Labels name the thing beside them; they are always functional.
- **Key** (Source Sans 3 600, 11px, 1): the lowered letter after a noted phrase, set out of flow.
- **Sheet title** (Source Sans 3 500, 21px, 1.25): the title of a sheet that is not a document: an inspector view, a bible record, a topic, model settings. A record's name and a topic's title are apparatus, like a speaker's name in a margin cue, even when the writer typed them.
- **Talk** (Source Sans 3 400, 15px, 1.55, on the 620px measure): the bodies of talk-page turns, human and model alike. Emphasis is italic, strong is 600; headings inside a turn are no larger than a Label.
- **Excerpt** (Old Standard 400 italic, 15px, 1.5, `ink-2`, a 1px `rule-strong` rule at its left, 12px inset): manuscript prose quoted in apparatus: a passage topic's anchor, a quotation in a turn or a bible record.
- **Code** (system monospace 400, 12.5px, 1.5): tool names, tool arguments and results, and request parameters. It wraps (`white-space: pre-wrap`, `overflow-wrap: anywhere`) rather than scrolling sideways.
- **Numerals** use tabular figures wherever they align (scene positions, years, scene number, ledger counts, story-time values, tool-call durations).

### Named Rules
**The Two Voices Rule.** The writer's words and the edition's stamps are serif; everything the app says is sans. Never set apparatus in Old Standard or prose in Source Sans; the writer's inline `[[ notes ]]` are the deliberate crossover, always italic sans at 15px, because they are the writer talking to themselves. The bible, talk-page turns (the writer's own included) and the agent slip are apparatus, so they are sans. Manuscript prose keeps the serif wherever it is quoted (the Excerpt setting), and model-made text takes the serif only as AI prose inside the plate.

**The Fixed Weight Rule.** Weight, size and style never depend on a layer. World entities are always 700 and notes always italic apparatus whether or not their layer is on, because changing them would reflow the line.

## Layout

A four-column sheet inside a rail-and-masthead frame. The workspace grid is the 300px rail beside a column of 56px masthead, a notice row and the scrolling page. The sheet's columns are the left margin (96px) for cues and the scene number, the prose column (up to 620px), a gutter (40px) for ticks, and the gloss column (340px). The sheet pads 52px above and 160px below so the last line can be written mid-screen. Rail content insets 20px; the current scene carries a 3px ink bar at the rail's left edge.

Margin cues and the scene number hang right-aligned in the left margin, 22px clear of the prose. Gloss notes are positioned absolutely beside the line they annotate, stacked with a 14px gap when they collide.

Responsive behaviour, from the build:
- **≤1380px:** margin narrows to 80px, gutter to 32px, gloss to 220–300px; the masthead evens its padding.
- **≤1180px:** the rail leaves the grid and becomes an overlay drawer (up to 86vw), opened from a 32px toggle in the masthead; it fades in, it does not slide.
- **≤860px:** one column. The masthead wraps (tabs, then the stamp on its own line, then toggles and actions). Margin cues move into the gap above their paragraph (paragraph spacing grows to 26px to hold them), the scene number hides, the save status follows the title, and gloss notes follow the prose as a keyed list under a hairline, showing only the layers that are on.

### Sheets
The page area shows one sheet at a time, in the active tab. There are four kinds, all on the same four-column grid and the same 52px / 160px padding, and all opened in the masthead's tab strip:
- **Document sheet:** a scene or a world entry, as above. One tab per document.
- **Inspector sheet:** a World inspector view or one bible record ([World Inspector](#world-inspector)). They share a single World tab, whose title is the view's or record's name and whose crumb is `World ›`.
- **Topic sheet:** one talk page ([Topics](#topics-talk-pages)), one tab per topic, crumb `Topics ›`. The World inbox and the resolved-and-archived list are ledger sheets under the same crumb, one tab each.
- **Settings sheet:** model settings, as now.

On a sheet that is not a document, the masthead keeps the tab strip and drops the story-time stamp and the layer toggles, which belong to scene prose. An inspector sheet shows no Context control and no Generate next. A topic sheet shows Context, which opens the next turn's agent slip, and no Generate next; its Send lives in the composer.

A reference to a bible record or an inspector view, from any sheet, the rail or a slip, shows it in the World tab (opening the tab if it is closed) and brings that tab forward, as a link does in a browser tab; Back returns to the previous view or record. A reference to a scene or entry opens (or brings forward) its document tab, and a reference to a topic opens its topic tab. Following a reference never closes the sheet or slip it came from.

### Named Rules
**The One Page Rule.** The page area holds one sheet, and only the rail and the gloss column sit beside it. The World inspector, a talk page and the agent slip never dock as a third pane, drawer or overlay over the manuscript; the inspector is a sheet in a tab, a talk page is a sheet in a tab, and the slip is a gloss-column note attached to what it explains.

**The Paint-Only Rule.** A layer may change colour, background size and opacity. It may never change a box: no width, padding, margin, border, font weight, display or position. Any new layer rule is tested by toggling it and measuring zero prose movement.

## Elevation & Depth

Flat by construction. Depth comes from tonal steps (rail one step below the page, raised umber for the few filled blocks) and 1px hairlines, never from shadows. The single shadow in the system belongs to the rail when it overlays the page on narrow screens, where it must separate a floating drawer from live prose.

### Shadow Vocabulary
- **Drawer** (`box-shadow: 12px 0 32px rgb(0 0 0 / 0.45)`): the open rail drawer at 1180px and below. Nothing else casts a shadow.

### Named Rules
**The Hairline Rule.** Structure is drawn, not lifted: borders are 1px in `rule`, strengthening to `rule-strong` on hover. The pressed-toggle underline is an inset 2px line, not elevation.

## Shapes

Square paper, softened controls. The page, plate, notices and blocks have square corners; interactive controls (buttons, the view switch, the layer toggle strip, the rail toggle) round to a gentle 5px, and the small tab-close square to 4px. Speaker swatches are the only circles (8px). The AI plate's form is its own: a 1px border plus a 1px outline offset 3px, a double rule like a printer's frame.

## Components

### Buttons
Plain and printed.
- **Shape:** gentle corners (5px), 1px `rule` border, no fill, 13.5px Source Sans 500, 7px 14px.
- **Primary:** bone-ink fill with ground-coloured 600 text; one per surface: "Generate next" at the masthead's right, Send in a prose request slip, and Send in a topic's composer. An agent slip has no Send of its own, because the composer's Send sends the next turn.
- **Hover / Focus:** secondary buttons strengthen their border to `rule-strong`; primary brightens to a paler bone (#f3eee2). Focus everywhere is a 1px `ink-2` outline offset 2px (inset 3px on segmented controls).
- **Text actions:** rail and notice actions are bare `ink-2` text that underline on hover (3px offset).

### Layer Toggles
A segmented strip, the layer legend itself.
- **Style:** 5px-rounded strip, 1px `rule` outline and dividers, 13px Source Sans 500 in `ink-3`.
- **On:** a slightly raised umber fill (#2b261f), `ink` text and an inset 2px underline in the layer's own hue (Speakers in `say-0`, Time in `time`, Subtext in `subtext`, World and Notes in `ink-3`). Default state is Speakers only.

### View Switch
The rail's Manuscript / World / Topics switch: same strip form; the selected view inverts to bone fill with ground text. Manuscript lists scenes in reading order and the speakers in this scene. World starts with the inspector's five views, then world entries by kind ([World Inspector](#world-inspector)). Topics starts with the World inbox, then open topics by scope ([Topics](#topics-talk-pages)). The rail foot's inbox count is a reference to the World inbox sheet in every view.

### References
A reference is a link to a record, scene, entry or topic, set in the surrounding text's size: `ink` text with a 1px `ink-3` underline offset 3px, the underline lifting to `ink` on hover. A scene reference reads as its tabular position and title ("4 The Ferry"); where it carries a year, the year is in `time`. A reference to something that no longer exists stays as plain `ink-3` text with "(removed)". One form serves the inspector, talk pages and the agent slip.

### Navigation
- **Rail:** section labels, then rows of 32px in `ink-2` that brighten to `ink` on hover; the current scene is `ink` with a 3px left bar. Scene rows carry a tabular position number and, where dated, the year in `time`. Beside the reading order, the chronology spark plots story time as a 1.5px blue line with blue points and an ink point for the current scene.
- **Tabs:** an open-document strip in the masthead, separated by 18px hairlines; the active tab is 600 `ink` and carries its crumb in `ink-2`; inactive tabs shrink first. Close buttons fade in on hover or focus.
- **Mobile:** the rail becomes a fading drawer; the crumb drops.

### Margin Cue
Fountain-style speaker cue: 12px Source Sans 600, 0.1em, uppercase, right-aligned in the left margin in the speaker's tint. Always in the DOM; it fades in with the Speakers layer.

### Layer Marks
Painted behind the words as three background layers sized by width, so they draw left to right:
- **World:** a 1px `ink-3` hairline under known entities (always 700) and under words naming a story-bible record a World note is about (at the prose's own weight); suggested names get a 3px-dash `ink-2` hairline.
- **Time:** a `time-band` wash over the lower 42% of the line.
- **Subtext:** a 2px dotted gold rule (1.5px dots).
- **Notes:** the writer's `[[ notes ]]` gain a faint bone wash and lift from `ink-3` to `ink-2`.
- **Speakers:** spoken words take the speaker's tint.

### Gloss Note (signature)
A lettered key, not a card. The noted phrase ends in a raised 11px key letter in its layer's hue; beside it in the gloss column, a 26px `rule-strong` tick in the gutter leads to the note. The note is a head (letter · kind, 12px uppercase label in the layer hue) with its authority right-aligned in `ink-3` ("inferred", "suggested", "linked"), a 13.5px body in `ink-2` with key facts lifted to `ink`, and one-click text actions in `ink` ("Confirm", "Not implied") that underline on hover. Unavailable actions dim to `ink-3`. Notes and ticks appear only when their layer is on: the note fades, the tick draws.

**Bible notes.** On a scene whose prose a story-bible scene names, the bible sets its own notes in the same grammar, with the authority "story bible" (or "inferred" for an inferred time): Time notes for when the scene is after the scene before it and when each event it shows happens; World notes for each count as the scene opens and as it changes, and for each version of an event beside what really happened; Subtext notes for what the scene plants and pays off, the viewpoint's dramatic irony, and what is still held back. A note sits on the first words in the prose that name its record (its name, a stated year, a count of ten or more). A note whose record the prose doesn't name is about the whole scene: it has no key in the text and no tick, is lettered after the notes on words, and follows the scene's last line, so notes on words keep their places beside them. The masthead stamp reads the bible's time for the scene (its latest placed event) before the outline's.

### AI Segment Plate (signature)
AI-made prose inside a double-ruled vermilion frame (1px border, 1px outline offset 3px), padded 12px 16px. Its caption is a 12px vermilion uppercase label ("AI segment · model") with Regenerate and Accept at the right; while generating, the caption breathes between full and 55% opacity over 1.6s. The prose inside keeps the body setting; only the frame says who wrote it.

### Notices
Full-width rows under the masthead, 8px 32px, `ink-2` on the ground with a hairline base; errors take the raised umber fill and `ink` text.

### Ledger
The one form the World inspector and the World inbox use for lists: rows between hairlines, like the rail's lists set at sheet width.
- **Width:** on a list sheet the ledger spans the prose column, gutter and gloss column (up to 1000px). The left margin holds each row's tabular number (position, date or count), right-aligned 22px clear, as the scene number hangs beside a title.
- **Row:** at least 32px, padded 7px 0, a 1px `rule` line above each row and below the last. The row's lead (a name, a question, an event's summary) is 14px apparatus in `ink`; secondary lines below it are 13.5px in `ink-2`; metadata (status, authority, counts) sits at the right in 12.5px `ink-3`, tabular. Sub-rows (a drive under its actor, a candidate under its question) indent 20px.
- **Groups:** a Label in `ink-3` with its count right-aligned, 22px above the group's first row.
- **Hover and focus:** a row that opens something strengthens its top line to `rule-strong`; no fill, no zebra striping. Focus is the 1px `ink-2` outline inset 3px.
- **Empty:** one 13px `ink-3` sentence saying what would appear there ("No contradictions kept. When two records disagree, they are held here."). No illustrations.
- **Loading and errors:** no skeletons or spinners; the sheet renders when the story store answers. A failed read is a Notice under the masthead.

### World Inspector
The story bible read as the edition's appendix: five ledgers and a detail sheet per record, set in Source Sans 3 apparatus and hairlines. It is an inspector *sheet*, never the persistent third pane of a binder-editor-inspector layout (the One Page Rule), and it mostly reads: a few high-frequency edits are direct controls (below), and every other change to the bible is the agent's.

**Rail.** The World view opens with an "Inspect" section: five 32px rows, Cast & Drives, Open Questions, Timeline & Counts, Reader-Order and Contradictions, each with a tabular count right-aligned in `ink-3` (actors, undecided questions, placed events, scenes, kept contradictions). The view showing in the World tab is `ink` with the 3px left bar. World entries by kind follow, as now.

**Sheet head.** In the prose column: the Sheet title (the view's name), then a 14px `ink-2` lede of one sentence with its totals ("9 actors, 14 drives. 2 actors have no drive yet."). On a record's detail sheet, a Label above the title names the record's kind in `ink-3` ("Drive", "Event", "Open question") with its authority at the right ("linked", "inferred", "suggested").

**The five views**, each one ledger:
- **Cast & Drives:** grouped by actor, characters then organisations. The actor's row leads with its name and, as one secondary line, counts that are references into its detail ("2 relations · 1 membership · 3 turns"). Its drives are sub-rows: the want as the lead, then "stakes · action" in `ink-2`, then a line of references: origin events ("from …") and the drives it opposes, allies with or competes with. A gap is an `ink-3` phrase in the row ("no drive yet", "no origin"); a deliberate gap reads "gap kept · reason". No speaker tints and no swatches: the cast is story-wide.
- **Open Questions:** one row per question, its text as the lead, its status at the right ("open", "answered", "left open"). Candidates are sub-rows. The chosen one is marked with an `ink-2` Label, "Chosen". Live candidates are `ink-2`. Rejected ones are `ink-3`, with "Rejected · reason" as their secondary line (no strike-through). Each candidate's reach is at the right ("touches 4"), a reference to its touches. Superseded answers fold under one line ("› 2 superseded", the slip-part fold); opened, each shows what replaced it. Questions left open group last under "Left open", with their reasons.
- **Timeline & Counts:** two ledgers on one sheet. Timeline lists events in story order, with the year in the left margin in tabular `time`, the summary as the lead, and a secondary line that starts with the full story-time value in `time` and goes on with references: the scenes that depict it and the events that cause it. An event in a kept contradiction carries "1 contradiction" at the right, a reference into Contradictions. Events not yet placed in time group last under "Not placed in time". Counts lists counted spans and tallies, one per row: the label as the lead and the value at the right in tabular figures. Story-time quantities (days, years, spans, ages) are in `time`, and plain tallies (scenes, openings, mentions) are in `ink`.
- **Reader-Order:** scenes in reading order on 32px rows, matching the rail, with the reading position in the margin and the scene's year at the right of the row in `time`. The gutter and gloss column carry the chronology spark at sheet scale, with the same 1.5px blue line, blue points, larger flashback points and an `ink` point for the active scene, one point per row. Below, the reader-question ledger lists each question with the scene positions where it opens, progresses and is answered. A question-order break is a row under the Label "Breaks", phrased as the order it breaks ("Answered in 3 before it opens in 5").
- **Contradictions:** one row per contradiction, with its kind as an `ink-3` Label ("Cause after effect", "Circle of causes", "Noted conflict"), a description in `ink-2` with references to the records involved, and its state at the right ("kept"). Resolved ones group last. A contradiction is story material: no raised umber, no warning icon, no error wording.

**Record detail.** The record in the prose column: fields as a Label in `ink-3` over a 14px `ink` value (free text at 1.5 and up to 60ch), groups of fields separated by a `rule` line and 14px of space, quoted prose in the Excerpt setting. The gloss column holds its touches as two keyed lists, "Touches" (outgoing) and "Touched by" (incoming), each grouped by kind under Labels, every row a reference. An actor's detail links to its entry document ("Open entry"), since actors stay entries.

**Direct edits.** The edits where a click is faster than asking the agent, and nothing else: on an open question's candidates, Choose, Reject (with a reason) and Reopen (a chosen answer reopens the question; a rejected one goes back in the running); on Reader-Order rows, "earlier" and "later", one place in the telling order; on a scene's detail, its viewpoint as a select of the cast; on a count's detail, a value at an event, with an optional note; and on any record's detail, its gaps under the Label "Gaps", each with Mark deliberate (with a reason), and kept gaps with Unmark. Actions are bare 12.5px `ink-2` text that underlines on hover, set in the row's metadata or as one more secondary line; a reason opens as an inline field in the slip's setting (`rail` fill, `rule` border, 5px corners), never a dialog. Each edit is the story command the agent's tool of that name runs, and its outcome shows under the sheet head between hairlines: what was done, then the contradictions it kept (story material in `ink-2`, each with a reference to Contradictions) and the records and scene prose that may still state the old version, as references with their reasons in `ink-3`. A refusal or a failed save is the one filled case, raised umber with `ink`. A read-only tab shows no controls.

**Responsive.**
- **≤1380px:** margin, gutter and gloss narrow as on a document sheet; ledger secondary lines wrap, and the metadata column keeps its width.
- **≤1180px:** the rail becomes the drawer; the sheet is unchanged.
- **≤860px:** one column. Margin numbers move inline, in `ink-3` before the lead, as cues move above their paragraph; right-hand metadata drops to the end of the row's last secondary line; the Reader-Order spark hides and years stay on the rows; a detail sheet's touches follow its fields under a hairline, as gloss notes follow prose. Nothing scrolls sideways.

### Topics (talk pages)
Conversation in Demiurge is a talk page about one thing, after Wikipedia's (`docs/rebuild/talk-pages.md`), never a chat. A topic is a sheet with a title, a scope, a status and a record of attributed turns; the model is a participant whose words are signed and whose request can be read.

**Scoped, not global.** These are the differences from chat, and each is a check:
- Every topic has exactly one scope: the world, a scene, a passage in a scene, or one bible record. The scope is always shown at the topic's head as a reference, and it decides what the model sees.
- A composer exists only at the foot of an open topic's sheet. There is no conversation without a topic, no "new chat", no chat panel docked, floating or drawn over the manuscript, no launcher bubble, and no composer fixed to the viewport.
- World scope is the village pump, a scope chosen like any other and not a catch-all default. "New topic" in the rail starts a world topic; a topic started from a scene, passage or record (`worldcrafter-rxvy`) takes that scope. Either way the writer names it first. Its title is never taken from the first message.

**Starting from the thing.** A scene sheet has one text action under its title, 12.5px `ink-3`: "Talk about this scene", which reads "Talk about this passage" while words are selected, in one paragraph or over several. A record's detail ends with a "Talk" field in the record-field form: its open topics as references, each with "a passage" or "raised by model" as an `ink-3` secondary line where it applies, then the text action "Talk about this record" ("Talk about this scene" on a scene's record). Either opens the topic sheet at once, as "New topic" does, or brings forward one already drafted about the same thing and not sent. A read-only tab shows neither action.
- Turns are a record, not a stream of bubbles: no avatars, no left/right alignment, no typing dots, no read receipts.

On a scene sheet, a passage's open topics (`worldcrafter-rxvy`) are gloss notes of kind "Talk" on the Notes layer, because a talk page about a passage is the writer's annotation grown up. They follow the Gloss Note grammar exactly. The key letter, the head and the toggle underline take the Notes layer's `ink-3`, and the passage's words carry a 1px `ink-3` hairline while Notes is on. The topic's title is the body, the authority is "yours" or "raised by model", and "Open" is the action. A topic about the whole scene, and a passage topic whose words are gone, follow the scene's last line, as a scene note does. The key is always in the DOM, and the note fades in and its tick draws only when Notes is on (the Paint-Only Rule). This adds no layer and no hue. While Notes is off, the scene's passage topics are still listed in the rail's Topics view under Passages.

**Rail (Topics view).** First the World inbox: a Label with its count, its first three items, and an "Open the inbox" text action that opens the World inbox sheet. The preview uses the open-topic row below (a title, then an about line), not the inbox ledger's row. For a contradiction the about line starts with its kind ("Contradiction · Scene 4 The Ferry"). Then open topics grouped by scope kind under Labels (World, Scenes, Passages, Records). Each row shows the title in 14px `ink` and an about line in 12.5px `ink-3` naming its scope, ending "· raised by model" when the model started it. The topic in the active tab carries the 3px left bar. The Label row's action is "New topic"; the panel's last line, "Resolved and archived", opens a ledger sheet of the rest, grouped by status.

**World inbox sheet.** A ledger of everything waiting on the writer: open topics the model started, and kept contradictions the story has surfaced. Each row has its kind as an `ink-3` Label ("Topic", "Contradiction"), the title as the lead, the scope as its secondary line, and at the right where it came from ("Model · profile", date). A topic row opens its topic sheet; a contradiction opens its detail in the World inspector.

**Topic sheet.**
- **Head (prose column):** a Label line in `ink-3` naming the scope, the scope itself a reference ("Scene · 4 The Ferry", "World", "Drive · Ardelia wants the Ninefold"). A passage topic then quotes its passage in the Excerpt setting; if the anchor has gone stale, an `ink-3` line says so ("The passage has changed; this topic now follows the scene"). Then the Sheet title, with the status at the right in `ink-3` ("Open", "Resolved", "Archived") followed by text actions ("Resolve", "Archive", or "Reopen"). A 12.5px `ink-3` line says who started it and when.
- **Turns (prose column, 620px):** each turn sits under a 1px `rule` line with 18px above its head. The head is a Label: the author in `ink-2` ("You", or "Model · profile label"), the time at the right in tabular `ink-3`, and on a model turn a "Request" text action that opens that turn's agent slip. The body is in the Talk setting in `ink`, for both authors. A model turn is also set off by a 1px `rule-strong` rule down its left edge, with the head and body inset 14px. That carries the attribution in form, legible without colour. Quoted manuscript prose takes the Excerpt setting, and records and scenes are references.
- **Tool use in a turn:** one fold line under a model turn's body, in 12.5px `ink-3` ("› 3 tool calls · reader-order, touches, trace"). Opened, it lists each call's name in the Code setting with a one-line result in `ink-2`. The arguments and full results live only in the agent slip, which "Request" opens.
- **Proposals:** a turn that proposes a fact, a relation or a decision ends with one `ink-2` line per proposal, saying what would be recorded, followed by an `ink` text action ("Record as fact"). Prose proposed for the manuscript is an AI segment and is set in the plate (the Vermilion Signature Rule); it is the only vermilion a topic sheet can carry.
- **Running turn:** the pending model turn shows its head with Stop as a text action at the right (the only Stop for an agent turn; the composer keeps Send, disabled until the turn ends), and a live `ink-3` status line naming the current step ("Running touches…"). Streamed text appears in place as it arrives. There is no pulse (the breathing pulse belongs to the AI caption), no spinner and no typing dots. A failed turn shows its error in the Notice error form inside the turn, with "Try again".
- **Composer:** at the foot of the turns, only on an open topic. First a 12.5px `ink-3` line saying what the model will see ("The model sees this scene, 4 records it touches, and this topic."), with a "Context" text action that opens the next turn's agent slip. Then the textarea, in the slip's field form (rail fill, 1px `rule` border, 5px corners) and the Talk setting, growing with its content up to 12 lines. Send is the composer's one primary button, at the right, and Ctrl/⌘+Enter sends. It sends the composer's text with the next-turn slip's edits, if there are any, stored as that turn's request revision. It is disabled while a turn runs, while the composer is empty, and while the topic has no title. A resolved or archived topic has no composer, only "Resolved on <date>." and "Reopen".
- **New topic:** "New topic" opens a topic sheet in a new tab at once, with no dialog or overlay. The scope line is filled in, and the title is an empty field in the Sheet title setting. It uses the document title field's form (no border, the caret in `ink`), with an `ink-3` placeholder: "Name this topic". Focus starts in it. The status reads "Open". There are no turns yet, only one 13px `ink-3` line: "No turns yet. Say what this topic should settle.". The composer is ready below, and its Send waits for a title. Nothing is stored until the first Send, so closing the tab before that discards the topic. Once stored, the title stays an editable field while the topic is open, for either author's topics.
- **Gloss column:** holds the agent slip beside the turn it explains, on a leader, or beside the composer for the next turn. Nothing else.

**Responsive.**
- **≤1380px:** the gloss column narrows and the slip with it; turns keep the 620px measure where it fits.
- **≤1180px:** the rail becomes the drawer.
- **≤860px:** one column. Turns run full width in the Talk setting, and the model turn's left rule stays. An agent slip opens inline, directly after the turn it explains (the next turn's slip directly above the composer), under a hairline. The composer stays at the foot of the turns, in the flow.

### Agent Slip
The Request Slip extended to agent turns. One component (`app/src/generate/context-viewer.tsx`) shows a prose generation's request and an agent turn's prompt, context and tool trace (`worldcrafter-w4mr`, reused by `worldcrafter-aq1r`). It keeps the slip's form: in the gloss column beside what it explains, on a leader like a note's, apparatus throughout, Escape or Close puts it away, and every part folds to one line (its name and its size or state) between `rule` lines until opened.

**Head.** A Label title in `ink` ("Request" for a prose generation, "Turn 3" for a past agent turn, "Next turn") with Close at the right. Then the target line in 12.5px `ink-3` (profile · endpoint · URL), and "Edited from request …" when the shown request is a revision.

**Parts, in order:**
1. **System prompt.** Editing it shows a scope choice in the settings strip (the view switch's form, the choice inverted), "This session" or "Profile default", starting on "This session". With "Profile default" chosen, an `ink-2` line says what it reaches ("Changes the prompt for every new session with this profile."). The fold line says which scope an edit has ("edited · this session").
2. **Model.** The profile's label and its sampler parameters (the parameters part, in the Code setting), with the same scope choice for an edit.
3. **Context packet.** The breakdown lines (story window, budget, world cards) and the message parts, as the Request Slip shows them now. A prose request for a scene's document lists its story bible sections under "Story bible for scene:…", one hairline row each (title · size, "pinned", "left out"), with Pin and Leave out as quiet `ink-2` text actions at the right; a pressed one is underlined in `ink`. Changing one puts the request together again, so edits in the slip are discarded, as with any new request. A section left out to fit the budget reads in `ink-3`. For the next turn they are editable, with one `ink-2` line: "Edits apply to the next turn only and are kept with it as a revision." For a past turn they are read-only, shown in their settings between hairlines without field borders, and the fold line reads "as sent".
4. **Tool trace** (agent turns). An ordered list with one fold line per call: the ordinal in tabular `ink-3`, the tool's name in the Code setting in `ink`, a one-line summary of the arguments in `ink-2` that ellipsizes, and the state at the right in tabular `ink-3` ("212 ms", "running"). Opened, it shows Arguments and Result, each a Label over Code-set text in `ink-2`. Records and scenes named in a result are listed as references above the raw result. A failed call's state reads "failed" in `ink`, and its error shows in the Notice error form. Calls are appended as they start, with the 140 ms fade and no other motion.
5. **Kept contradictions.** A Label, then rows in the Contradictions ledger's form.
6. **Touched by this change** (`trace` suspects). A Label, then one row per suspect: a reference to the record or scene, then the reason in `ink-3`. Following one opens its sheet (a record's detail, a scene's tab), and the slip stays open with its turn.

**Actions.**
- **Prose request slip:** "Discard edits" as a text action and Send as the slip's one primary button. While the request runs, Stop takes Send's place, as now. It has no composer, so the slip sends.
- **Next-turn slip** (topic sheet): "Discard edits" and no Send. Its edits wait for the composer's Send, which sends them with the writer's text. A line in `ink-2` says so ("Sent with your next message.").
- **Running turn's slip:** read-only and live. Its tool calls append as they start, and its parts can be read but not edited. It has no Send and no Stop; Stop is the text action on the running turn's head.
- **Past turn's slip:** a record, with no Send.

**Colour.** Nothing in the slip is AI prose, so it carries no vermilion: not the assistant messages in the context packet, not the tool arguments, not the results. Neutrals throughout, `time` only for story-time values, raised umber only for a failure.

**Responsive.** The slip takes the gloss column's width (340px, 220–300px at ≤1380px), and long values wrap. At ≤860px, on a scene sheet it follows the prose with the gloss list, as now; on a topic sheet it opens inline after its turn (see Topics).

### Motion
Two durations and one ease: fade 140 ms for opacity (marks, cues, keys, notes, close buttons, the drawer), draw 150 ms for background size and tick stroke, both on `cubic-bezier(0.16, 1, 0.3, 1)`. Nothing moves position. Under `prefers-reduced-motion` both durations are zero and the generating pulse stops. On the inspector, talk pages and the agent slip, folds open without animating their height (only their chevron turns, in the fade duration), new turns and tool calls fade in, and streamed text simply arrives; nothing scrolls the page on its own except to keep a running turn's end in view while the writer is already at the foot.

## Do's and Don'ts

### Do:
- **Do** keep every layer mark in the DOM and switch it with `data-layer-*` attributes on the sheet, changing only colour, background size and opacity.
- **Do** reserve vermilion (#e34b2f) for the AI segment plate and its caption.
- **Do** give each layer hue exactly one meaning, and pair every speaker tint with the speaker's name.
- **Do** set the writer's prose in Old Standard TT at 19px / 1.62 on a 620px measure, and all apparatus in Source Sans 3.
- **Do** attach notes to their words with a key letter and a gutter tick, and resolve them with one-click text actions.
- **Do** fade opacity in 140 ms and draw underlines and ticks left to right in 150 ms on `cubic-bezier(0.16, 1, 0.3, 1)`, and zero both under reduced motion.
- **Do** draw structure with 1px hairlines (`rule`, `rule-strong`) and tonal steps.
- **Do** give every topic one scope, show it at the topic's head, and keep its composer at the foot of its own sheet.
- **Do** set the bible, talk turns and the agent slip in Source Sans 3, signed by author lines, with story-time values in `time` and everything else neutral.
- **Do** open the World inspector, topics and the World inbox as sheets in tabs, and attach the agent slip to the turn or block it explains.

### Don't:
- **Don't** let a layer change weight, size, padding, border, display or position; it reflows the prose.
- **Don't** put gloss notes in cards, boxes or filled panels; they are keyed text in the margin.
- **Don't** slide, bounce or translate anything, including the narrow-screen rail drawer.
- **Don't** use vermilion for errors, emphasis or brand; errors use raised umber with bone ink.
- **Don't** reuse a layer hue for an unrelated meaning.
- **Don't** add shadows beyond the overlay rail drawer.
- **Don't** build a global, docked or floating chat, a chat launcher, or a composer fixed to the viewport; conversation lives on scoped topic sheets.
- **Don't** set the bible in dashboard panels, cards or filled tiles, or show it as a persistent third pane beside the manuscript.
- **Don't** colour a model's talk turn, a tool call or a contradiction with vermilion or a layer hue; sign a turn with its author line and set off model turns with a hairline.
- **Don't** give a kept contradiction error styling; it is story material.
