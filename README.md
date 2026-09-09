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
  skills, spells, companions, gear, inventory and a full roleplaying journal.
- **Auto-calculated fields** — stat modifiers, DEX mod, Damage Resistance total,
  Evade total, attack To Hit, skill mods and the mana gauge all update as you
  type. Computed fields are read-only.
- **Local autosave & Crawler Vault** — multiple crawlers are written to
  `localStorage` half a second after every change. Switch from the header, group
  crawlers into campaign folders, duplicate them, or use the Vault's compact DM
  overview for Health, Mana, Level, Floor and active Debuffs.
- **Import / Export JSON** — back up a crawler or move it between devices and
  browsers with a single file. Importing creates a new Vault crawler instead of
  overwriting the one currently open.
- **Reorderable rows** — drag the handle on the left of any Attacks, Skills,
  Spells, Companions or Inventory row to reorder it (or focus the handle and
  press Arrow Up / Down). The new order is saved. Desktop only; hidden on narrow
  screens and in print.
- **Expandable Skill details** — every Skill row has multiline Description,
  Rank Upgrades and Extended Notes fields without making the play view wider.
- **Live values in text fields** — type a `%` code (for example `%STR_MOD`,
  `%DR_TOTAL`, `%EVADE`, `%LVL`, `%MANA_CUR`, `%MOVE`) in any description, notes
  or journal field and it shows the current value as a coloured chip while the
  field is not focused. Your text stays fully editable and is saved, exported and
  printed exactly as typed; empty values are dimmed and unknown codes show in
  red. The header **?** button opens a Help dialog listing every code.
- **Grinding counters** — every Attacks, Skills and Spells row has a −/+ grinding
  tally beside its Rank. Each `+` counts toward the row's current Rank; reaching
  it resets the tally to 0 and raises the Rank by one (up to 20). Every `+` also
  advances the Identity **Level Grinding** meter; reaching the crawler's current
  Level resets it and raises Level by one (up to 250). A milestone popup
  announces each Rank or Level gain. The tallies are read-only apart from the
  buttons and travel with autosave, Vault operations and JSON import/export.
- **Dedicated Spell register** — record each Spell's type, Mana Cost, range,
  duration and cooldown, with expandable effect details, limitations, upgrades
  and notes.
- **A4 printing** — print the current section or a complete crawler dossier.
  Print mode includes populated Skill and Spell details and trims excessive
  blank rows.
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
  crawler's current CON Mod by default; mark lost slots starting at 100 %.
  Open **Health & Mana adjustments** to select another Health stat, add bonuses
  to every slot or individual slots, or give a slot a fixed value. A fixed value
  replaces that slot's calculation, including bonuses. Stat bonuses from gear
  must still be included manually in Enhanced Stats. For example, a +10 bonus
  to the 100 % slot belongs in that slot's Bonus field; it does not increase
  Constitution or the other nine slots. Bonuses continue following Stat changes.
- **Identity** — name, race, gender / pronouns, level, Crawler Number, class,
  floor, AI Favor and size (Tiny → Gargantuan). AI Favor is a manually tracked
  spendable resource: Humans begin with 1 and animal crawlers with 0; spend 1 for
  a qualifying d20 reroll or an extra non-Attack Action. Favor may be gained or
  lost during play. A Tutorial crawler defaults to Level 1 / Floor 1; Level and
  Floor remain independently tracked. Direct Third-Floor creation uses its own
  Level 10 setup procedure. The current Level cap is 250. Level gains on Floor 3
  or deeper award 3 Stat points, which may remain undistributed until a saferoom;
  they do not directly raise Skill Ranks. This sheet leaves advancement
  application manual. **Level Grinding** is a read-only meter that climbs by one
  each time any Attack, Skill or Spell row is ground up (see the Grinding
  counters feature); when it reaches the current Level it rolls over to 0 and
  raises Level by one, up to the Level 250 cap.
- **Mana** — Current Mana is tracked manually; Max Mana equals the crawler's
  current Enhanced Intelligence Stat by default. Optional adjustments allow a
  bonus or a fixed maximum (including zero); a fixed maximum replaces the normal
  calculation and bonus. Changing the maximum never spends or restores Current
  Mana. Use exceptions only when a rule or the GM calls for them.
  Resource adjustments accept whole numbers. Fixed Health values must be at
  least 1 and fixed Mana cannot be negative; invalid entries are ignored. Adjusted
  Health totals have a minimum of 1 and Mana a minimum of 0. The compact summaries
  and final values appear in print; editing controls do not. **Reset adjustments**
  restores automatic values without changing damage marks, Stats or Current Mana.
  Adjustments travel with each crawler through autosave, Vault operations and JSON
  import/export. Older saves use normal calculations; saved derived values are
  never treated as manual overrides.
- **Portrait** — image upload as described above.
- **Stats** — Strength, Intelligence, Constitution, Dexterity, Charisma. Enter the
  Unenhanced base Stat and current Enhanced Stat separately. Initial character
  creation starts both layers at the same value. Enhanced includes Unenhanced
  plus applicable enhancements, and Stat Mod is calculated from Enhanced only.
  Level-earned Stat Points increase both layers, but advancement remains
  manually applied. Bonuses from other systems must likewise be reflected
  manually in Enhanced; the sheet does not identify or calculate each source.
- **Defense**
  - *Damage Resistance* = Armor + DR Buffs → **DR Total**
  - *Evade* = `d20` + DEX Mod + Evade Buffs → **Evade Total**
  - *Movement* — Move defaults to 20 ft and Step defaults to 10 ft. Step may
    accompany an Action and is not a separate Action, so a normal Move Action
    can cover 30 ft as Move + Step. Both values remain manually editable for
    later effects that modify movement.
- **Buffs & Debuffs** — Buffs are positive effects; reflect Internal Buff effects
  manually in the relevant sheet values. The three External Buff slots record
  the currently active selection, chosen from all available External Buffs at
  the start of the crawling day. If a crawler gains access to a new External Buff
  during the day, they may change the active selection during a short rest.
  Debuffs are tracked manually with their duration or ending condition; there
  is no active limit, and duplicates only stack when marked Stackable. DR and
  Evade Buff fields are numeric aggregate modifiers. The sheet does not
  automate triggers, durations, cooldowns or individual effects.
- **Hotlist** — 10 quick-access slots for items, Spells, weapons, potions and
  similar entries. A slot can hold up to 999 of the same item by name; merely
  storing an item there does not grant its equipment benefits.

### Attacks
Starts with 20 rows, add more as needed: Name, Rank, Hit Stat, **To Hit** (auto =
Rank + Hit Stat Mod), Damage Dice, Damage Stat, Damage Mod and Effects. Hit Stat
and Damage Stat are independent; damage is Damage Dice + Damage Stat Mod. The
Rank column also carries a −/+ grinding tally that raises the Rank automatically
once it reaches the current Rank value.

### Damage and mitigation
DR Total is Armor + DR Buffs, and DR reduces incoming damage first. The official
sheet has no separate crawler fields for Resistance, Vulnerability or Immunity;
record their sources in the appropriate Gear, Buff, attack Effects or notes
field and resolve them manually. Type-specific Resistance halves applicable
damage, Vulnerability doubles it, and Immunity reduces it to zero and prevents
additional effects arising from that damage. Armor-Piercing ignores DR;
Anti-Piercing allows the crawler's DR to apply against Armor-Piercing damage.
For attacks with multiple damage types, split damage evenly by type before
applying relevant type-specific mitigation. Record attack damage types and
properties in Effects. The sheet does not resolve incoming damage automatically.

Official damage types: Acid, Bludgeoning, Electric, Fire, Force, Holy, Ice,
Necrotic, Piercing, Poison, Psychic, Slashing and Sonic.

### Skills
Starts with 24 rows, add more as needed: Skill Advancement mark, Name, Rank,
Stat, automatically derived **Stat Mod**, Check Type (Unopposed / Opposed /
Passive / Evade) and Notes & Upgrades. Rank is tracked separately from Stat Mod.
The Rank column carries a −/+ grinding tally that raises the Rank automatically
once it reaches the current Rank value. Use a row's **Details** button for a full
Skill description, Rank Upgrades and extended or homebrew notes.

### Spells
Starts with 8 rows, add more as needed: Name, Rank, Type / Traits, **Mana Cost**,
Range, Duration and Cooldown. The Rank column carries a −/+ grinding tally that
raises the Rank automatically once it reaches the current Rank value. Mana Cost
is a text field because a Spell may have a fixed, variable or no Mana cost. Use a row's **Details** button for
Description / Effect, Base Damage / Healing, Limitations / Targeting, Rank
Upgrades and Additional Notes. Spells remain Skills mechanically; the separate
tab is a reference area for Spell-specific information. A Spell must also be
placed in the Hotlist for combat or other stressful situations, and Attack Spell
combat details belong under Attacks. Mana spending, Attack Skill Checks, casting,
targeting, cooldowns and effects remain manual, and Scroll Spells can be recorded
with no Mana cost.

### Companions
Starts with one blank entry and allows any number of Pets, Mounts, Vehicles or
homebrew companions. Pet records follow the official companion fields with ten
Health Bar slots, HB Value, five Stats, Level, DR, Evade, Move, Size, two Attacks
and Special. Mount and Vehicle records provide Size, Occupants, Move, DR,
Accessories and rider benefits or restrictions. A Pet may be marked Rideable to
show both profiles in one record. Bonded status, portrait, description, abilities,
equipment, conditions, carrier/storage and notes are tracked manually. The sheet
does not calculate companion values or enforce a limit on how many a crawler may
record; the applicable Skill, Class, item and GM rules decide what is allowed.

### Inventory
Starts with 36 rows of UI space, not a game-rule capacity; add more as needed.
Stored Inventory is not limited by encumbrance. Item, Qty and Notes are tracked
manually, and no maximum is imposed on Inventory Qty. Items stored only in
Inventory do not grant Gear bonuses.

### Gear
- The Gear area follows the official Gear Slots / Tattoos / Patches layout:
  Head, Torso, Arms, Hands / Holding, Legs, Feet and Accessories. Record Gear,
  Tattoos and Patches according to the Gear Slot they occupy or modify.
- Each normal field records the item currently occupying that Gear Slot;
  Accessories provide 10 individually numbered Gear Slots.
- Equipped Gear may grant its listed benefits. Gear bonuses and effects are
  applied manually; items stored only in Inventory or Hotlist do not grant them.

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
| ? (Help) | Open the Help dialog listing the `%` codes usable in text fields. |
| Language selector | Switch the interface language. |
| Dark / Light | Toggle the colour theme. |
| Import | Load a previously exported `*-sheet.json` file as a new Vault crawler. |
| Export JSON | Download the current crawler as JSON. |
| Print | Print the current section or the complete crawler dossier. |
| Vault | Create, switch, duplicate, rename, group or delete local crawlers. |
| Reset | Clear every field. This cannot be undone — export first. |

---

## Data & privacy

- Everything lives in your browser's `localStorage`. The Vault uses
  `dcsheet.vault.v1`; the active crawler is also mirrored to `dcsheet.v1` for
  backwards compatibility. Theme and language use separate keys.
- No account, no network requests, no analytics. The sheet never sends your data
  anywhere.
- Clearing your browser data, using private browsing, or switching browsers means
  a fresh sheet — use **Export JSON** to keep a backup.

---

## Tech notes

- One app file: HTML + CSS + vanilla JavaScript.
- No production dependencies or build step. The repeating parts of the sheet (stat cards,
  table rows, journal pages, tab bar, translations) are generated at load time.
- Fields are bound by a `data-k` attribute to a flat key (e.g. `stats.STR.enh`);
  export nests these into a `character` object and also keeps the flat map.
- Saves and exports use schema version 2. Spell rows are stored under `spells.*`
  and Companion rows under `companions.*`, with their row counts in `counts`;
  older saves without those keys open with 8 blank Spell rows and one blank Pet
  entry. Version 1 attacks with a single `statA` remain
  compatible and initialize both Hit Stat and Damage Stat from that value.
  Grinding tallies are stored per row (`*.grind`) and as `identity.grind`; saves
  without them open at 0. `%` codes in text fields are stored as the raw text, so
  no schema change is involved.

## Development checks

With Node.js 24 LTS (24.15+) installed, run `npm ci` then `npm test`.
These checks exercise the real page in a DOM environment, including save/import
and Vault behavior. They do not simulate browser layout. Development dependencies
are only for tests; opening `index.html` still needs no installation.

For visual checks, serve the repository locally (`python3 -m http.server 8000`)
and open `http://localhost:8000/tests/layout.html`, then click **Load sheet**.
The harness offers phone/desktop viewport widths and a print-CSS preview without
pagination. Check actual A4 pagination separately through the sheet's own Print
dialog. See [the Health and Mana checklist](tests/HEALTH-MANA-CHECKLIST.md) and
[the Companion checklist](tests/COMPANION-CHECKLIST.md).
