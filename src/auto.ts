/**
 * nodewatch/auto - Zero-config auto-start dashboard
 *
 * Usage:
 *   import "nodewatch/auto"
 *   // or
 *   require("nodewatch/auto")
 *
 * That's it. The dashboard starts automatically.
 */

import { startNodewatch } from './collector';

startNodewatch();
