// SLT — Social Listening & Tracking module

import { TIERS, PRICES } from '../config/pricing.js';
import { fmt } from '../core/utils.js';
import {
  renderTierSelector, renderNumberField, renderRow2,
  renderToggleRow, renderSection, renderAddonsSection, renderIncludedPanel,
  bindNum, bindToggle, bindTier,
} from '../components/ui.js';

const ID = 'slt';
const T  = TIERS.slt;

// Internal billing units — not exposed in UI
const MENTION_BLOCK = 10000;
const PROFILE_BLOCK = 10;

export const sltModule = {
  id: ID,
  shortName: 'SLT',
  name: 'Social Listening & Tracking',
  description: 'Keywords & mentions',

  initialState: () => ({
    tier: 'basic',
    keywords: T.basic.keywords,
    mentions: T.basic.mentions,   // raw mention count
    profiles: T.basic.profiles,   // raw profile count
    flaggingOn: false,
    youtubeOn: false,
    users: T.basic.users,
  }),

  render(s) {
    const tier = T[s.tier];

    return `
      ${renderSection('Tier')}
      ${renderTierSelector(ID, T, s.tier)}
      ${renderIncludedPanel({
        tierLabel: tier.label,
        items: [
          { label: 'Keywords',         value: `${tier.keywords}` },
          { label: 'Mentions',         value: `${tier.mentions.toLocaleString()}` },
          { label: 'SM Profiles',      value: `${tier.profiles}` },
          { label: 'Users',            value: `${tier.users}` },
          { label: 'Mention Flagging', value: tier.flagging === 'included' ? 'Included' : 'Paid add-on' },
        ],
        note: 'Additional usage blocks and users are charged only when limits are exceeded.',
      })}

      ${renderSection('Usage')}
      ${renderRow2(
        renderNumberField({
          id: 'slt-kw', label: 'Total Keywords Needed', value: s.keywords,
          hint: `Includes ${tier.keywords} · $${PRICES.sltKeyword}/keyword/mo above included`,
        }),
        renderNumberField({
          id: 'slt-mentions', label: 'Total Mentions Needed', value: s.mentions,
          hint: `Includes ${tier.mentions.toLocaleString()} · billed in 10,000-mention blocks at $${PRICES.sltMentionBlock}/block above included`,
        }),
      )}
      ${renderNumberField({
        id: 'slt-profiles', label: 'Total SM Profiles Needed', value: s.profiles,
        hint: `Includes ${tier.profiles} · billed in blocks of 10 at $${PRICES.sltProfileBlock}/block above included`,
      })}

      ${renderAddonsSection(`
        ${renderToggleRow({
          id: 'slt-flagging', label: 'Mention Flagging / Ticket Management',
          priceLabel: `$${PRICES.sltFlagging}/account/mo`,
          status: tier.flagging, checked: s.flaggingOn,
        })}

        ${renderToggleRow({
          id: 'slt-youtube', label: 'YouTube AI Search',
          priceLabel: `$${PRICES.sltYoutube}/account/mo`,
          status: 'addon', checked: s.youtubeOn,
        })}

        ${renderNumberField({
          id: 'slt-users', label: 'Total Users Needed', value: s.users,
          hint: `Includes ${tier.users} users · $${PRICES.user}/user/mo above included`,
        })}
      `)}
    `;
  },

  mount(s, onUpdate) {
    const tier = T[s.tier];

    // Only tier changes need a full redraw
    bindTier(ID, newTier => onUpdate({ tier: newTier, flaggingOn: false, youtubeOn: false }, { redraw: true }));

    bindNum('slt-kw',       v => onUpdate({ keywords: v }));
    bindNum('slt-mentions', v => onUpdate({ mentions: v }));
    bindNum('slt-profiles', v => onUpdate({ profiles: v }));
    bindNum('slt-users',    v => onUpdate({ users: v }));

    if (tier.flagging !== 'included') {
      bindToggle('slt-flagging', checked => onUpdate({ flaggingOn: checked }));
    }
    bindToggle('slt-youtube', checked => onUpdate({ youtubeOn: checked }));
  },

  calculate(s) {
    const tier = T[s.tier];
    const lines = [];

    lines.push({ label: `Base — ${tier.label} tier`, amount: tier.base });

    const keywordExcess = Math.max(0, s.keywords - tier.keywords);
    if (keywordExcess > 0)
      lines.push({ label: `Keywords (${keywordExcess} excess × ${fmt(PRICES.sltKeyword)})`, amount: keywordExcess * PRICES.sltKeyword });

    const mentionExcess = Math.max(0, s.mentions - tier.mentions);
    const mentionBlocks = Math.ceil(mentionExcess / MENTION_BLOCK);
    if (mentionBlocks > 0)
      lines.push({ label: `Mentions (${mentionExcess.toLocaleString()} excess → ${mentionBlocks} blocks × ${fmt(PRICES.sltMentionBlock)})`, amount: mentionBlocks * PRICES.sltMentionBlock });

    const profileExcess = Math.max(0, s.profiles - tier.profiles);
    const profileBlocks = Math.ceil(profileExcess / PROFILE_BLOCK);
    if (profileBlocks > 0)
      lines.push({ label: `SM profiles (${profileExcess} excess → ${profileBlocks} blocks × ${fmt(PRICES.sltProfileBlock)})`, amount: profileBlocks * PRICES.sltProfileBlock });

    if (s.flaggingOn && tier.flagging !== 'included')
      lines.push({ label: 'Mention flagging / ticket management', amount: PRICES.sltFlagging });
    if (s.youtubeOn)
      lines.push({ label: 'YouTube AI search', amount: PRICES.sltYoutube });
    const userExcess = Math.max(0, s.users - tier.users);
    if (userExcess > 0)
      lines.push({ label: `Users (${userExcess} excess × ${fmt(PRICES.user)})`, amount: userExcess * PRICES.user });

    const subtotal = lines.reduce((sum, l) => sum + (l.amount ?? 0), 0);
    return { moduleId: ID, lines, subtotal, hasContactSales: false, contactSalesReason: null, hasEstimate: false };
  },
};
