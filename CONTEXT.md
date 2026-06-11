# Emojot Pricing Calculator — Domain Glossary

## Calculator
The primary interface (`index.html`) where sales/presales staff select modules, compare tiers, and build a monthly pricing estimate for a prospect.

## Admin Panel
The configuration interface (`admin.html`) where pricing data (tiers, slabs, modules) can be overridden. Overrides are stored in `localStorage` and merged with the hardcoded defaults at load time.

## Module
A discrete Emojot product (e.g. XM, CCM, ORM) that can be toggled on/off in the Calculator. Each module has tiers.

## Tier
A pricing level within a Module (e.g. Basic, Standard, Enterprise), each with a base price and included limits.

## Pricing Config
The single source of truth for all pricing data, defined in `js/config/pricing.js`. Admin overrides layer on top via `localStorage` — they do not mutate the source file.

## Desktop App
The Electron-wrapped version of the Calculator distributed to Emojot sales/presales staff as a native `.dmg` (Mac) or `.exe` (Windows) installer.

## Staff
Internal Emojot sales and presales users — the only audience for the Desktop App. Not customers or external parties.

## Discount Preset
A named, pre-approved percentage discount that Staff can apply to a quote. Presets are defined in Pricing Config (alongside tiers and slabs) and are therefore editable from the Admin Panel without a code deployment. Examples: a sales rep's personal code (10%), Partner (15%), Pilot (25%).

## Discount
The single Discount Preset selected for a given quote. Applied to the Base Total before the billing-cycle surcharge is calculated. Only one Discount may be active per quote (no stacking). Defaults to "None". Persisted in the URL hash and included in all exports (receipt and copied text). Hidden when any module in the quote requires a contact-sales price.

## Base Total
The sum of all active module subtotals before any billing-cycle surcharge or Discount is applied.

## Setup Fee
A one-time onboarding charge calculated per module as 20% of that module's annual subscription value (`moduleSubtotal × 12 × 0.20`). Applied to the raw module subtotal — Discount Presets do not reduce it (ADR 0003). Hidden when any module in the quote requires contact-sales pricing. Shown both inside each module's line-item block and as a rolled-up total alongside the monthly/annual totals.
