/**
 * What Cuemark can be told to do, and what it says about itself.
 *
 * Kept apart from the Companion plumbing so it can be read and tested on its
 * own — and so the list of actions sits next to the list of buttons made from
 * it, where a missing one is obvious.
 */

/** Every command, in the order a button wall wants them. */
export const ACTIONS = [
	{ id: 'go', label: 'GO — take the next cue', route: '/go' },
	{ id: 'undo', label: 'Undo the last take', route: '/undo' },
	{ id: 'cue_next', label: 'Next cue', route: '/cue/next' },
	{ id: 'cue_prev', label: 'Previous cue', route: '/cue/prev' },
	{ id: 'line_next', label: 'Down a line', route: '/line/next' },
	{ id: 'line_prev', label: 'Up a line', route: '/line/prev' },
	{ id: 'lines_next', label: 'Jump down several lines', route: '/lines/next', lines: true },
	{ id: 'lines_prev', label: 'Jump up several lines', route: '/lines/prev', lines: true },
	{ id: 'line_scroll', label: 'Line scroll on or off', route: '/line/scroll' },
	{ id: 'page_next', label: 'Next page', route: '/page/next' },
	{ id: 'page_prev', label: 'Previous page', route: '/page/prev' },
	{ id: 'show_on', label: 'Into show mode', route: '/show?on=1' },
	{ id: 'show_off', label: 'Out of show mode', route: '/show?on=0' },
	{ id: 'show_toggle', label: 'Show mode on or off', route: '/show' },
	{ id: 'booth', label: 'Booth dim on or off', route: '/booth' },
	{ id: 'take_over', label: 'Take over from the main (backup machine)', route: '/take-over' },
	{ id: 'moment_top', label: 'Mark the top of the show', route: '/moment/top' },
	{ id: 'moment_interval', label: 'Mark the interval', route: '/moment/interval' },
	{ id: 'moment_resume', label: 'Mark the resume', route: '/moment/resume' },
	{ id: 'moment_curtain', label: 'Mark the curtain', route: '/moment/curtain' },
	{ id: 'moment_clearance1', label: 'Mark Act 1 clearance', route: '/moment/clearance1' },
	{ id: 'moment_clearance2', label: 'Mark Act 2 clearance', route: '/moment/clearance2' },
]

/** Jumping to a printed page number takes the number with it. */
export const GOTO_PAGE = { id: 'page_number', label: 'Go to page…', route: (page) => `/page/${page}` }

/**
 * Where an action goes, with what its button was set to. A line jump can say
 * how many lines; left at 0 it is however many Cuemark ▸ Settings ▸ Reading
 * says, so one setting moves every surface at once.
 */
export function routeFor(action, options = {}) {
	const count = Math.round(Number(options.count) || 0)
	if (action.lines && count > 0) return `${action.route}/${Math.min(count, 999)}`
	return action.route
}

/**
 * What Cuemark publishes about itself, as Companion variables.
 *
 * The names are the ones a person types into a button, so they are spelled for
 * reading rather than for the code that fills them.
 */
export const VARIABLES = [
	{ id: 'deck', name: 'Next cue (as it is labelled)' },
	{ id: 'deckNumber', name: 'Next cue number' },
	{ id: 'deckPage', name: 'Page the next cue is on' },
	{ id: 'title', name: 'Production' },
	{ id: 'scriptPage', name: 'Page showing (as printed)' },
	{ id: 'page', name: 'Page showing (in the file)' },
	{ id: 'pages', name: 'Pages in the script' },
	{ id: 'taken', name: 'Cues taken' },
	{ id: 'remaining', name: 'Cues left' },
	{ id: 'cues', name: 'Cues in the show' },
	{ id: 'lastCue', name: 'The cue that has just gone (e.g. DCA 1)' },
	{ id: 'followRole', name: 'This computer is the main, the backup, or neither (main / backup / off)' },
	{ id: 'follow', name: 'Main and backup, in words (e.g. MAIN · backup following)' },
]

/**
 * The variables, from what Cuemark says. Most are passed straight through;
 * the main and backup line is put into words, the way Cuemark's banner says it.
 */
export function variableValues(state = {}) {
	const values = Object.fromEntries(VARIABLES.map(({ id }) => [id, state[id] ?? '']))
	values.followRole = state.followRole || 'off'
	values.follow = followWords(state)
	return values
}

function followWords({ followRole, followLinked, followLost } = {}) {
	if (followRole === 'main') return followLinked ? 'MAIN · backup following' : 'MAIN · no backup'
	if (followRole === 'backup') {
		if (followLost) return 'BACKUP · MAIN LOST'
		return followLinked ? 'BACKUP · following' : 'BACKUP · looking for the main'
	}
	return ''
}

/** The on/off states a button can colour itself by, each read from Cuemark's state. */
export const FEEDBACKS = [
	{ id: 'show', name: 'Show mode is running', description: 'The show is being called.', test: (s) => Boolean(s.show) },
	{
		id: 'lineScroll',
		name: 'Line scroll is on',
		description: 'The arrows move one line at a time.',
		test: (s) => Boolean(s.lineScroll),
	},
	{
		id: 'booth',
		name: 'Booth dim is on',
		description: 'The page is dimmed for a dark booth.',
		test: (s) => Boolean(s.booth),
	},
	{
		id: 'deckStandby',
		name: 'The cue on deck is a standby',
		description: 'A warning rather than a GO.',
		test: (s) => Boolean(s.deckStandby),
	},
	{
		id: 'mainLost',
		name: 'The main has gone quiet (on the backup)',
		description: 'This is the backup, and it has stopped hearing from the main: time to take over.',
		test: (s) => s.followRole === 'backup' && Boolean(s.followLost),
	},
	{
		id: 'followLinked',
		name: 'Main and backup are linked',
		description: 'On the main, a backup is following; on the backup, it is following the main.',
		test: (s) => s.followRole !== 'off' && Boolean(s.followRole) && Boolean(s.followLinked) && !s.followLost,
	},
	{
		id: 'isBackup',
		name: 'This computer is the backup',
		description: 'Its GO is locked until it takes over.',
		test: (s) => s.followRole === 'backup',
	},
]

/** Where to reach a Cuemark on the network. */
export function url({ host, port, key }, route) {
	const base = `http://${host || '127.0.0.1'}:${port || 53000}${route}`
	if (!key) return base
	return `${base}${base.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`
}
