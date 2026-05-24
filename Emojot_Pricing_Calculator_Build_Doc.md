# Emojot Pricing Calculator — Complete Build Documentation
**Version:** 1.0 | **Currency:** USD only | **Status:** Ready for development

---

## Purpose

This document is the single source of truth for building the Emojot end-to-end pricing calculator. It covers all pricing logic, rules, tier structures, slab calculations, add-ons, and UX requirements. No external references needed — everything required to build the calculator is here.

---

## Products Covered

| Code | Full Name |
|---|---|
| XM | Experience Management |
| CCM | Customer Complaints Management |
| ORM | Online Reputation Management |
| SLT | Social Listening & Tracking |
| UXI | Unified Experience Intelligence (combined product) |

---

## Global Rules

### Billing Cycle Surcharge
Applied as a percentage on top of the total monthly-equivalent price for all modules.

| Billing cycle | Surcharge |
|---|---|
| Annual | +0% — this is the base rate |
| Quarterly | +7.5% |
| Monthly | +10% |

**Implementation note:** Always calculate the base annual monthly price first, then apply the surcharge multiplier. Display both the base and the surcharge-adjusted price clearly.

### Currency
USD only in this version. LKR to be added in a future version.

### Rounding
All prices displayed to 2 decimal places. Intermediate calculations can carry full precision; round only at display.

---

## Module 1: XM — Experience Management

### Overview
XM collects customer experience data via digital sensors (surveys) deployed at client touchpoints. A touchpoint is a unique hierarchy node in the client's organizational structure (e.g. branch, department, sub-department). Sensors and touchpoints are independent limits — a single sensor can serve multiple touchpoints via URL-encoded metadata.

### Base Tiers

| | Basic | Standard | Enterprise |
|---|---|---|---|
| Monthly base price (USD) | $50 | $250 | $1,000 |
| Sensors (surveys) included | 1 | 5 | Custom |
| Touchpoints (hierarchy nodes) included | 5 | 25 | 100 |
| Dashboards included | 1 | 2 | Custom |
| Brand personalization | Add-on | Add-on | Included |
| Emosight AI | Add-on | Included | Included |
| Role-based user accounts / alert receivers | 5 | 25 | As needed |
| Role-based sensor launch portals | 1 | Unlimited | Unlimited |
| PS hours / month (with rollover) | 1 | 2 | 5 |
| Comm Center (email sending API) | Included | Included | Included |
| Data retention for email activities | 6 weeks | 6 weeks | 6 weeks |
| SMS deployments | Unlimited (country-specific per-SMS rates apply, post-paid) |

### Touchpoint Slab Pricing
When the client's total touchpoint (hierarchy node) count exceeds their tier's included amount, additional nodes are charged using this slab structure. The slab applies to the total node count — not just the excess.

**Slab table:**

| Total node count | Rate per node / month |
|---|---|
| 1 – 55 | $10.00 |
| 56 – 105 | $5.00 |
| 106 – 200 | $2.50 |
| 201+ | Custom quote required — do not auto-calculate |

**Calculation logic:**
- If total nodes ≤ tier inclusion: touchpoint charge = $0
- If total nodes > tier inclusion AND total nodes ≤ 200: apply slab rate to ALL nodes (not just excess), then subtract the tier base fee allocation. 

**Simplest correct implementation:** 
  - Determine which slab band the total node count falls into
  - Multiply total nodes × slab rate
  - This gives the standalone touchpoint cost
  - The base tier fee covers the platform license; touchpoint cost is additive

**Example:**
- Client on Standard (25 nodes included), needs 80 nodes total
- 80 nodes falls in the 56–105 band → 80 × $5.00 = $400/month touchpoint charge
- Total = $250 (base) + $400 (touchpoints) = $650/month

**Above 200 nodes:** Calculator should display a "Contact sales for Enterprise quote" message and stop calculating. Do not show a price.

### XM Add-ons

| Add-on | Unit | Price |
|---|---|---|
| Touchpoints (10x bundle) | Per bundle | $380 |
| Additional sensor | Per sensor / month | $50 |
| Additional dashboard | Per dashboard / month | $20 |
| Brand personalization | Per brand / month | $10 |
| Emosight AI | Per account / month | $30 |
| Role-based user account | Per user / month | $2 |
| Role-based dynamic alert receiver | Per receiver / month | $0.50 |
| Emails: 10,000 / month | Per block / month | $20 |
| Emails: 50,000 / month | Per block / month | $75 |
| SMS Sender ID | One-time (SL only) | $100 |
| Domain whitelisting | Per domain / month | $30 |

---

## Module 2: CCM — Customer Complaints Management

### Overview
CCM collects customer complaint data and routes it through configurable complaint management workflows. Same sensor and touchpoint model as XM — sensors and touchpoints are independent limits.

### Base Tiers

| | Basic | Standard | Enterprise |
|---|---|---|---|
| Monthly base price (USD) | $80 | $300 | $1,000 |
| Sensors (surveys) included | 1 | 5 | Custom |
| Touchpoints (hierarchy nodes) included | 5 | 25 | 100 |
| Dashboards included | 1 | 2 | Custom |
| Workflows included | 1 | 2 | Custom |
| Brand personalization | Add-on | Add-on | Included |
| Emosight AI | Add-on | Included | Included |
| Role-based user accounts / alert receivers | 5 | 25 | As needed |
| Role-based sensor launch portals | 1 | Unlimited | Unlimited |
| PS hours / month (with rollover) | 1 | 2 | 5 |
| Comm Center (email sending API) | Included | Included | Included |
| Data retention for email activities | 6 weeks | 6 weeks | 6 weeks |
| SMS deployments | Unlimited (country-specific per-SMS rates apply, post-paid) |

### Touchpoint Slab Pricing
Identical to XM. Apply the same slab table and calculation logic as defined in Module 1.

### CCM Add-ons

| Add-on | Unit | Price |
|---|---|---|
| Additional workflow | Per workflow / month | $30 |
| Touchpoints (10x bundle) | Per bundle | $380 |
| Additional sensor | Per sensor / month | $50 |
| Additional dashboard | Per dashboard / month | $20 |
| Brand personalization | Per brand / month | $10 |
| Emosight AI | Per account / month | $30 |
| Role-based user account | Per user / month | $2 |
| Role-based dynamic alert receiver | Per receiver / month | $0.50 |
| Emails: 10,000 / month | Per block / month | $20 |
| Emails: 50,000 / month | Per block / month | $75 |
| SMS Sender ID | One-time (SL only) | $100 |
| Domain whitelisting | Per domain / month | $30 |

---

## Module 3: ORM — Online Reputation Management

### Overview
ORM monitors and manages online reviews across platforms. A location is a physical place tied to a Google Place ID or Facebook listing. ORM locations are a completely separate concept from XM/CCM touchpoints and are not interchangeable.

Connection types — admin (direct Google/FB API connection) and non-admin (scraper-based, including other review platforms) — are priced at the same rate.

There is no setup fee.

### Tier Structure
Each tier has a base fee that covers a minimum number of locations. Slab pricing applies only to locations beyond the included minimum. The slab rates differ by tier — higher tiers get lower per-location rates at equivalent volume, reflecting the higher value delivered per location.

### Tier Definitions and Feature Gates

| Feature | Basic | Standard | Premium |
|---|---|---|---|
| Monthly base fee (USD) | $50 | $250 | $500 |
| Locations included in base | 5 | 25 | 100 |
| Review sites supported | Google + Facebook | Google + Facebook | Google, Facebook + other platforms |
| Role-based user accounts | 2 | 2 | 5 |
| PS hours / month (with rollover) | 1 | 2 | As needed |
| Review analytics + sentiment analysis | Yes | Yes | Yes |
| Individual review response | Yes | Yes | Yes |
| AI-driven response suggestions | Yes | Yes | Yes |
| Response templates | Yes | Yes | Yes |
| Weekly review alert email | Yes | Yes | Yes |
| ML-based review categorization | Yes | Yes | Yes |
| Comprehensive drill-down & trend analytics | Yes | Yes | Yes |
| Multi-location rolled-up analytics | No | Yes | Yes |
| Configurable category-based alerts | No | Yes | Yes |
| Bulk response with automation rules | No | Yes | Yes |
| Ticket creation and management | Add-on | Yes | Yes |
| Competitor analysis (2 competitors included) | No | Add-on ($100/mo) | Included |
| Additional competitor location | Not available | $15 / location / month | $15 / location / month |

### Per-Location Slab Pricing (beyond included minimum)
Rates differ by tier. Apply the rate for the band that the client's TOTAL location count falls into.

**Basic tier slab rates:**

| Total locations | Rate per location / month |
|---|---|
| 1 – 10 | $10.00 |
| 11 – 30 | $8.33 |
| 31 – 50 | $7.00 |
| 51 – 100 | $4.00 |
| 101 – 150 | $3.00 |
| 151 – 200 | $2.50 |
| 201 – 300 | $2.00 |
| 301 – 400 | $1.75 |
| 401 – 500 | $1.60 |
| 501 – 1,000 | $1.50 |

**Standard tier slab rates (~15% lower than Basic at each band):**

| Total locations | Rate per location / month |
|---|---|
| 1 – 25 | Included in base |
| 26 – 50 | $5.95 |
| 51 – 100 | $3.40 |
| 101 – 150 | $2.55 |
| 151 – 200 | $2.13 |
| 201 – 300 | $1.70 |
| 301 – 400 | $1.49 |
| 401 – 500 | $1.36 |
| 501 – 1,000 | $1.28 |

**Premium tier slab rates (~25% lower than Basic at each band):**

| Total locations | Rate per location / month |
|---|---|
| 1 – 100 | Included in base |
| 101 – 150 | $2.25 |
| 151 – 200 | $1.88 |
| 201 – 300 | $1.50 |
| 301 – 400 | $1.31 |
| 401 – 500 | $1.20 |
| 501 – 1,000 | $1.13 |

**Calculation logic:**
- Locations up to the tier's included minimum: no additional charge (covered by base fee)
- Locations beyond the minimum: determine which slab band the TOTAL location count falls into, multiply ALL locations beyond the minimum by that rate
- Base fee + (excess locations × slab rate) = total ORM monthly

**Example (Standard tier, 80 locations):**
- Base: $250 (covers 25 locations)
- Excess: 80 − 25 = 55 locations
- 80 total falls in the 51–100 band → rate = $3.40
- Touchpoint charge: 55 × $3.40 = $187
- Total: $250 + $187 = $437/month

### ORM Add-ons

| Add-on | Unit | Price |
|---|---|---|
| Additional location + role-based user | Per location / month | $25 |
| Competitor location | Per location / month | $15 |
| Role-based user account | Per user / month | $2 |
| Ticket creation and management (Basic tier only) | Per account / month | TBD — show "contact sales" |

---

## Module 4: SLT — Social Listening & Tracking

### Overview
SLT monitors social media and web mentions based on tracked keywords. Pricing is keyword-based. Competitor tracking consumes from the keyword quota — it is not a separate charge. Mentions are included per tier; additional mention bundles are available as add-ons.

### Base Tiers

| | Basic | Standard | Enterprise |
|---|---|---|---|
| Monthly base price (USD) | $130 | $225 | $600 |
| Keywords included | 5 | 10 | 25 |
| Mentions / month included | 10,000 | 20,000 | 120,000 |
| Social media profile count | 30 | 50 | 100 |
| Listening channels | Facebook, Twitter/X, Instagram, YouTube, TikTok, LinkedIn, Web, Reddit (all tiers) |
| Role-based user accounts | 5 | 10 | As needed |
| PS hours / month (with rollover) | 1 | 2 | 4 |
| Sentiment analysis of mentions | Yes | Yes | Yes |
| Comprehensive drill-down & trend analytics | Yes | Yes | Yes |
| Weekly email reports to users | Yes | Yes | Yes |
| Mention storm monitoring / crisis alerts | Yes | Yes | Yes |
| AI-driven top-5 posts analysis | Yes | Yes | Yes |
| ML-based posts categorization | Yes | Yes | Yes |
| Competitor tracking (uses keyword quota) | Yes | Yes | Yes |
| Mention flagging / ticket management | Add-on | Add-on | Included |

### SLT Add-ons

| Add-on | Unit | Price |
|---|---|---|
| Additional keyword | Per keyword / month | $15 |
| Additional 10,000 mentions | Per block / month | $12 |
| Additional 10 SM profiles | Per block / month | $15 |
| Mention flagging / ticket management | Per account / month | $50 |
| YouTube AI search | Per account / month | $50 |
| Role-based user account | Per user / month | $2 |
| PS hours | Per hour | $20 |

---

## Module 5: UXI — Unified Experience Intelligence

### Overview
UXI is the combined product. Clients select any combination of XM, CCM, ORM, and SLT modules. Each module is independently configured at any tier. Pricing is the straight sum of all selected modules plus their add-ons. There is no bundle discount.

### What UXI Adds (value over standalone modules)
- Unified cross-module analytics dashboard
- Cross-module data correlation (e.g. ORM review sentiment correlated with XM survey scores)
- Single login and user management across all modules
- Unified alerting and reporting

These are product features — not reflected as a price premium. UXI is priced identically to buying the modules separately.

### Composition Rules
- Any module can be included or excluded independently
- Any tier can be chosen per module — no requirement to match tiers across modules
- All module-level add-ons are available
- Billing cycle surcharge applies once to the total UXI invoice

### Calculation Logic

```
UXI Total (base) = 
  [XM base fee + XM touchpoint slab cost + XM add-ons]  (if selected)
  + [CCM base fee + CCM touchpoint slab cost + CCM add-ons]  (if selected)
  + [ORM base fee + ORM location slab cost + ORM add-ons]  (if selected)
  + [SLT base fee + SLT add-ons]  (if selected)

UXI Total (billed) = UXI Total (base) × billing cycle multiplier
  Annual:    × 1.00
  Quarterly: × 1.075
  Monthly:   × 1.10
```

---

## Calculator UX Requirements

### Structure
The calculator should be a single-page application. No page reloads. All pricing updates in real time as inputs change.

### Flow
1. **Module selection** — User checks which modules they want (XM, CCM, ORM, SLT). They can select one or multiple. Selecting multiple implies UXI.
2. **Per-module configuration** — For each selected module, user configures:
   - Tier selection
   - Variable inputs (touchpoints, locations, keywords as applicable)
   - Add-on selections with quantities
3. **Billing cycle selection** — Single selector applies to all modules
4. **Summary panel** — Always visible. Shows line-by-line breakdown and total.

### Per-module inputs

**XM:**
- Tier selector (Basic / Standard / Enterprise)
- Total touchpoints needed (numeric input) — if >200, show "contact sales" flag
- Number of additional sensors needed beyond tier inclusion (numeric)
- Number of additional dashboards (numeric)
- Brand personalization: yes/no + number of brands
- Emosight AI: yes/no (auto-included for Standard and Enterprise)
- Additional user accounts (numeric)
- Additional alert receivers (numeric)
- Email add-on: none / 10K / 50K
- Domain whitelisting: yes/no

**CCM:**
- Tier selector (Basic / Standard / Enterprise)
- Total touchpoints needed (numeric input) — same 200-node rule
- Additional workflows beyond tier inclusion (numeric)
- Additional sensors (numeric)
- Additional dashboards (numeric)
- Brand personalization: yes/no + number of brands
- Emosight AI: yes/no
- Additional user accounts (numeric)
- Additional alert receivers (numeric)
- Email add-on: none / 10K / 50K
- Domain whitelisting: yes/no

**ORM:**
- Tier selector (Basic / Standard / Premium)
- Total locations (numeric input)
- Connection type: admin / non-admin (informational only — same price)
- Competitor locations: yes/no + count (Standard and Premium only)
- Additional user accounts (numeric)

**SLT:**
- Tier selector (Basic / Standard / Enterprise)
- Additional keywords beyond tier inclusion (numeric)
- Additional mention blocks (10K each) (numeric)
- Additional SM profile blocks (10 each) (numeric)
- Mention flagging / ticket management: yes/no (auto-included for Enterprise)
- YouTube AI search: yes/no
- Additional user accounts (numeric)
- PS hours: numeric

### Summary Panel Requirements
- Show each selected module as a section
- Within each module section, show: base fee, variable cost (touchpoints/locations), add-on costs, module subtotal
- Show billing cycle surcharge as a separate line
- Show grand total (monthly equivalent and annual total)
- If any module has a "contact sales" condition triggered, disable the grand total and show a message: "One or more modules require a custom quote. Please contact sales."
- Show a clear label indicating whether the price shown is the annual monthly rate or the billed amount after surcharge

### Edge Cases to Handle
- User selects Enterprise tier for XM or CCM: touchpoint field becomes "Custom — contact sales" and no touchpoint cost is calculated (it's baked into the $1,000 Enterprise fee)
- User enters 0 for any add-on quantity: that line should not appear in the summary
- User selects ORM Basic and wants ticket management: show "contact sales" for that line item
- User selects SLT Enterprise: mention flagging is auto-included, do not show it as an add-on option
- User selects only one module: do not label it as UXI. Label it as the module name only. UXI label appears only when 2+ modules are selected.

---

## Pricing Quick Reference

| Module | Tier | Base/mo |
|---|---|---|
| XM | Basic | $50 |
| XM | Standard | $250 |
| XM | Enterprise | $1,000 |
| CCM | Basic | $80 |
| CCM | Standard | $300 |
| CCM | Enterprise | $1,000 |
| ORM | Basic | $50 (5 locations) |
| ORM | Standard | $250 (25 locations) |
| ORM | Premium | $500 (100 locations) |
| SLT | Basic | $130 |
| SLT | Standard | $225 |
| SLT | Enterprise | $600 |

---

## Open Items (resolve before or during build)

| # | Item | Owner |
|---|---|---|
| 1 | ORM ticket management add-on price for Basic tier | Emojot pricing team |
| 2 | Confirm ORM slab rates for Standard and Premium tiers (proposed rates in this doc — pending sign-off) | Emojot pricing team |
| 3 | LKR pricing — separate pass after USD calculator is live | Emojot pricing team |
| 4 | SMS per-country rates for XM and CCM — needed if calculator is to include SMS cost estimates | Emojot pricing team |
