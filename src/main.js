/**
 * What Companion runs: the module's class, handed to the framework.
 *
 * Built on @companion-module/base 1.12, which every Companion from 4.0 on can
 * run — and 1.12 is the oldest Bitfocus's module checks still build with
 * (@companion-module/tools 2.8 and later ask for it). Version 2 of the
 * framework needs Companion 4.3 at the least, and 2.2 needs 5.1 — a module
 * built on it simply did not start on the Companion 4 most booths have
 * ("Connection is not running"). Companion 3.5 keeps the 1.1.0 .tgz, built on
 * 1.11. The class itself lives in
 * index.js, so the self-test can load it without starting anything.
 */
import { runEntrypoint } from '@companion-module/base';
import CuemarkInstance, { UpgradeScripts } from './index.js';

runEntrypoint(CuemarkInstance, UpgradeScripts);
