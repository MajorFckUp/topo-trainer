# Topo Trainer — Design & Plan

## Context
A child in groep 7 (Dutch basisonderwijs) has to learn the Meander (Malmberg) topography page "Gebergten, rivieren en zeeën in Europa" (p. 28–29) for a test: location, names and spelling. The workbook's method is: (1) learn spelling by copying, (2) cover the labelled map and point out every item, (3) cover the list and name every item. We build an interactive app that mirrors these three steps. It's for home use on a **Samsung Galaxy Tab S9 FE** (Android, touch + S Pen), and should be easy to extend with other Meander topo lists later.

Project dir `/Users/martijn.van.beelen/GitHub/topo-trainer` is empty apart from the two photos (no git yet).

## Agreed requirements
- **Items (28):**
  - **Gebergten:** Alpen, Apennijnen⁺, Ardennen, Karpaten⁺, Kaukasus, Pyreneeën, Scandinavisch Hoogland⁺, Schotse Hooglanden⁺, Ural, Vogezen⁺
  - **Rivieren:** Donau, Maas, Po, Rhône, Rijn, Schelde, Seine, Theems, Volga
  - **Zeeën en zeestraten:** Atlantische Oceaan, Het Kanaal, Kaspische Zee, Middellandse Zee, Noordelijke IJszee, Noordzee, Oostzee, Straat van Gibraltar, Zwarte Zee
  - ⁺ = "plus" items. They're hidden by default and shown with a **Plus** toggle.
- **Spelling is lenient:**
  - Case and diacritics are ignored, whitespace is normalised, and a leading "het"/"de" is optional. Aliases are allowed (e.g. "Kanaal").
  - 1–2 letters off (Levenshtein, scaled to word length) counts as "almost".
  - The correct spelling, with accents, is always shown after an answer.
- **Activities:**
  - **Verkennen:** labelled map plus list; tapping either one highlights the matching item.
  - **Aanwijzen:** "Wijs … aan"; the child taps the map.
  - **Benoemen:** an item is highlighted and the child types its name. "Almost" allows one retry. A wrong answer means the child types the correct name over once.
  - **Oefen mijn fouten:** a mix of Aanwijzen and Benoemen over the items not yet mastered.
- **Progress (light):**
  - Saved in localStorage on the device; can be reset on the Voortgang screen.
  - An item is mastered after 2 consecutive first-try correct answers in **both** Aanwijzen and Benoemen.
  - Answers that are wrong, "almost", or right only after a retry reset the streak for that mode.
- **Round end:** score ("24 van 28 goed"), the list of mistakes, and a "Oefen deze fouten" button.
- **UI:**
  - Dutch, landscape, large touch targets.
  - The map has relief shading and no labels, except in Verkennen.
  - The spelling input has autocorrect, autocomplete, autocapitalize and spellcheck **off**.
- **Copyright:** do not reuse the Malmberg scans. The map is drawn from Natural Earth (public domain).

## Architecture
- **Stack:**
  - Vite + React + TypeScript
  - Vitest + Testing Library
  - Playwright
  - `vite-plugin-pwa` (installable, offline)
  - GitHub Pages deploy via a GitHub Actions workflow (set `base` correctly)
- **Map pipeline** (`scripts/build-map.ts`, run manually; outputs committed):
  - **Inputs:** Natural Earth files, cached in a gitignored `scripts/.cache/`:
    - `ne_50m_land`, `ne_50m_admin_0_countries` (borders)
    - `ne_10m_rivers_lake_centerlines` + `ne_10m_rivers_europe`
    - `ne_10m_geography_marine_polys`, `ne_10m_lakes` (Kaspische Zee)
    - `ne_10m_geography_regions_polys` (mountain ranges)
    - the NE shaded-relief raster
  - **Name mapping:** a table maps each `mapFeatureId` to an NE source and name, e.g. `rhone → rivers "Rhône"`, `alpen → regions "ALPS"`.
  - **Overrides:** places NE lacks or draws poorly (expected: Ardennen, Vogezen, Schotse Hooglanden, possibly Schelde and Noordelijke IJszee) come from `scripts/overrides.geojson`, as simplified shapes checked by eye against the book map.
  - **Projection:** d3-geo `geoConicConformal`/Lambert, centred on Europe, clipped to roughly the book's extent (Iceland to the Ural/Caspian, North Africa coast to the Arctic).
  - **Outputs:**
    - `src/data/maps/europe-map.json`: base layers as SVG path strings, plus one feature per id (`path`, `kind: area|line`, `labelPoint`).
    - `public/maps/europe-relief.webp`: the relief raster reprojected per pixel with `projection.invert`.
  - The script **fails** if any mapped feature is missing.
- **Data:**
  - `src/data/types.ts` defines `TopoList { id, title, source, items: TopoItem[] }` and `TopoItem { id, name, category: 'gebergte'|'rivier'|'zee', plus, aliases[], mapFeatureId }`.
  - `src/data/lists/europa-grz.json` holds this list. A new list = a new JSON file plus a registry entry in `src/data/lists/index.ts`.
- **Logic** (pure, unit-tested):
  - `src/logic/spelling.ts`: `normalize()`, `checkAnswer(input, item) → 'correct'|'almost'|'wrong'`
  - `src/logic/quiz.ts`: round engine (shuffled queue, wrong items re-queued 3 positions later, summary)
  - `src/logic/progress.ts`: versioned localStorage key `topo-trainer:v1`, `recordAnswer`, `isMastered`, `unmasteredItems`. Falls back safely if storage is corrupt or unavailable.
- **UI:**
  - `src/map/MapView.tsx` draws:
    - the relief image and base layers
    - per-feature visible shapes, plus a transparent wide stroke as the tap zone for rivers and small areas
    - highlight states (`target`, `correct`, `wrong-reveal`)
    - pinch/pan zoom (`react-zoom-pan-pinch`)
  - Screens in `src/screens/`: Home, Verkennen, Aanwijzen, Benoemen, Resultaat, Voortgang. A simple screen state in `App.tsx`; no router needed.

## Implementation steps
0. Run `git init`. Save the agreed design above to `docs/superpowers/specs/2026-10-12-topo-trainer-design.md` and commit. Then use the **writing-plans** skill to expand the steps below into bite-sized TDD tasks in `docs/superpowers/plans/`, and pick an execution method.
1. Scaffold the Vite React TS app with Vitest, Playwright, ESLint and Prettier; add a `.gitignore` (node_modules, `scripts/.cache`).
2. Add the data types, `europa-grz.json` (28 items, correct Dutch spelling and aliases) and the list registry.
3. Build `spelling.ts` test-first. Cases include:
   - "rhone", "RHÔNE", "pyreneen", "kanaal", "het kanaal", "noordelijke ijszee" → correct
   - "Donua" → almost
   - "Rijn" given for Maas → wrong
4. Build `quiz.ts` test-first (queue order, re-queue, completion, summary).
5. Build `progress.ts` test-first (streaks per mode, mastery rule, reset, corrupt-storage fallback).
6. Write the map build script and overrides, generate the outputs, and add a data-integrity test: every list item has a feature, and ids are unique.
7. Build `MapView`: rendering, highlights, tap zones, pinch-zoom.
8. Build Home (category checkboxes, Plus toggle, activity buttons) and Verkennen.
9. Build Aanwijzen (feedback animation, reveal on wrong).
10. Build Benoemen (lenient check, almost-retry, type-over on wrong, input attributes as specified).
11. Build Resultaat, "Oefen mijn fouten" and Voortgang (check marks, reset with confirmation).
12. Add the PWA manifest and icons, the offline service worker, and the GitHub Pages workflow.
13. Write Playwright e2e tests on a landscape tablet touch viewport approximating the Galaxy Tab S9 FE (about 1334×800 CSS px; confirm on the device): one full round per activity, plus a progress check mark appearing.

## Verification
- `npm test`: unit tests for spelling, quiz and progress, plus the data-integrity test.
- `npm run build:map`: exits with an error if any feature is missing. Visually compare the generated map with the book p. 29 (every item in roughly the right spot, especially the small ones: Schelde, Maas, Ardennen, Vogezen, Straat van Gibraltar).
- `npm run e2e`: the Playwright tablet-viewport tests.
- `npm run build && npm run preview`, then open the preview from the Galaxy Tab on the LAN. Check that:
  - taps and the S Pen work, including tapping thin rivers
  - pinch-zoom works
  - the keyboard doesn't autocorrect
  - "Install app" works and the app works offline afterwards
- Deploy to GitHub Pages and repeat the install check on the tablet.
