# Theme Default Fix + Advisor-Grade Mortgage Calculator

**Date:** 2026-05-06
**Author:** Usama Khalid (Sykon Properties)
**Status:** Approved — ready for implementation plan
**Baseline commit:** `563e03f` (Add 10 premium features)

## Goals

1. Fix the inconsistent theme on first load — default to light, surface dark mode via a one-time blue toast.
2. Add a UAE-aware, advisor-grade mortgage calculator with affordability discovery and contextual financing snapshot.

## Non-goals

- No backend, no API, no authentication. Single-file HTML preserved.
- No new external dependencies.
- No changes to map markers, area dataset, or existing premium features beyond reusing marker-dim infrastructure.

---

## Section 1 — Theme default & "Dark mode available" toast

### Behavior

- Default theme on first load: **light**.
- On first visit only (localStorage `sk_seen_theme_hint` absent), a blue toast appears 1s after page load.
- Toast position: top-right, anchored under the theme toggle button, with a small triangle pointer aimed at the toggle.
- Content: "Dark mode available" + Switch button + ✕ close.
- Auto-dismiss after 7s with a thin progress bar at the bottom of the toast.
- Keyboard shortcut: `Shift+D` toggles theme globally.
- After first dismissal (button, ✕, or auto-timeout), set `sk_seen_theme_hint=1` so toast never reappears.
- Existing `sk_theme` localStorage key still wins if user has already set a preference. Toast appears only when neither key is set.

### Visual

- Background: blue gradient `#2563eb → #1e40af`, white text.
- 12px radius, soft shadow, 280px wide.
- Slides in from right, 200ms ease-out.
- Switch button: white pill, blue text. ✕: subtle.

### Edge cases

- Returning user with saved theme → no toast.
- `prefers-color-scheme: dark` → still default to light per product decision; toast hints dark.

---

## Section 2 — Mortgage system architecture (3 layers)

### Layer 1 — Financing Snapshot card

Inside the area detail right rail, when an area is selected:

```
┌─ Financing Snapshot ─────────┐
│  Avg unit ~ AED 2.4M          │
│  Monthly: AED 11,200          │
│  5yr ROI: +52%                │
│  [Buy] [Invest]   Open full → │
└──────────────────────────────┘
```

- Live updates as the user switches areas.
- "Open full" deep-links into the modal pre-filled.

### Layer 2 — Unified Calculator modal

Replaces existing ROI button. Top tab strip: **Mortgage · ROI · Affordability**.

- Cross-tab persistent state: `price`, `downPaymentPct`, `rate`, `term`, `buyerType` stay synced across tabs.
- Modal width on desktop: 760px (to fit amortization table).
- Mobile: tabs become horizontal scroll; existing bottom-sheet behavior preserved.

### Layer 3 — Deep linking

- URL hash supports `#calc=mortgage&area=marina` so links can be shared.
- "Open full" button on snapshot card sets hash → opens modal on right tab pre-filled.

---

## Section 3 — Mortgage tab (advisor-grade, UAE-aware)

### Inputs

- **Buyer type toggle**: Resident · Non-resident · Cash. Sets minimum down %, hides loan-only rows when Cash.
- **Property price** (AED) — auto-filled from selected area's avg, editable.
- **Down payment %** slider:
  - Resident, price < 5M AED → min 20%
  - Resident, price ≥ 5M AED → min 30%
  - Non-resident → min 25%
  - Cash → 100% (locked)
  - AED equivalent shown alongside %.
- **Interest rate %** (default 4.5%, editable). Hidden for Cash.
- **Term (years)** 5–25, default 20. Hidden for Cash.

### Outputs — Three result blocks

**1. Monthly Breakdown** (hero card)
- Monthly payment (large)
- Principal/Interest split bar
- Total interest paid over life of loan

**2. Cash Required to Close** (the killer feature)
- Down payment
- DLD transfer fee — 4% of price
- DLD admin fee — fixed AED 580
- Agency fee — 2% of price + 5% VAT on the fee
- Mortgage registration — 0.25% of loan + AED 290 (Cash: skipped)
- Bank processing fee — 1% of loan, capped at AED 8,000 (Cash: skipped)
- Property valuation — fixed AED 3,000 estimate (Cash: skipped)
- **Total cash needed at signing** (highlighted in gold)

**3. Annual Costs** (collapsed by default)
- Service charges (estimate, area-dependent)
- Property life insurance — ~0.4% of loan/yr (Cash: skipped)
- Property insurance — ~0.05% of value/yr

### Amortization schedule

- Collapsible, hidden by default.
- Year-by-year table: Year · Beginning balance · Interest paid · Principal paid · Ending balance.
- Mini sparkline at top of table.

### Export

- "Save as PDF" button reuses existing print infrastructure.
- Output is a one-pager designed to be screenshot-friendly for WhatsApp share.

---

## Section 4 — Affordability tab (the differentiator)

### Inputs

- Monthly budget (AED slider)
- Down payment available (AED slider)
- Buyer type (carries over from Mortgage tab)
- Rate / term (carries over)

### Outputs

- Computed max affordable price = `solveMortgage(budget, rate, term) + downPayment`.
- **Map effect**: non-matching markers fade to 20% opacity; matching markers pulse gold. Reuses Feature 4 dim infrastructure.
- **List inside modal**: ranked by best fit (closest to budget without overshoot). Each row: area name · avg price · monthly payment. Click to focus marker.
- "Clear" button restores all markers.
- Affordability filter persists for the session if user closes the modal. A small chip in the topbar shows "Affordable view active · Clear" so context is preserved.

---

## Section 5 — ROI tab

Preserve existing ROI calculator. Changes:
- Lives inside the unified modal as the second tab.
- Reads price / down payment / rate from shared state if user was on Mortgage tab first.
- Adds a "Includes mortgage interest cost" toggle so ROI can subtract loan interest for realistic net ROI.

---

## Section 6 — Code organization

Single file (`Dubai Property Map.html` + mirrored `index.html`). New code organized as:

### CSS additions (~120 lines)
- `.theme-toast` — blue toast, pointer triangle, progress bar
- `.calc-tabs` — tab strip
- `.fin-snapshot` — snapshot card in detail panel
- `.amort-table`, `.cash-needed` — mortgage tab styles
- `.affordability-chip` — topbar chip when filter active

### HTML additions
- `<div id="theme-toast">` below topbar
- Snapshot card slot inside detail right rail
- Calculator modal restructured with tab strip + 3 panels

### JS additions (~400 lines)
- `initThemeOnLoad()` — set light default, attach Shift+D handler, decide toast
- `showThemeToast()` / `dismissThemeToast()`
- Calculator state object: `{ price, downPct, rate, term, buyerType }`
- `openCalc(tab, areaId)` — single entry, accepts tab + optional area
- `calcMortgage(state) → { monthly, totalInterest, schedule[] }`
- `calcCashToClose(state) → { dld, agency, mortgageReg, bankFee, valuation, total }`
- `calcAffordability(state) → { maxPrice, matchingAreas[] }`
- `renderSnapshot(area)` — Layer 1 card
- `applyAffordabilityFilter()` / `clearAffordabilityFilter()`
- `hashRouter` — `#calc=mortgage&area=marina` deep link

Total estimated added code: ~520 lines. Existing ROI logic refactored, not rewritten. No new dependencies.

---

## Section 7 — Rollout (each step a separate revertable commit on `main`)

1. Theme default + toast (small, isolated).
2. Calculator modal restructure to tabbed (visual refactor only — behavior preserved).
3. Mortgage tab implementation.
4. Cash-to-close + amortization.
5. Affordability tab.
6. Layer 1 snapshot card + deep linking.
7. Mirror `Dubai Property Map.html` → `index.html`, push to GitHub.

If anything goes wrong, `git revert <commit>` undoes that single step.

---

## Acceptance criteria

- First-time visitor sees light theme by default with a blue toast under the theme toggle, auto-dismissing in 7s.
- Returning visitor with saved theme sees no toast.
- `Shift+D` toggles theme from anywhere on the page.
- Selecting any area shows a Financing Snapshot card with monthly mortgage and 5yr ROI.
- Clicking "Open full" on the snapshot opens the Calculator modal pre-filled with that area on the appropriate tab.
- Mortgage tab correctly computes monthly payment, total interest, and full cash-to-close itemization with UAE fees per buyer type.
- Cash buyer type hides loan-only rows and locks down payment to 100%.
- Affordability tab dims non-matching map markers and shows ranked list inside modal.
- Affordability filter persists with a topbar chip after modal is closed.
- Deep-link URL `#calc=mortgage&area=marina` opens modal on Mortgage tab with Marina pre-filled.
- All changes mirror to `index.html` for GitHub Pages.
- No new external dependencies introduced.
- Each step is committed separately for granular rollback.
