// Calculation engine — orchestrates module calculators and
// applies the billing multiplier to produce the final result set.

import { BILLING_CYCLES, DISCOUNTS } from '../config/pricing.js';
import { MODULE_REGISTRY } from '../modules/registry.js';
import { centSum, round2 } from './utils.js';

// Run calculations for all active modules and return a structured result.
export function calculate(appState) {
  const results = [];

  for (const id of appState.activeModules) {
    const mod = MODULE_REGISTRY.find(m => m.id === id);
    if (!mod) continue;
    const moduleState = appState.getModule(id);
    results.push(mod.calculate(moduleState));
  }

  const billing = BILLING_CYCLES[appState.billing];
  const baseTotal = centSum(results.map(r => r.hasContactSales ? 0 : r.subtotal));
  const hasAnyContactSales = results.some(r => r.hasContactSales);

  // Discount — applied to baseTotal pre-surcharge (ADR 0002).
  // Hidden when any module requires contact-sales (no numeric total to discount).
  const discountPreset = (!hasAnyContactSales && appState.discount)
    ? (DISCOUNTS.find(d => d.id === appState.discount) ?? null)
    : null;
  const discountAmount  = discountPreset ? round2(baseTotal * discountPreset.rate) : 0;
  const discountedBase  = round2(baseTotal - discountAmount);

  const billedTotal = round2(discountedBase * billing.multiplier);
  const isUXI = results.length > 1;

  return { results, billing, baseTotal, discountPreset, discountAmount, discountedBase, billedTotal, hasAnyContactSales, isUXI };
}
