/**
 * nodewatcher/auto - Zero-config auto-start dashboard
 *
 * Usage:
 *   import "nodewatcher/auto"
 *   // or
 *   require("nodewatcher/auto")
 *
 * That's it. The dashboard starts automatically.
 */

import { startNodewatch } from './collector';

startNodewatch();
