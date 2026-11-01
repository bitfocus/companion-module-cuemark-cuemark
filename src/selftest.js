/**
 * What can be checked without a Companion: that every action has a route and a
 * preset, every variable and feedback a name, and the module file loads.
 */
import assert from 'node:assert/strict'
import { ACTIONS, FEEDBACKS, GOTO_PAGE, VARIABLES, url } from './api.js'

const ids = new Set()
for (const action of ACTIONS) {
	assert.ok(action.id && action.label && action.route.startsWith('/'), `action ${action.id} is incomplete`)
	assert.ok(!ids.has(action.id), `duplicate action id ${action.id}`)
	ids.add(action.id)
}
assert.equal(GOTO_PAGE.route(23), '/page/23')
for (const variable of VARIABLES) assert.ok(variable.id && variable.name, `variable ${variable.id} needs a name`)
for (const feedback of FEEDBACKS)
	assert.ok(feedback.id && feedback.name && feedback.description, `feedback ${feedback.id} is incomplete`)

assert.equal(url({ host: '10.0.0.5', port: 53000, key: 'a b' }, '/go'), 'http://10.0.0.5:53000/go?key=a%20b')
assert.equal(url({}, '/show?on=1'), 'http://127.0.0.1:53000/show?on=1')

const { default: Instance, pageNumber } = await import('./index.js')
const { UpgradeScripts } = await import('./upgrades.js')
assert.equal(typeof Instance, 'function', 'the module exports its class as the default export')
assert.ok(Array.isArray(UpgradeScripts), 'and upgrades.js an UpgradeScripts array, even an empty one')
// A printed page is a whole page: 12.5 typed by mistake is page 13.
assert.equal(pageNumber(12.5), 13)
assert.equal(pageNumber('7'), 7)
assert.equal(pageNumber(0), 1)
assert.equal(pageNumber(''), 1)

// The ready-made buttons: each uses only actions and feedbacks that exist, and
// every action has one (show on and off are covered by the toggle).
const presets = Instance.prototype.presets.call({})
const actionIds = new Set([...ACTIONS.map((a) => a.id), GOTO_PAGE.id])
const feedbackIds = new Set(FEEDBACKS.map((f) => f.id))
const used = new Set()
for (const [id, preset] of Object.entries(presets)) {
	for (const step of preset.steps) {
		for (const action of [...step.down, ...step.up]) {
			assert.ok(actionIds.has(action.actionId), `preset ${id} uses unknown action ${action.actionId}`)
			used.add(action.actionId)
		}
	}
	for (const feedback of preset.feedbacks)
		assert.ok(feedbackIds.has(feedback.feedbackId), `preset ${id} uses unknown feedback ${feedback.feedbackId}`)
}
const unbuttoned = ACTIONS.map((a) => a.id).filter((id) => !used.has(id) && !['show_on', 'show_off'].includes(id))
assert.deepEqual(unbuttoned, [], `actions with no ready-made button: ${unbuttoned.join(', ')}`)
console.log(
	`ok — ${ACTIONS.length} actions, ${VARIABLES.length} variables, ${FEEDBACKS.length} feedbacks, ${Object.keys(presets).length} presets`,
)
