# ADR 0003: Setup fees are based on raw module subtotals, not discounted prices

## Status
Accepted

## Context
Setup fees are one-time onboarding charges, calculated as a percentage of the annual subscription value (currently 20%). The calculator also supports Discount Presets (ADR 0002) that reduce the recurring monthly base total before the billing-cycle surcharge is applied.

When setup fees were introduced, a design decision was required: should the Discount Preset also reduce the setup fee base, or should setup fees always be calculated on the raw (undiscounted) module subtotal?

Two options were considered:

- **Option A (chosen):** `setupFee = moduleSubtotal × 12 × SETUP_FEE_RATE` — discount ignored, raw subtotal only.
- **Option B (rejected):** Prorate the global discount across each module's subtotal before calculating the setup fee.

## Decision
Setup fees are calculated using the **raw module subtotal**, before any Discount Preset is applied.

## Consequences
- A customer receiving a 25% Pilot discount still pays the full (undiscounted) setup fee.
- Setup fees are consistent and predictable — they depend only on what the customer is buying, not on the negotiated recurring discount.
- This reflects the intent: setup fees cover onboarding and implementation work, which is independent of the commercial discount offered on recurring fees.
- Option B was rejected because prorating a global discount across per-module setup fees adds complexity with no meaningful business benefit.
