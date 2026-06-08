// URL state persistence
// Encodes the full app configuration into the URL hash so quotes are shareable.
// Format: #bil=a&mods=xm,ccm&xm_t=basic&xm_tp=5&...
//
// Design decisions:
//   - Short keys to keep URLs readable
//   - Booleans stored as 1/0
//   - Module list comma-separated in a single `mods` key
//   - Defaults are still written (makes hash self-contained for sharing)

const BILLING_SHORT = { annual: 'a', quarterly: 'q', monthly: 'm' };
const BILLING_LONG  = { a: 'annual', q: 'quarterly', m: 'monthly' };

// ── Serialize ─────────────────────────────────────────────────────────────────
export function serializeState(appState) {
  const p = new URLSearchParams();

  p.set('bil', BILLING_SHORT[appState.billing] ?? 'a');
  if (appState.discount) p.set('disc', appState.discount);

  if (appState.activeModules.length > 0) {
    p.set('mods', appState.activeModules.join(','));
  }

  for (const id of appState.activeModules) {
    const s = appState.getModule(id);
    switch (id) {
      case 'xm':
        p.set('xm_t',   s.tier);
        p.set('xm_tp',  s.touchpoints);
        p.set('xm_se',  s.sensors);
        p.set('xm_db',  s.dashboards);
        p.set('xm_br',  s.brandOn ? 1 : 0);
        p.set('xm_brc', s.brandCount);
        p.set('xm_em',  s.emosightOn ? 1 : 0);
        p.set('xm_do',  s.domainOn ? 1 : 0);
        p.set('xm_us',  s.users);
        break;

      case 'ccm':
        p.set('ccm_t',   s.tier);
        p.set('ccm_tp',  s.touchpoints);
        p.set('ccm_se',  s.sensors);
        p.set('ccm_db',  s.dashboards);
        p.set('ccm_wf',  s.workflows);
        p.set('ccm_br',  s.brandOn ? 1 : 0);
        p.set('ccm_brc', s.brandCount);
        p.set('ccm_em',  s.emosightOn ? 1 : 0);
        p.set('ccm_do',  s.domainOn ? 1 : 0);
        p.set('ccm_us',  s.users);
        break;

      case 'orm':
        p.set('orm_pkg', s.packageType);
        p.set('orm_at',  s.adminTier);
        p.set('orm_al',  s.adminLocations);
        p.set('orm_nt',  s.nonAdminTier);
        p.set('orm_nl',  s.nonAdminLocations);
        p.set('orm_cp',  s.competitorOn ? 1 : 0);
        p.set('orm_clc', s.competitorLocationChannels);
        p.set('orm_tk',  s.ticketOn ? 1 : 0);
        p.set('orm_us',  s.users);
        break;

      case 'slt':
        p.set('slt_t',  s.tier);
        p.set('slt_kw', s.keywords);
        p.set('slt_me', s.mentions);
        p.set('slt_pr', s.profiles);
        p.set('slt_fl', s.flaggingOn ? 1 : 0);
        p.set('slt_yt', s.youtubeOn ? 1 : 0);
        p.set('slt_us', s.users);
        break;
    }
  }

  return p.toString();
}

// ── Deserialize ───────────────────────────────────────────────────────────────
// Returns { billing, moduleIds, moduleStates } or null if hash is empty/invalid.
export function deserializeState(hashString) {
  // Strip leading '#'
  const raw = hashString.startsWith('#') ? hashString.slice(1) : hashString;
  if (!raw) return null;

  let p;
  try { p = new URLSearchParams(raw); } catch (_) { return null; }

  const billing  = BILLING_LONG[p.get('bil')] ?? null;
  const discount = p.get('disc') ?? null;
  const modsParam = p.get('mods');
  if (!modsParam) return null;

  const moduleIds = modsParam.split(',').filter(Boolean);
  if (moduleIds.length === 0) return null;

  const moduleStates = {};

  for (const id of moduleIds) {
    switch (id) {
      case 'xm':
        moduleStates.xm = {
          tier:        p.get('xm_t')   ?? 'basic',
          touchpoints: num(p.get('xm_tp'), 5),
          sensors:     num(p.get('xm_se'), 1),
          dashboards:  num(p.get('xm_db'), 1),
          brandOn:     bool(p.get('xm_br')),
          brandCount:  num(p.get('xm_brc'), 1),
          emosightOn:  bool(p.get('xm_em')),
          domainOn:    bool(p.get('xm_do')),
          users:       num(p.get('xm_us'), 5),
        };
        break;

      case 'ccm':
        moduleStates.ccm = {
          tier:        p.get('ccm_t')   ?? 'basic',
          touchpoints: num(p.get('ccm_tp'), 5),
          sensors:     num(p.get('ccm_se'), 1),
          dashboards:  num(p.get('ccm_db'), 1),
          workflows:   num(p.get('ccm_wf'), 1),
          brandOn:     bool(p.get('ccm_br')),
          brandCount:  num(p.get('ccm_brc'), 1),
          emosightOn:  bool(p.get('ccm_em')),
          domainOn:    bool(p.get('ccm_do')),
          users:       num(p.get('ccm_us'), 5),
        };
        break;

      case 'orm':
        moduleStates.orm = {
          packageType:                p.get('orm_pkg') ?? 'admin',
          adminTier:                  p.get('orm_at')  ?? 'basic',
          adminLocations:             num(p.get('orm_al'), 5),
          nonAdminTier:               p.get('orm_nt')  ?? 'basic',
          nonAdminLocations:          num(p.get('orm_nl'), 1),
          competitorOn:               bool(p.get('orm_cp')),
          competitorLocationChannels: num(p.get('orm_clc'), 0),
          ticketOn:                   bool(p.get('orm_tk')),
          users:                      num(p.get('orm_us'), 2),
        };
        break;

      case 'slt':
        moduleStates.slt = {
          tier:       p.get('slt_t')  ?? 'basic',
          keywords:   num(p.get('slt_kw'), 5),
          mentions:   num(p.get('slt_me'), 10000),
          profiles:   num(p.get('slt_pr'), 30),
          flaggingOn: bool(p.get('slt_fl')),
          youtubeOn:  bool(p.get('slt_yt')),
          users:      num(p.get('slt_us'), 5),
        };
        break;

      default:
        // unknown module — skip
    }
  }

  return { billing, discount, moduleIds, moduleStates };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function num(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

function bool(val) {
  return val === '1';
}
