/**
 * Cuemark, in Bitfocus Companion.
 *
 * Pick Cuemark from Companion's list, tell it where the app is, and the buttons
 * are already there: GO, the cue and line steps, show mode, the booth dim. What
 * is on deck comes back as variables, so a button can read the next cue rather
 * than a label somebody typed and forgot to change.
 *
 * It speaks to Cuemark's own HTTP control, which is off until switched on in
 * Cuemark ▸ Settings ▸ Show control ▸ Companion — and which then prints the key that goes in
 * the field below.
 */
import { InstanceBase, InstanceStatus, Regex, combineRgb } from '@companion-module/base';
import { ACTIONS, FEEDBACKS, GOTO_PAGE, VARIABLES, routeFor, url, variableValues } from './api.js';

const WHITE = combineRgb(255, 255, 255);
const BLACK = combineRgb(0, 0, 0);
const AMBER = combineRgb(255, 176, 32);
const DARK = combineRgb(20, 22, 27);
const RED = combineRgb(200, 30, 30);
const GREEN = combineRgb(0, 120, 40);

class CuemarkInstance extends InstanceBase {
  async init(config) {
    this.config = config;
    this.state = {};
    this.setActionDefinitions(this.actions());
    this.setFeedbackDefinitions(this.feedbacks());
    this.setPresetDefinitions(this.presets());
    this.setVariableDefinitions(VARIABLES.map(({ id, name }) => ({ variableId: id, name })));
    this.updateStatus(InstanceStatus.Connecting);
    this.poll();
  }

  async destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async configUpdated(config) {
    this.config = config;
    if (this.timer) clearInterval(this.timer);
    this.poll();
  }

  getConfigFields() {
    return [
      {
        type: 'static-text',
        id: 'intro',
        width: 12,
        label: 'Before this works',
        value:
          'In Cuemark, open Settings ▸ Show control ▸ Companion and switch on "Accept HTTP commands". ' +
          'It shows the port and the key to put below. Cuemark has to be running on the machine named here.',
      },
      { type: 'textinput', id: 'host', label: 'Cuemark is on', width: 6, default: '127.0.0.1', regex: Regex.HOSTNAME },
      { type: 'textinput', id: 'port', label: 'Port', width: 3, default: '53000', regex: Regex.PORT },
      { type: 'textinput', id: 'key', label: 'Key', width: 3, default: '' },
      {
        type: 'checkbox',
        id: 'poll',
        label: 'Read what is on deck',
        width: 6,
        default: true,
        tooltip: 'Asks Cuemark twice a second what the next cue is, so buttons can show it.',
      },
    ];
  }

  /** Send one command, and say plainly when it did not land. */
  async send(route) {
    try {
      const response = await fetch(url(this.config, route), { method: 'GET' });
      if (response.status === 401 || response.status === 403) {
        this.updateStatus(InstanceStatus.BadConfig, 'Key refused — check it in Cuemark ▸ Settings ▸ Show control ▸ Companion');
        return;
      }
      if (!response.ok) {
        this.updateStatus(InstanceStatus.UnknownError, `Cuemark said ${response.status}`);
        return;
      }
      this.updateStatus(InstanceStatus.Ok);
    } catch (error) {
      this.updateStatus(InstanceStatus.ConnectionFailure, 'Cuemark is not answering — is it running?');
      this.log('debug', `${route}: ${error?.message}`);
    }
  }

  actions() {
    const defs = {};
    for (const action of ACTIONS) {
      const options = action.lines
        ? [
            {
              type: 'number',
              id: 'count',
              label: 'Lines (0 = as set in Cuemark ▸ Settings ▸ Reading)',
              default: 0,
              min: 0,
              max: 999,
            },
          ]
        : [];
      defs[action.id] = { name: action.label, options, callback: (event) => this.send(routeFor(action, event.options)) };
    }
    defs[GOTO_PAGE.id] = {
      name: GOTO_PAGE.label,
      options: [{ type: 'number', id: 'page', label: 'Printed page number', default: 1, min: 1, max: 9999 }],
      callback: async (event) => this.send(GOTO_PAGE.route(Number(event.options.page) || 1)),
    };
    return defs;
  }

  feedbacks() {
    const defs = {};
    for (const feedback of FEEDBACKS) {
      defs[feedback.id] = {
        type: 'boolean',
        name: feedback.name,
        description: feedback.description,
        defaultStyle: { bgcolor: AMBER, color: BLACK },
        options: [],
        callback: () => feedback.test(this.state || {}),
      };
    }
    return defs;
  }

  /** Ready-made buttons, so a new connection is useful before anything is typed. */
  presets() {
    const button = (text, actionId, extra = {}) => ({
      type: 'button',
      category: extra.category || 'Calling the show',
      name: text,
      style: { text, size: extra.size || '14', color: WHITE, bgcolor: extra.bgcolor || DARK },
      steps: [{ down: [{ actionId, options: {} }], up: [] }],
      feedbacks: extra.feedbacks || [],
    });

    const presets = {
      go: {
        ...button('GO', 'go', { size: '24', bgcolor: GREEN }),
        name: 'GO — take the next cue',
      },
      on_deck: {
        type: 'button',
        category: 'Calling the show',
        name: 'What is on deck',
        style: { text: 'NEXT\\n$(cuemark:deckNumber)\\np.$(cuemark:deckPage)', size: '14', color: WHITE, bgcolor: DARK },
        steps: [{ down: [{ actionId: 'go', options: {} }], up: [] }],
        feedbacks: [{ feedbackId: 'deckStandby', options: {}, style: { bgcolor: AMBER, color: BLACK } }],
      },
      undo: button('UNDO', 'undo', { bgcolor: combineRgb(120, 30, 30) }),
      cue_next: button('Cue\\n▼', 'cue_next'),
      cue_prev: button('Cue\\n▲', 'cue_prev'),
      line_next: button('Line\\n▼', 'line_next', { category: 'Moving the script' }),
      line_prev: button('Line\\n▲', 'line_prev', { category: 'Moving the script' }),
      lines_next: button('Jump\\n▼▼', 'lines_next', { category: 'Moving the script' }),
      lines_prev: button('Jump\\n▲▲', 'lines_prev', { category: 'Moving the script' }),
      page_next: button('Page\\n▼', 'page_next', { category: 'Moving the script' }),
      page_prev: button('Page\\n▲', 'page_prev', { category: 'Moving the script' }),
      line_scroll: {
        ...button('Line\\nscroll', 'line_scroll', { category: 'Moving the script' }),
        feedbacks: [{ feedbackId: 'lineScroll', options: {}, style: { bgcolor: AMBER, color: BLACK } }],
      },
      show: {
        ...button('SHOW\\nMODE', 'show_toggle', { category: 'The desk' }),
        feedbacks: [{ feedbackId: 'show', options: {}, style: { bgcolor: AMBER, color: BLACK } }],
      },
      booth: {
        ...button('Booth\\ndim', 'booth', { category: 'The desk' }),
        feedbacks: [{ feedbackId: 'booth', options: {}, style: { bgcolor: AMBER, color: BLACK } }],
      },
      running: {
        type: 'button',
        category: 'The desk',
        name: 'Cues taken, and left',
        style: { text: '$(cuemark:taken) done\\n$(cuemark:remaining) left', size: '14', color: WHITE, bgcolor: DARK },
        steps: [{ down: [], up: [] }],
        feedbacks: [],
      },
    };
    // Main and backup: one button that says where things stand, and the one
    // that matters when they go wrong — lit red the moment the main goes quiet.
    presets.follow_state = {
      type: 'button',
      category: 'Main and backup',
      name: 'Main or backup, and the link',
      style: { text: '$(cuemark:follow)', size: '14', color: WHITE, bgcolor: DARK },
      steps: [{ down: [], up: [] }],
      feedbacks: [
        { feedbackId: 'followLinked', options: {}, style: { bgcolor: GREEN, color: WHITE } },
        { feedbackId: 'mainLost', options: {}, style: { bgcolor: RED, color: WHITE } },
      ],
    };
    presets.take_over = {
      ...button('TAKE\\nOVER', 'take_over', { category: 'Main and backup', size: '18' }),
      name: 'Take over from the main',
      feedbacks: [{ feedbackId: 'mainLost', options: {}, style: { bgcolor: RED, color: WHITE } }],
    };
    for (const moment of ['top', 'interval', 'resume', 'curtain']) {
      presets[`moment_${moment}`] = button(
        moment === 'top' ? 'Top of\\nshow' : moment[0].toUpperCase() + moment.slice(1),
        `moment_${moment}`,
        { category: 'The desk' }
      );
    }
    presets.moment_clearance1 = button('Act 1\\nclearance', 'moment_clearance1', { category: 'The desk' });
    presets.moment_clearance2 = button('Act 2\\nclearance', 'moment_clearance2', { category: 'The desk' });
    return presets;
  }

  /**
   * Ask Cuemark what it is showing.
   *
   * Twice a second: fast enough that a button is never showing the cue before
   * last, slow enough to be nothing on a machine that is also calling a show.
   */
  poll() {
    const tick = async () => {
      if (this.config?.poll === false) return;
      try {
        const response = await fetch(url(this.config, '/state'));
        if (!response.ok) return;
        const state = await response.json();
        this.state = state;
        this.setVariableValues(variableValues(state));
        this.checkFeedbacks(...FEEDBACKS.map((feedback) => feedback.id));
        this.updateStatus(InstanceStatus.Ok);
      } catch (error) {
        this.updateStatus(InstanceStatus.ConnectionFailure, 'Cuemark is not answering — is it running?');
        this.log('debug', `state: ${url(this.config, '/state').replace(/key=[^&]*/, 'key=…')} ${error?.cause?.code || error?.message}`);
      }
    };
    tick();
    this.timer = setInterval(tick, 500);
  }
}

/**
 * No earlier version of this module ever shipped a config that needs
 * converting, so there are no upgrade scripts yet. src/main.js hands both to
 * the framework.
 */
export const UpgradeScripts = [];
export default CuemarkInstance;
