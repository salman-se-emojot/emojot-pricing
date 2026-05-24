// Calculation engine — orchestrates module calculators and
// applies the billing multiplier to produce the final result set.

import { BILLING_CYCLES } from '../config/pricing.js';
import { MODULE_REGISTRY } from '../modules/registry.js';

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
  const baseTotal = results.reduce((sum, r) => sum + (r.hasContactSales ? 0 : r.subtotal), 0);
  const billedTotal = baseTotal * billing.multiplier;
  const hasAnyContactSales = results.some(r => r.hasContactSales);
  const isUXI = results.length > 1;

  return { results, billing, baseTotal, billedTotal, hasAnyContactSales, isUXI };
}
