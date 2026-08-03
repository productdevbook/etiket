#!/usr/bin/env node

/**
 * `etiket` bin entry — see ./_cli for the command definitions.
 */

import { runMain } from "citty";
import { main } from "./_cli";

runMain(main);
