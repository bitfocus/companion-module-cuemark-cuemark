## Cuemark

Cuemark is the theatre cue-marking app: a script as a PDF, every cue placed on
the word it fires on, and show mode to call it from — one line at a time with
the next cue on deck. This connection lets a Stream Deck (or anything else
Companion drives) take the cues and read what is on deck.

### Before it works

In Cuemark, open **Settings ▸ Show control ▸ Companion** and switch on **Accept HTTP
commands**. Cuemark shows the port and the key; put both in this connection's
settings. Cuemark has to be running on the machine named here (the default,
127.0.0.1, is the same machine Companion is on).

### Actions

- **GO** — take the next cue. **Undo** puts the last one back.
- **Next / previous cue**, **up / down a line**, **next / previous page**,
  **go to a printed page number**.
- **Jump down / up several lines** — as many as Cuemark ▸ Settings ▸ Reading
  says, or set the number on the button.
- **Line scroll on or off** — whether the arrow keys move one line at a time.
- **Show mode on / off / toggle**, and **booth dim** for a dark booth.
- The show moments: **top of the show, interval, resume, curtain**, and
  **Act 1 / Act 2 clearance** from front of house.
- **Take over from the main** — on a backup computer, makes it the main,
  exactly where the show was. (Main and backup is in Cuemark ▸ File ▸ Main and
  Backup.)

### Variables

What is on deck, as text a button can show: the next cue as it is labelled, its
number and the page it is on, the production, the page showing (as printed and
in the file), and the counts — cues taken, cues left, cues in the show.

**The cue that has just gone** (`lastCue`, e.g. *DCA 1*) changes every time a
cue goes. A Companion trigger on that variable can run anything when a
particular cue goes. Simpler still: in Cuemark, give the cue a *Companion
button* in Edit cue and Cuemark presses that button itself when the cue goes.

For main and backup: whether this computer is the **main**, the **backup** or
neither, and the link in words — *MAIN · backup following*, *BACKUP ·
following*, *BACKUP · MAIN LOST*.

### Feedbacks

Show mode running, line scroll on, booth dim on, and whether the cue on deck is
a standby rather than a GO — so a button can go amber for a warning.

For main and backup: **the main has gone quiet** (on the backup — light your
Take over button red), **main and backup are linked**, and **this computer is
the backup**. Point the connection at the backup computer for these.

### Presets

A ready-made button for every action above, in four groups, with the GO button
reading the next cue off the variable. Under **Main and backup**: a button that
shows the link and goes green when it is up and red when the main is lost, and
a **TAKE OVER** button that lights red the moment the main goes quiet.
