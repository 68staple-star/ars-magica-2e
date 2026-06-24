# ars-magica-2e

Ralph's take on Ars Magica 2e for Foundry for the occasional Tuesday night game.

## Player Quick Start

1. Open your character sheet — tabs mirror the paper character sheet: **Character**, **Abilities**, **Virtues & Flaws**, **Combat**, and **Magic** (magus only).
2. Click characteristic labels, ability rows, arts grid cells, or combat totals to roll stress dice to chat.
3. Drag spells, weapons, virtues, and armor from the system compendiums onto the matching sheet tab.
4. Use header quick-link buttons once journal UUIDs are configured (see GM setup below).

## GM Setup (one-time per world)

1. **Install the system** in Foundry v11 and create or open your world.
2. On first load as GM, empty compendiums auto-seed with sample spells, weapons, virtues/flaws, and journal references.
3. **Import journals into your world** (recommended):
   - Open Compendiums → **Rules Reference**, **Covenant Template**, or **Order of Hermes**
   - Right-click an entry → **Import**
4. **Link journals to characters**:
   - Copy the `@UUID[...]` from an imported journal entry
   - Paste into the character sheet **Reference Links** fields (Covenant, Rules, Order)
   - Covenant name in the header band links narratively; the UUID powers the quick-link button
5. **Covenant chronicle**: Import the Covenant Template journal, rename it for your saga, and share the UUID with players.

## Compendium Packs

| Pack | Contents |
|------|----------|
| Sample Spells | Starter formulaic spells with mechanical stats |
| Weapons & Armor | Common weapons and armor from the Combat chapter |
| Virtues & Flaws | Catalog entries from Core, Covenants, and Order supplements |
| Rules Reference | Player cheat sheet for dice, combat, and casting |
| Covenant Template | Structured covenant worksheet |
| Order of Hermes | Houses and Tribunal overview |
| Ability Reference | Ability category guide |

Compendium entries contain **mechanical summaries only** — expand journal pages from your rulebooks as needed.

## Character Wizard

The sheet header **Character Wizard** button runs a five-step forge:

1. Identity & attributes (covenant, gender, year born, personality)
2. Abilities
3. Virtues & flaws (companions and magi; grogs skip)
4. Hermetic apprenticeship (magi only)
5. Summary & commit

Import spells and virtues directly from compendiums during steps 3–4.

## Development

Seed data lives in `src/compendium-data/`. The GM-only `modules/compendium/seed.js` hook populates empty packs on first `ready`.
