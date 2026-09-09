# Companion register manual checklist

Serve the repository locally and test in both light and dark themes. Use a fresh
crawler or export a backup before testing Reset or removal.

## Desktop

- Open **Companions** and confirm one blank Pet entry appears.
- Enter a name and open **Details**. Confirm the ten Health Bar slots, HB Value,
  portrait, five Stats, Level, DR, Evade, Move, Size, Attacks and Special fields
  fit without horizontal page overflow.
- Mark the Pet **Rideable**. Confirm the Mount / Vehicle profile appears in the
  same record, then disappears without losing its values when Rideable is cleared.
- Add Mount, Vehicle and Other records. Confirm each type shows the appropriate
  profile fields.
- Add at least three records, fill their names, then reorder them by dragging and
  with keyboard Arrow Up / Arrow Down on the drag handle.
- Remove a middle record. Confirm the remaining records retain the right values.
  Confirm removing a populated record asks first.
- Add and remove a companion portrait, including drag-and-drop.

## Persistence and transfer

- Reload the page and confirm all companion values, checkboxes, order, expanded
  state-independent data and portraits remain attached to the active crawler.
- Switch crawlers in the Vault and confirm their companion records stay isolated.
- Duplicate a crawler and confirm its companion records are copied independently.
- Export JSON, import it, and confirm every companion record returns.
- Import an older save with no `companions` data and confirm it opens with one
  blank Pet entry without changing the older character data.

## Narrow screens

- At phone width, confirm the summary fields stack without horizontal overflow.
- Open Details and confirm the portrait, text fields and Health Bar slots wrap
  within the viewport.
- Confirm Add, Details and Remove remain tappable.

## Printing

- Print the current Companions tab and the complete dossier to A4/PDF.
- Confirm each kept companion prints with its full details even when collapsed
  on screen.
- Confirm the ten Health Bar slots and all text fields stay within page margins.
- Confirm surplus blank companion entries are omitted, while one blank entry is
  available on an otherwise empty Companions page.
- Confirm other tabs still print correctly and print cleanup restores the normal
  interactive view afterward.

## Languages

- Switch through English, French, Spanish, German and Portuguese.
- Confirm the Companions tab, type choices, buttons and field labels translate,
  and that switching language does not change saved companion values.
