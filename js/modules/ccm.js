// CCM — Customer Complaints Management module

import { TIERS, PRICES, TOUCHPOINT_SLABS, ENTERPRISE_TOUCHPOINT_SLABS } from '../config/pricing.js';
import { fmt, findSlabRate } from '../core/utils.js';
import {
  renderTierSelector, renderNumberField, renderRow2,
  renderToggleRow, renderSection, renderAddonsSection, renderIncludedPanel,
  bindNum, bindToggle, bindTier,
} from '../components/ui.js';

const ID = 'ccm';
const T  = TIERS.ccm;

export const ccmModule = {
  id: ID,
  shortName: 'CCM',
  name: 'Customer Complaints Management',
  description: 'Complaint workflows',

  initialState: () => ({
    tier: 'basic',
    touchpoints: 5,
    sensors: T.basic.sensors,
    dashboards: T.basic.dashboards,
    workflows: T.basic.workflows,
    brandOn: false,
    brandCount: 1,
    emosightOn: false,
    domainOn: false,
    users: T.basic.users,
  }),

  render(s) {
    const tier = T[s.tier];
    const brandIncluded = tier.brand    === 'included';

    const tpHint = s.tier === 'enterprise'
      ? `Includes ${tier.touchpoints} nodes. Excess charged at volume rate (excess-only).`
      : `Includes ${tier.touchpoints} nodes. All nodes × band rate when above included amount.`;

    return `
      ${renderSection('Tier')}
      ${renderTierSelector(ID, T, s.tier)}
      ${renderIncludedPanel({
        tierLabel: tier.label,
        items: [
          { label: 'Touchpoints',           value: `${tier.touchpoints} nodes` },
          { label: 'Sensors',               value: `${tier.sensors}` },
          { label: 'Workflows',             value: `${tier.workflows}` },
          { label: 'Dashboards',            value: `${tier.dashboards}` },
          { label: 'Users',                 value: `${tier.users}` },
          { label: 'Brand Personalization', value: tier.brand    === 'included' ? 'Included' : 'Add-on' },
          { label: 'Emosight AI',           value: tier.emosight === 'included' ? 'Included' : 'Add-on' },
        ],
        note: 'Anything above these limits is charged at the add-on rate.',
      })}

      ${renderSection('Touchpoints, Sensors & Workflows')}
      ${renderNumberField({
        id: 'ccm-tp', label: 'Total Touchpoints (hierarchy nodes)',
        value: s.touchpoints, hint: tpHint,
      })}

      ${renderRow2(
        renderNumberField({
          id: 'ccm-sensors', label: 'Total Sensors Needed', value: s.sensors,
          hint: `Includes ${tier.sensors} · $${PRICES.sensor}/sensor/mo above included`,
        }),
        renderNumberField({
          id: 'ccm-workflows', label: 'Total Workflows Needed', value: s.workflows,
          hint: `Includes ${tier.workflows} · $${PRICES.workflow}/workflow/mo above included`,
        }),
      )}
      ${renderNumberField({
        id: 'ccm-dashboards', label: 'Total Dashboards Needed', value: s.dashboards,
        hint: `Includes ${tier.dashboards} · $${PRICES.dashboard}/dashboard/mo above included`,
      })}

      ${renderAddonsSection(`
        ${renderToggleRow({ id: 'ccm-brand', label: 'Brand Personalization', priceLabel: `$${PRICES.brand}/brand/mo`, status: tier.brand, checked: s.brandOn })}
        <div id="ccm-brand-count-wrap" style="display:${s.brandOn && !brandIncluded ? 'block' : 'none'}">
          ${renderNumberField({ id: 'ccm-brand-count', label: 'Number of Brands', value: s.brandCount })}
        </div>

        ${renderToggleRow({ id: 'ccm-emosight', label: 'Emosight AI', priceLabel: `$${PRICES.emosight}/account/mo`, status: tier.emosight, checked: s.emosightOn })}

        ${renderToggleRow({ id: 'ccm-domain', label: 'SMS Domain Whitelisting', priceLabel: `$${PRICES.domainWhitelist}/mo`, status: 'addon', checked: s.domainOn })}

        ${renderNumberField({
          id: 'ccm-users', label: 'Total Users Needed', value: s.users,
          hint: `Includes ${tier.users} users · $${PRICES.user}/user/mo above included`,
        })}
      `)}
    `;
  },

  mount(s, onUpdate) {
    const tier = T[s.tier];
    const brandIncluded = tier.brand === 'included';

    bindTier(ID, newTier => onUpdate({ tier: newTier }, { redraw: true }));

    bindNum('ccm-tp', tp => onUpdate({ touchpoints: tp }));

    bindNum('ccm-sensors',    v => onUpdate({ sensors: v }));
    bindNum('ccm-dashboards', v => onUpdate({ dashboards: v }));
    bindNum('ccm-workflows',  v => onUpdate({ workflows: v }));
    bindNum('ccm-users',      v => onUpdate({ users: v }));

    if (!brandIncluded) {
      bindToggle('ccm-brand', checked => {
        onUpdate({ brandOn: checked });
        const wrap = document.getElementById('ccm-brand-count-wrap');
        if (wrap) wrap.style.display = checked ? 'block' : 'none';
      });
    }
    bindNum('ccm-brand-count', v => onUpdate({ brandCount: Math.max(1, v) }), 1);

    bindToggle('ccm-emosight', checked => onUpdate({ emosightOn: checked }));
    bindToggle('ccm-domain',   checked => onUpdate({ domainOn: checked }));
  },

  calculate(s) {
    const tier = T[s.tier];
    const lines = [];
    let hasContactSales = false;
    let contactSalesReason = null;

    lines.push({ label: `Base — ${tier.label} tier`, amount: tier.base });

    const tp = s.touchpoints;
    if (s.tier === 'enterprise') {
      if (tp > tier.touchpoints) {
        const rate = findSlabRate(ENTERPRISE_TOUCHPOINT_SLABS, tp);
        const excess = tp - tier.touchpoints;
        lines.push({ label: `Touchpoints (${excess} excess × ${fmt(rate)})`, amount: excess * rate });
      }
    } else if (tp > tier.touchpoints) {
      const rate = findSlabRate(TOUCHPOINT_SLABS, tp);
      lines.push({ label: `Touchpoints (${tp} nodes × ${fmt(rate)})`, amount: tp * rate });
    }

    const workflowExcess = Math.max(0, s.workflows - tier.workflows);
    if (workflowExcess > 0)
      lines.push({ label: `Workflows (${workflowExcess} excess × ${fmt(PRICES.workflow)})`, amount: workflowExcess * PRICES.workflow });
    const sensorExcess = Math.max(0, s.sensors - tier.sensors);
    if (sensorExcess > 0)
      lines.push({ label: `Sensors (${sensorExcess} excess × ${fmt(PRICES.sensor)})`, amount: sensorExcess * PRICES.sensor });
    const dashboardExcess = Math.max(0, s.dashboards - tier.dashboards);
    if (dashboardExcess > 0)
      lines.push({ label: `Dashboards (${dashboardExcess} excess × ${fmt(PRICES.dashboard)})`, amount: dashboardExcess * PRICES.dashboard });

    if (s.brandOn && tier.brand !== 'included')
      lines.push({ label: `Brand personalization (${s.brandCount} × ${fmt(PRICES.brand)})`, amount: s.brandCount * PRICES.brand });
    if (s.emosightOn && tier.emosight !== 'included')
      lines.push({ label: 'Emosight AI', amount: PRICES.emosight });
    if (s.domainOn)
      lines.push({ label: 'SMS Domain Whitelisting', amount: PRICES.domainWhitelist });
    const userExcess = Math.max(0, s.users - tier.users);
    if (userExcess > 0)
      lines.push({ label: `Users (${userExcess} excess × ${fmt(PRICES.user)})`, amount: userExcess * PRICES.user });

    const subtotal = lines.filter(l => l.amount != null).reduce((sum, l) => sum + l.amount, 0);
    return { moduleId: ID, lines, subtotal, hasContactSales, contactSalesReason, hasEstimate: false };
  },
};
