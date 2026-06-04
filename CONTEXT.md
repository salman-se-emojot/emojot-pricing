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
