# Health and Mana adjustments: branch acceptance

Branch: `feature/health-mana-adjustments`, based on Adam's main at `200fc510`.
Do not merge until the branch has been reviewed and the browser checks below pass.
Use a test crawler; export any real character you plan to test first.

## Automated coverage

`npm ci` then `npm test` (Node.js 24 LTS, 24.15+).

The eleven DOM integration tests execute the real page and cover normal stat
boundaries, the 100% slot bonus, alternate Health stats, fixed-value precedence,
Mana zero and bonuses, validation, reset behavior, autosave/reload, flat and nested
JSON import/export, legacy saves, Vault isolation/duplication, all five languages,
print preparation/cleanup, and unrelated character fields.

These tests stub browser printing and downloads. They do not establish physical
print pagination or browser rendering correctness.

## Manual functional check

1. Set Enhanced CON to **10**, Enhanced CHA to **6**, Enhanced INT to **12**,
   and Current Mana to **8**. All Health slots should show **4**, maximum Mana **12**.
2. Open **Health & Mana adjustments**. In the **100%** group, set **Bonus** to
   **10**. Only that slot should become **14**. CON must remain **10**.
3. Raise Enhanced CON to **20**. The 100% slot should become **15**, all others **5**.
4. Choose **Charisma** as Health stat. With CHA still 6, the 100% slot should be
   **13**, all others **3**. Constitution and other calculations must stay unchanged.
5. Set **Bonus to every Health slot** to **2**: expect **15** at 100% and **5** elsewhere.
   Set that slot's **Fixed slot value** to **21**: expect **21** regardless of bonuses.
   Clear the fixed value: expect **15** again.
6. Set **Bonus to maximum Mana** to **5**: expect **17** maximum and **8** current.
   Set **Fixed maximum Mana** to **0**: expect **0** maximum and **8** current.
   Clear the fixed maximum: expect **17** maximum. Clearing a maximum never spends Mana.
7. Mark a Health slot as lost, then **Reset adjustments**. Expect normal CON-based
   Health and INT-based maximum Mana. The damage mark and Current Mana must survive.
8. Reapply a bonus, wait for autosave, reload, export/import, duplicate the crawler,
   and switch between it and a fresh crawler. Adjustments must follow only that crawler.
9. Import an older save with no adjustments. Normal calculations must still apply.

## Layout and printing

- Test both themes and the language you normally use.
- At 320 and 390 px, expand the controls and scroll through all ten slot groups.
  No field or button should extend sideways out of its card.
- At desktop width, check the Sheet, Attacks, Skills, Spells, Inventory and Journal.
- With the +10 slot bonus active, print the current Sheet section and then the
  complete dossier to **A4, 100% scale**. Use the browser's own print preview.
- Confirm **14** appears at the 100% slot when CON is 10, the adjustment summary
  prints, and editing controls do not appear. Check maximum Mana if adjusted.
- Check page breaks, right-hand edges, and existing populated spell/skill/attack
  details. All seven main sections should be included in the complete dossier.
- Cancel printing and confirm normal tabs, editable fields and adjustment controls
  still work. Test portrait and landscape if those are formats you use.

The optional `tests/layout.html` harness provides real iframe viewport widths and
an A4-width print-CSS preview. Its print preview intentionally does not paginate;
it cannot replace the browser print-preview checks above.
