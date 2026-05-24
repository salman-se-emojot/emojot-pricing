// Module registry — the single list the app reads to know what modules exist.
// To add a new module: import it here and add it to MODULE_REGISTRY.
// Order here determines display order in the UI.

import { xmModule  } from './xm.js';
import { ccmModule } from './ccm.js';
import { ormModule } from './orm.js';
import { sltModule } from './slt.js';

export const MODULE_REGISTRY = [
  xmModule,
  ccmModule,
  ormModule,
  sltModule,
];
