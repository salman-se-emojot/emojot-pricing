# ADR 0002 — Discount presets stored in Pricing Config, applied pre-surcharge

**Status:** Accepted  
**Date:** 2026-06-08

## Context

The team requested a discount capability for the pricing calculator. Staff need to apply named, pre-approved percentage discounts (sales rep personal codes at 10%, Partner at 15%, Pilot at 25%) to quotes before presenting them to prospects.

Two architectural questions had genuine trade-offs:

1. **Where should preset definitions live?** — hardcoded in source, or in Pricing Config (editable via Admin Panel)?
2. **Where in the calculation chain should the discount apply?** — to the Base Total (before billing surcharge), or to the Billed Total (after surcharge)?

## Decision

**Presets in Pricing Config.** Discount presets are defined as a `DISCOUNTS` array in `DEFAULT_PRICING_CONFIG` (alongside tiers and slabs), subject to the same Admin Panel override mechanism via `localStorage`. A new sales rep or rate change requires no code deployment or new app release — the Admin Panel edit propagates to that machine immediately.

**Applied to Base Total, pre-surcharge.** The discount multiplier is applied to `baseTotal` before the billing-cycle multiplier runs. The surcharge (quarterly +7.5%, monthly +10%) is then calculated on the already-discounted figure. This matches standard commercial framing: "you get X% off list price; billing cycle terms apply on the reduced price."

## Alternatives considered

- **Hardcoded presets** — rejected because the Electron app requires building and distributing a new `.dmg`/`.exe` for every rep change. The Admin Panel override mechanism already solves this for all other pricing data.
- **Post-surcharge discount** — rejected because it implies the billing surcharge is calculated on full list price and then discounted, which is commercially unusual and harder to explain on a quote.
- **Free-form discount code with server validation** — rejected because the app is local-only with no backend. A free-form code implies validation against something.

## Consequences

- Discount presets follow the same `deepMerge` override pattern as all other Pricing Config data — a machine that has never opened the Admin Panel gets the hardcoded defaults.
- Only one discount may be active per quote (no stacking). This is a deliberate simplification; stacking would require an explicit future decision.
- The discount selector is hidden when any module triggers a contact-sales price, since there is no numeric total to discount.
