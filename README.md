# Cuemark for Bitfocus Companion

Pick **Cuemark** from Companion's connection list, say where the app is, and the
buttons are already there — GO, the cue and line steps, show mode, the booth
dim — with what is on deck coming back as variables, so a button reads the next
cue rather than a label somebody typed and forgot to change.

## Before it works

In Cuemark: **Settings ▸ Show control ▸ Companion ▸ Accept HTTP commands**. That prints the
port and the key, which go in this connection's config. Cuemark has to be
running on the machine the connection names.

## What it gives you

| | |
| --- | --- |
| Actions | GO, undo, next/previous cue, up/down a line, jump several lines (a number per button, or Cuemark's setting), line scroll, page steps, go to a printed page, show mode on/off/toggle, booth dim, the four show moments, and take over from the main |
| Variables | The cue on deck and its page, the production, the page showing, cues taken, cues left; main or backup, and the link in words |
| Feedbacks | Show mode running, line scroll on, booth dim on, whether the cue on deck is a standby rather than a GO; the main gone quiet, main and backup linked, this computer is the backup |
| Presets | A ready-made button for each of the above, in four groups, with TAKE OVER lit red when the main goes quiet |

## Checking it on a real Companion

Companion ▸ the cog at the top right of the launcher ▸ Advanced Settings ▸
Developer ▸ pick a folder and turn on **Enable Developer Modules**. The folder
holds one subfolder per module, so make `companion-modules/cuemark/` and put
this directory's contents in it (`yarn install` inside it first). The module then
appears on the **Connections** page — not the Modules page, since it is not in
the official set yet.

It is built on `@companion-module/base` 1.12: Companion 4.0 shipped with
1.12 and 4.1 with 1.13, so every Companion from 4.0 to 5.1 runs it, and 1.12
is the oldest Bitfocus's module checks still build with (they want
`@companion-module/tools` 2.8 or later, which asks for base 1.12). Version 2
of the framework needs Companion 4.3 or later, and 2.2 needs 5.1 at the least
(unconfirmed even there): a module built on it loads and then shows
"Connection is not running". Companion 3.5 users keep the 1.1.0 .tgz, which
was built on 1.11.

It uses yarn, as every module in Bitfocus's list must: their checks stop at a
`package-lock.json` and want a `yarn.lock`. `corepack enable` once, then
`yarn install`, `yarn run check`, `yarn run test:host`, `yarn run package`.

`yarn run test:host` builds the package and runs it the way Companion does —
forked with the manifest, a connection id and an IPC channel — against a
stand-in Cuemark, and checks it registers, defines its actions, variables,
feedbacks and presets, reads the state, and that a button press arrives.

`yarn run check` runs what can be checked without a Companion: every action has
a route and a ready-made button, every button uses only actions and feedbacks
that exist, the module loads with the class as the default export — then
Bitfocus's own checker, `companion-module-check`.

## Packaging it

`yarn run package` (the `companion-module-build` tool from `@companion-module/tools`)
writes `pkg/` and `cuemark-<version>.tgz`. Anybody can load
that .tgz from Companion's Modules page without waiting for the official list.

## Getting it into Companion's list

Bitfocus hosts every module in its own repository, created through their
Developer Portal, and serves it to Companion the moment a version is approved.
As companion.free ▸ For developers ▸ Releasing your module now describes it:

1. **Ask for the repository** — done: Bitfocus approved it on 25 October 2026
   as https://github.com/bitfocus/companion-module-cuemark-cuemark, so the
   manifest's `id` is `cuemark-cuemark` (the repository's name without
   `companion-module-`). `legacyIds` is empty: the hand-installed .tgz builds
   used the id `cuemark`, but that was never a published module, and Bitfocus's
   review (1.2.0, H1) asked for it to go — so a connection made with one of
   those is added again, once, as Cuemark. Questions go to
   `#module-development` on the Bitfocus Slack (https://bfoc.us/ke7e9dqgaz).
2. **Push this directory** to that repository as its root: `companion/`,
   `src/`, `scripts/`, `package.json`, `yarn.lock`, `.yarnrc.yml`, `README.md`,
   `LICENSE`, `.gitignore`. `package.json`'s licence must be MIT (it is).
3. **Release a version.** Set `version` in `package.json` (`1.2.1` now; the
   build copies it into the manifest, whose own `version` stays `0.0.0`), push
   a tag `v1.2.1`, then in the portal: My Connections ▸ the module ▸
   **Submit Version** ▸ choose the tag (tick *Is Prerelease* for a beta) ▸
   Submit. It shows as Pending.
4. A volunteer reviews it; feedback comes through the portal. Once approved
   it is downloadable at once in Companion 4.0 and later, which install
   modules on demand from Bitfocus — no Companion release needed.
5. **Each update:** bump `version`, tag it `vX.Y.Z`, Submit Version again.
   Minor for something added (a new variable), patch for fixes and help.

From 1.2.0 the module needs Companion 4.0 or later, which is also where
Companion started installing modules from Bitfocus's list. Companion 3.5
keeps working with the 1.1.0 .tgz.
