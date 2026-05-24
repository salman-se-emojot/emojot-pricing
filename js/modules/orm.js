// ORM — Online Reputation Management module
//
// Two independent channel types — customers can subscribe to either or both:
//   Admin Connect     — Google + Facebook only (admin API access required)
//                       Tiers: Basic $50 / Standard $250 / Premium $500
//   Non-Admin Connect — all review platforms (no admin access needed)
//                       Tiers: Basic $150 / Standard $350 / Premium $1,250
//
// Both channel types have their own tier rules for users, competitor, ticket.
// When 'both' is active, admin tier drives the add-on rules.

import { TIERS, PRICES, ORM_ADMIN_CONNECT_SLABS, ORM_NON_ADMIN_CONNECT_SLABS } from '../config/pricing.js';
import { fmt, findSlabRate } from '../core/utils.js';
import {
  renderTierSelector, renderNumberField, renderRow2,
  renderToggleRow, renderSection, renderAddonsSection, renderIncludedPanel,
  renderRadioGroup,
  bindNum, bindToggle, bindTier, bindRadio,
} from '../components/ui.js';

const ID       = 'orm';
const T_ADMIN  = TIERS.orm.admin;
const T_NON    = TIERS.orm.nonAdmin;

const PKG_OPTIONS = [
  { value: 'admin',    label: 'Admin Connect' },
  { value: 'nonAdmin', label: 'Non-Admin Connect' },
  { value: 'both',     label: 'Both' },
];

// Derive the active add-on rules from current state
function addonRules(s) {
  const showAdmin = s.packageType === 'admin' || s.packageType === 'both';
  const tier = showAdmin ? T_ADMIN[s.adminTier] : T_NON[s.nonAdminTier];
  return {
    compStatus:    tier.competitor,
    ticketStatus:  tier.ticket,
    includedUsers: tier.users,
  };
}

export const ormModule = {
  id: ID,
  shortName: 'ORM',
  name: 'Online Reputation Management',
  description: 'Review management',

  initialState: () => ({
    packageType: 'admin',
    adminTier: 'basic',
    adminLocations: T_ADMIN.basic.locations,
    nonAdminTier: 'basic',
    nonAdminLocations: T_NON.basic.locations,
    competitorOn: false,
    competitorLocationChannels: 0,
    ticketOn: false,
    users: T_ADMIN.basic.users,
  }),

  render(s) {
    const showAdmin    = s.packageType === 'admin'    || s.packageType === 'both';
    const showNonAdmin = s.packageType === 'nonAdmin' || s.packageType === 'both';
    const adminTier    = T_ADMIN[s.adminTier];
    const nonTier      = T_NON[s.nonAdminTier];

    const { compStatus, ticketStatus, includedUsers } = addonRules(s);
    const compUnavail  = compStatus === 'unavailable';
    const compIncluded = compStatus === 'included';

    return `
      ${renderSection('ORM Package Type')}
      ${renderRadioGroup({ name: 'orm-package', options: PKG_OPTIONS, currentValue: s.packageType })}

      ${showAdmin ? `
        ${renderSection('Admin Connect — Google & Facebook')}
        ${renderTierSelector('orm-admin', T_ADMIN, s.adminTier)}
        ${renderIncludedPanel({
          tierLabel: adminTier.label,
          items: [
            { label: 'Locations',           value: `${adminTier.locations}` },
            { label: 'Users',               value: `${adminTier.users}` },
            { label: 'Competitor Analysis', value: adminTier.competitor === 'included' ? 'Included' : adminTier.competitor === 'addon' ? 'Paid add-on' : 'Not available' },
            { label: 'Ticket Management',   value: adminTier.ticket === 'included' ? 'Included' : 'Paid add-on' },
          ],
          note: `${adminTier.locations} Google & Facebook locations included. Excess billed at Admin Connect slab rate.`,
        })}
        ${renderNumberField({
          id: 'orm-admin-loc', label: 'Total Admin Connect Locations',
          value: s.adminLocations,
          hint: `Google + Facebook · ${adminTier.locations} included · excess from $2.00–$25.00/loc`,
        })}
      ` : ''}

      ${showNonAdmin ? `
        ${renderSection('Non-Admin Connect — All Platforms')}
        ${renderTierSelector('orm-non', T_NON, s.nonAdminTier)}
        ${renderIncludedPanel({
          tierLabel: nonTier.label,
          items: [
            { label: 'Locations',           value: `${nonTier.locations}` },
            { label: 'Users',               value: `${nonTier.users}` },
            { label: 'Competitor Analysis', value: nonTier.competitor === 'included' ? 'Included' : nonTier.competitor === 'addon' ? 'Paid add-on' : 'Not available' },
            { label: 'Ticket Management',   value: nonTier.ticket === 'included' ? 'Included' : 'Paid add-on' },
          ],
          note: `${nonTier.locations} location${nonTier.locations > 1 ? 's' : ''} included across all review platforms (Google, Facebook, TripAdvisor & more). Excess billed at Non-Admin Connect slab rate.`,
        })}
        ${renderNumberField({
          id: 'orm-non-loc', label: 'Total Non-Admin Connect Locations',
          value: s.nonAdminLocations,
          hint: `All platforms · ${nonTier.locations} included · excess from $40.00–$150.00/loc`,
        })}
      ` : ''}

      ${renderAddonsSection(`
        ${renderToggleRow({
          id: 'orm-competitor', label: 'Competitor Analysis',
          priceLabel: compStatus === 'addon' ? `$${PRICES.ormCompetitorPerLocationChannel}/location-channel/mo` : '',
          status: compStatus, checked: s.competitorOn,
        })}
        <div id="orm-comp-channels-wrap" style="display:${s.competitorOn && !compUnavail && !compIncluded ? 'block' : 'none'}">
          ${renderNumberField({
            id: 'orm-comp-channels',
            label: 'Competitor Location-Channels',
            value: s.competitorLocationChannels,
            hint: `Competitors × locations per competitor × review channels. $${PRICES.ormCompetitorPerLocationChannel}/mo each.`,
          })}
        </div>

        ${renderToggleRow({
          id: 'orm-ticket', label: 'Ticket Creation & Management',
          priceLabel: ticketStatus === 'addon' ? `$${PRICES.ormTicketBasic}/account/mo` : '',
          status: ticketStatus, checked: s.ticketOn,
        })}

        ${renderNumberField({
          id: 'orm-users', label: 'Total Users Needed', value: s.users,
          hint: `Includes ${includedUsers} users · $${PRICES.user}/user/mo above included`,
        })}
      `)}
    `;
  },

  mount(s, onUpdate) {
    const showAdmin    = s.packageType === 'admin'    || s.packageType === 'both';
    const showNonAdmin = s.packageType === 'nonAdmin' || s.packageType === 'both';

    const { compStatus, ticketStatus } = addonRules(s);
    const compUnavail = compStatus === 'unavailable';
    const compIncluded = compStatus === 'included';
    const ticketIncl  = ticketStatus === 'included';

    // Package type → full redraw, reset add-ons, sync users to new active tier
    bindRadio('orm-package', val => {
      const isAdmin    = val === 'admin' || val === 'both';
      const activeTier = isAdmin ? T_ADMIN[s.adminTier] : T_NON[s.nonAdminTier];
      onUpdate({
        packageType: val,
        competitorOn: false,
        competitorLocationChannels: 0,
        ticketOn: false,
        users: activeTier.users,
      }, { redraw: true });
    });

    if (showAdmin) {
      bindTier('orm-admin', newTier => onUpdate({
        adminTier: newTier,
        adminLocations: T_ADMIN[newTier].locations,
        competitorOn: false,
        competitorLocationChannels: 0,
        ticketOn: false,
        users: T_ADMIN[newTier].users,
      }, { redraw: true }));

      bindNum('orm-admin-loc', v => onUpdate({ adminLocations: Math.max(1, v) }), 1);
    }

    if (showNonAdmin) {
      bindTier('orm-non', newTier => {
        const update = {
          nonAdminTier: newTier,
          nonAdminLocations: T_NON[newTier].locations,
          competitorOn: false,
          competitorLocationChannels: 0,
          ticketOn: false,
        };
        // Only sync users from non-admin tier when admin is not active
        if (!showAdmin) update.users = T_NON[newTier].users;
        onUpdate(update, { redraw: true });
      });

      bindNum('orm-non-loc', v => onUpdate({ nonAdminLocations: Math.max(1, v) }), 1);
    }

    // Add-ons — always bound regardless of package type
    if (!compUnavail && !compIncluded) {
      bindToggle('orm-competitor', checked => {
        onUpdate({ competitorOn: checked });
        const wrap = document.getElementById('orm-comp-channels-wrap');
        if (wrap) wrap.style.display = checked ? 'block' : 'none';
      });
    }
    bindNum('orm-comp-channels', v => onUpdate({ competitorLocationChannels: v }));

    if (!ticketIncl) {
      bindToggle('orm-ticket', checked => onUpdate({ ticketOn: checked }));
    }

    bindNum('orm-users', v => onUpdate({ users: v }));
  },

  calculate(s) {
    const lines = [];
    let hasContactSales    = false;
    let contactSalesReason = null;
    const showAdmin    = s.packageType === 'admin'    || s.packageType === 'both';
    const showNonAdmin = s.packageType === 'nonAdmin' || s.packageType === 'both';

    // ── Admin Connect ──────────────────────────────────────────────────────
    if (showAdmin) {
      const tier = T_ADMIN[s.adminTier];
      lines.push({ label: `Admin Connect — ${tier.label} tier (${tier.locations} locations included)`, amount: tier.base });

      const adminExcess = Math.max(0, s.adminLocations - tier.locations);
      if (adminExcess > 0) {
        const rate = findSlabRate(ORM_ADMIN_CONNECT_SLABS, s.adminLocations);
        if (rate === null) {
          hasContactSales    = true;
          contactSalesReason = `Admin Connect location count (${s.adminLocations}) exceeds pricing table — contact sales`;
        } else {
          lines.push({ label: `Admin Connect — excess locations (${adminExcess} × ${fmt(rate)})`, amount: adminExcess * rate });
        }
      }
    }

    // ── Non-Admin Connect ──────────────────────────────────────────────────
    if (showNonAdmin) {
      const tier = T_NON[s.nonAdminTier];
      lines.push({ label: `Non-Admin Connect — ${tier.label} tier (${tier.locations} location${tier.locations > 1 ? 's' : ''} included)`, amount: tier.base });

      const nonAdminExcess = Math.max(0, s.nonAdminLocations - tier.locations);
      if (nonAdminExcess > 0) {
        const rate = findSlabRate(ORM_NON_ADMIN_CONNECT_SLABS, s.nonAdminLocations);
        if (rate === null) {
          hasContactSales    = true;
          contactSalesReason = `Non-Admin Connect location count (${s.nonAdminLocations}) exceeds pricing table — contact sales`;
        } else {
          lines.push({ label: `Non-Admin Connect — excess locations (${nonAdminExcess} × ${fmt(rate)})`, amount: nonAdminExcess * rate });
        }
      }
    }

    // ── Add-ons (driven by active tier's rules) ────────────────────────────
    const { compStatus, ticketStatus, includedUsers } = addonRules(s);

    if (s.competitorOn && compStatus === 'addon' && s.competitorLocationChannels > 0)
      lines.push({
        label:  `Competitor analysis (${s.competitorLocationChannels} location-channels × ${fmt(PRICES.ormCompetitorPerLocationChannel)})`,
        amount: s.competitorLocationChannels * PRICES.ormCompetitorPerLocationChannel,
      });

    if (s.ticketOn && ticketStatus === 'addon')
      lines.push({ label: 'Ticket creation & management', amount: PRICES.ormTicketBasic });

    const userExcess = Math.max(0, s.users - includedUsers);
    if (userExcess > 0)
      lines.push({ label: `Users (${userExcess} excess × ${fmt(PRICES.user)})`, amount: userExcess * PRICES.user });

    const subtotal = hasContactSales
      ? 0
      : lines.filter(l => l.amount != null).reduce((sum, l) => sum + l.amount, 0);

    return { moduleId: ID, lines, subtotal, hasContactSales, contactSalesReason, hasEstimate: false };
  },
};
