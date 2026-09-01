# DungeonCrawlerSheet

A digital character sheet for the **Dungeon Crawler Carl** tabletop roleplaying game
(based on the book series by Matt Dinniman).

It is a single, self-contained `index.html` file: no build step, no framework, no
server. Open it in a browser and start playing. Everything you type is saved
automatically in that browser, and nothing ever leaves your machine.

> **Unofficial fan project.** Not affiliated with or endorsed by Matt Dinniman or
> the publishers of Dungeon Crawler Carl. All game terms belong to their
> respective owners.

---

## Features

- **Complete crawler sheet** — identity, health, stats, defense, mana, attacks,
  skills, gear, inventory and a full roleplaying journal.
- **Auto-calculated fields** — stat modifiers, DEX mod, Damage Resistance total,
  Evade total, attack To Hit, skill mods and the mana gauge all update as you
  type. Computed fields are read-only.
- **Local autosave** — the sheet is written to `localStorage` half a second after
  every change. Reopen the page and your crawler is still there.
- **Import / Export JSON** — back up a crawler or move it between devices and
  browsers with a single file.
- **Portraits & diagrams** — click or drag-and-drop an image onto the portrait or
  personal-space box; it is resized to 640 px and embedded directly in the sheet
  (and in the JSON export).
- **Light / Dark theme** — toggle in the header, remembered between sessions.
- **Multi-language UI** — French, Spanish, German and Portuguese, selectable from
  the header. The core game vocabulary (*Crawler, Mod, buff, debuff, hotlist*) is
  kept untranslated on purpose.
- **Works offline** — the only external resources are Google Fonts; without them
  the sheet still works with system fonts.

---

## Tabs

### Sheet
- **Health** — a 10-slot crawler Health Bar (10 % … 100 %). Each slot is worth the
  crawler's current CON Mod; mark a slot when it is lost.
- **Identity** — name, race, gender / pronouns, level, Crawler Number, class,
  floor, AI Favor and size (Tiny → Gargantuan). AI Favor is a manually tracked
  spendable resource: Humans begin with 1 and animal crawlers with 0; spend 1 for
  a qualifying d20 reroll or an extra non-Attack Action. Favor may be gained or
  lost during play.
- **Mana** — Current Mana is tracked manually; Max Mana equals the crawler's
  current Enhanced Intelligence Stat.
- **Portrait** — image upload as described above.
- **Stats** — Strength, Intelligence, Constitution, Dexterity, Charisma. Enter the
  Enhanced and/or Unenhanced score; the Mod is derived from the Dungeon Crawler
  score-to-modifier table (Enhanced takes priority).
- **Defense**
  - *Damage Resistance* = Armor + DR Buffs → **DR Total**
  - *Evade* = `d20` + DEX Mod + Evade Buffs → **Evade Total**
  - *Movement* — Move defaults to 20 ft and Step defaults to 10 ft. Step may
    accompany an Action and is not a separate Action, so a normal Move Action
    can cover 30 ft as Move + Step. Both values remain manually editable for
    later effects that modify movement.
- **External Buffs** (max 3), **Debuffs**, and a full-width **Hotlist** with 10
  quick-access slots for items, Spells, weapons, potions and similar entries. A
  slot can hold up to 999 of the same item by name; merely storing an item there
  does not grant its equipment benefits.

### Attacks
Starts with 20 rows, add more as needed: Name, Rank, Hit Stat, **To Hit** (auto =
Rank + Hit Stat Mod), Damage Dice, Damage Stat, Damage Mod and Effects. Hit Stat
and Damage Stat are independent; damage is Damage Dice + Damage Stat Mod.

### Skills
Starts with 24 rows, add more as needed: Skill Advancement mark, Name, Rank,
Stat, automatically derived **Stat Mod**, Check Type (Unopposed / Opposed /
Passive / Evade) and Notes & Upgrades. Rank is tracked separately from Stat Mod.

### Inventory
Starts with 36 rows of UI space, not a game-rule capacity; add more as needed.
Stored Inventory is not limited by encumbrance. Item, Qty and Notes are tracked
manually, and no maximum is imposed on Inventory Qty.

### Gear
- Gear slots / tattoos / patches: Head, Torso, Arms, Hands / Holding, Legs, Feet.
- Accessories (max 10).

### Journal
- **Popularity & Trauma** — popularity and sponsors, past trauma, loose ends,
  regrets.
- **Race & Class** — name and benefits for each.
- **Clubs & Kills** — clubs, societies, guilds, gods; important things killed.
- **Other Crawlers** — 8 entries for party members and rivals.
- **Biography** — 40 character-building questions.
- **Personal Space** — tier, size, amenities, a layout diagram (image + notes).
- **Notes** — 12 free-form pages.

---

## Usage

1. Download or clone the repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).

That's it. To share it with a group, host the single file anywhere static —
GitHub Pages, Netlify, a USB stick, a local folder.

### Buttons

| Button | Action |
| --- | --- |
| Language selector | Switch the interface language. |
| Dark / Light | Toggle the colour theme. |
| Import | Load a previously exported `*-sheet.json` file (replaces the current sheet). |
| Export JSON | Download the current crawler as JSON. |
| Reset | Clear every field. This cannot be undone — export first. |

---

## Data & privacy

- Everything lives in your browser's `localStorage` (key `dcsheet.v1`) plus a
  separate key for the theme and the chosen language.
- No account, no network requests, no analytics. The sheet never sends your data
  anywhere.
- Clearing your browser data, using private browsing, or switching browsers means
  a fresh sheet — use **Export JSON** to keep a backup.

---

## Tech notes

- One file: HTML + CSS + vanilla JavaScript, ES5-compatible, ~2,200 lines.
- No dependencies or build tooling. The repeating parts of the sheet (stat cards,
  table rows, journal pages, tab bar, translations) are generated at load time.
- Fields are bound by a `data-k` attribute to a flat key (e.g. `stats.STR.enh`);
  export nests these into a `character` object and also keeps the flat map.
- Saves and exports use schema version 2. Version 1 attacks with a single `statA`
  remain compatible and initialize both Hit Stat and Damage Stat from that value.
