// XM — Experience Management module
// To add an add-on: update render(), mount(), and calculate().
// To change a price: update js/config/pricing.js only.

import { TIERS, PRICES, TOUCHPOINT_SLABS, ENTERPRISE_TOUCHPOINT_SLABS } from '../config/pricing.js';
import { fmt, findSlabRate, round2, centSum } from '../core/utils.js';
import {
  renderTierSelector, renderNumberField, renderRow2,
  renderToggleRow, renderSection, renderAddonsSection,
  bindNum, bindToggle, bindTier,
} from '../components/ui.js';

const ID = 'xm';
const T  = TIERS.xm;

export const xmModule = {
  id: ID,
  shortName: 'XM',
  name: 'Experience Management',
  description: 'Surveys & touchpoints',

  initialState: () => ({
    tier: 'basic',
    touchpoints: 5,
    sensors: T.basic.sensors,
    dashboards: T.basic.dashboards,
    brandOn: false,
    brandCount: 1,
    emosightOn: false,
    domainOn: false,
    users: T.basic.users,
  }),

  render(s) {
    const tier = T[s.tier];
    const brandIncluded  = tier.brand    === 'included';

    const tpHint = s.tier === 'enterprise'
      ? `Includes ${tier.touchpoints} touchpoints. Excess charged at volume rate (excess-only).`
      : `Includes ${tier.touchpoints} touchpoints. Excess above included charged at slab rate.`;

    return `
      ${renderSection('Tier')}
      ${renderTierSelector(ID, T, s.tier)}

      ${renderSection('Touchpoints & Sensors')}
      ${renderNumberField({
        id: 'xm-tp', label: 'Total Touchpoints',
        value: s.touchpoints, hint: tpHint,
      })}

      ${renderRow2(
        renderNumberField({
          id: 'xm-sensors', label: 'Total Sensors Needed', value: s.sensors,
          hint: `Includes ${tier.sensors} · $${PRICES.sensor}/sensor/mo above included`,
        }),
        renderNumberField({
          id: 'xm-dashboards', label: 'Total Dashboards Needed', value: s.dashboards,
          hint: `Includes ${tier.dashboards} · $${PRICES.dashboard}/dashboard/mo above included`,
        }),
      )}

      ${renderAddonsSection(`
        ${renderToggleRow({ id: 'xm-brand', label: 'Brand Personalization', priceLabel: `$${PRICES.brand}/brand/mo`, status: tier.brand, checked: s.brandOn })}
        <div id="xm-brand-count-wrap" style="display:${s.brandOn && !brandIncluded ? 'block' : 'none'}">
          ${renderNumberField({ id: 'xm-brand-count', label: 'Number of Brands', value: s.brandCount })}
        </div>

        ${renderToggleRow({ id: 'xm-emosight', label: 'Emosight AI', priceLabel: `$${PRICES.emosight}/account/mo`, status: tier.emosight, checked: s.emosightOn })}

        ${renderToggleRow({ id: 'xm-domain', label: 'SMS Domain Whitelisting', priceLabel: `$${PRICES.domainWhitelist}/mo`, status: 'addon', checked: s.domainOn })}

        ${renderNumberField({
          id: 'xm-users', label: 'Total Users Needed', value: s.users,
          hint: `Includes ${tier.users} users · $${PRICES.user}/user/mo above included`,
        })}
      `)}
    `;
  },

  mount(s, onUpdate) {
    const tier = T[s.tier];
    const brandIncluded = tier.brand === 'included';

    // Tier change — only event that needs a full card redraw
    bindTier(ID, newTier => onUpdate({ tier: newTier }, { redraw: true }));

    bindNum('xm-tp', tp => onUpdate({ touchpoints: tp }));

    bindNum('xm-sensors',    v => onUpdate({ sensors: v }));
    bindNum('xm-dashboards', v => onUpdate({ dashboards: v }));
    bindNum('xm-users',      v => onUpdate({ users: v }));

    // Brand toggle — show/hide count field inline, no redraw
    if (!brandIncluded) {
      bindToggle('xm-brand', checked => {
        onUpdate({ brandOn: checked });
        const wrap = document.getElementById('xm-brand-count-wrap');
        if (wrap) wrap.style.display = checked ? 'block' : 'none';
      });
    }
    bindNum('xm-brand-count', v => onUpdate({ brandCount: Math.max(1, v) }), 1);

    bindToggle('xm-emosight', checked => onUpdate({ emosightOn: checked }));
    bindToggle('xm-domain',   checked => onUpdate({ domainOn: checked }));
  },

  calculate(s) {
    const tier = T[s.tier];
    const lines = [];
    let hasContactSales = false;
    let contactSalesReason = null;

    lines.push({ label: `Base — ${tier.label} tier`, amount: tier.base });

    // Touchpoints
    const tp = s.touchpoints;
    if (s.tier === 'enterprise') {
      if (tp > tier.touchpoints) {
        const rate = findSlabRate(ENTERPRISE_TOUCHPOINT_SLABS, tp);
        const excess = tp - tier.touchpoints;
        lines.push({ label: `Touchpoints (${excess} excess × ${fmt(rate)})`, amount: round2(excess * rate) });
      }
    } else if (tp > tier.touchpoints) {
      const rate = findSlabRate(TOUCHPOINT_SLABS, tp);
      const excess = tp - tier.touchpoints;
      lines.push({ label: `Touchpoints (${excess} excess × ${fmt(rate)})`, amount: round2(excess * rate) });
    }

    const sensorExcess = Math.max(0, s.sensors - tier.sensors);
    if (sensorExcess > 0)
      lines.push({ label: `Sensors (${sensorExcess} excess × ${fmt(PRICES.sensor)})`, amount: round2(sensorExcess * PRICES.sensor) });
    const dashboardExcess = Math.max(0, s.dashboards - tier.dashboards);
    if (dashboardExcess > 0)
      lines.push({ label: `Dashboards (${dashboardExcess} excess × ${fmt(PRICES.dashboard)})`, amount: round2(dashboardExcess * PRICES.dashboard) });

    if (s.brandOn && tier.brand !== 'included')
      lines.push({ label: `Brand personalization (${s.brandCount} × ${fmt(PRICES.brand)})`, amount: round2(s.brandCount * PRICES.brand) });
    if (s.emosightOn && tier.emosight !== 'included')
      lines.push({ label: 'Emosight AI', amount: PRICES.emosight });
    if (s.domainOn)
      lines.push({ label: 'SMS Domain Whitelisting', amount: PRICES.domainWhitelist });
    const userExcess = Math.max(0, s.users - tier.users);
    if (userExcess > 0)
      lines.push({ label: `Users (${userExcess} excess × ${fmt(PRICES.user)})`, amount: round2(userExcess * PRICES.user) });

    const subtotal = centSum(lines.filter(l => l.amount != null).map(l => l.amount));
    return { moduleId: ID, lines, subtotal, hasContactSales, contactSalesReason, hasEstimate: false };
  },
};
