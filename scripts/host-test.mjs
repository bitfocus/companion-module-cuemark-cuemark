#!/usr/bin/env node
/**
 * Run the built module the way Companion runs it, and see that it starts.
 *
 * "Connection is not running" is all Companion says when a module fails to
 * start, and it said it for this one: built on a framework newer than the
 * Companion it was loaded into. So this forks pkg/main.js with what Companion
 * provides (the manifest, a connection id, a token, an IPC channel), answers
 * its registration, sends init with a connection's config, and checks it
 * defines its actions, variables, feedbacks and presets, reads Cuemark's state
 * into variables, says it is OK — and that a button press reaches Cuemark.
 *
 * Cuemark itself is played by a small HTTP server here.
 *
 *   npm run package && node scripts/host-test.mjs
 */
import { fork } from 'node:child_process'
import { createRequire } from 'node:module'
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const EJSON = require('ejson')
const here = path.resolve(import.meta.dirname, '..')
const pkg = path.join(here, 'pkg')
if (!fs.existsSync(path.join(pkg, 'main.js'))) {
	console.error('No pkg/main.js: run npm run package first.')
	process.exit(1)
}

let passed = 0
let failed = 0
const check = (name, ok, detail = '') => {
	if (ok) passed += 1
	else failed += 1
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

// ---- a stand-in Cuemark ---------------------------------------------------------
const heard = []
const cuemark = http.createServer((request, response) => {
	const url = new URL(request.url, 'http://x')
	heard.push(`${url.pathname}?key=${url.searchParams.get('key')}`)
	response.setHeader('content-type', 'application/json')
	if (url.searchParams.get('key') !== 'K3Y') {
		response.statusCode = 401
		return response.end('{"ok":false}')
	}
	if (url.pathname === '/state') {
		return response.end(
			JSON.stringify({
				ok: true,
				deck: 'LX 12',
				deckNumber: '12',
				deckPage: 4,
				title: 'Shrek',
				show: true,
				followRole: 'backup',
				followLinked: false,
				followLost: true,
			}),
		)
	}
	response.end('{"ok":true}')
})
await new Promise((resolve) => cuemark.listen(0, '127.0.0.1', resolve))
const port = cuemark.address().port

// ---- Companion's side of the conversation ---------------------------------------
const calls = []
const statuses = []
let variables = {}
const logs = []
let variableSends = 0
const child = fork(path.join(pkg, 'main.js'), [], {
	cwd: pkg,
	env: {
		...process.env,
		MODULE_MANIFEST: path.join(pkg, 'companion', 'manifest.json'),
		CONNECTION_ID: 'cuemark-test',
		VERIFICATION_TOKEN: 'token',
	},
	stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
})
let output = ''
child.stdout.on('data', (chunk) => (output += chunk))
child.stderr.on('data', (chunk) => (output += chunk))

let nextId = 1000
const pending = new Map()
const call = (name, msg) =>
	new Promise((resolve, reject) => {
		const callbackId = nextId++
		pending.set(callbackId, { resolve, reject })
		child.send({ direction: 'call', name, payload: EJSON.stringify(msg), callbackId })
	})
let registered
const registration = new Promise((resolve) => (registered = resolve))

child.on('message', (msg) => {
	if (msg.direction === 'response') {
		const waiting = pending.get(msg.callbackId)
		pending.delete(msg.callbackId)
		const data = msg.payload ? EJSON.parse(msg.payload) : undefined
		if (waiting) (msg.success ? waiting.resolve : waiting.reject)(data)
		return
	}
	const data = msg.payload ? EJSON.parse(msg.payload) : undefined
	calls.push(msg.name)
	if (msg.name === 'register') registered(data)
	if (msg.name === 'set-status') statuses.push(data)
	if (msg.name === 'log-message') logs.push(data)
	if (msg.name === 'log-message' && process.env.HOST_TEST_LOG) console.log('  [module log]', JSON.stringify(data))
	if (msg.name === 'setVariableValues') {
		variableSends += 1
		for (const { id, value } of data.newValues || []) variables[id] = value
	}
	// Anything asked of Companion with a callback gets an empty yes.
	if (msg.callbackId)
		child.send({ direction: 'response', callbackId: msg.callbackId, success: true, payload: EJSON.stringify({}) })
})
const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)))
const wait = (ms) => new Promise((done) => setTimeout(done, ms))

const reg = await Promise.race([
	registration,
	exited.then((code) => ({ exited: code })),
	wait(8000).then(() => ({ timeout: true })),
])
check(
	'it starts and registers with Companion',
	reg && !reg.exited && !reg.timeout && reg.connectionId === 'cuemark-test',
	JSON.stringify(reg) + (reg?.exited !== undefined ? `\n${output}` : ''),
)
if (reg?.exited === undefined && !reg?.timeout) {
	// Companion 4.0 shipped framework 1.12, 4.1 shipped 1.13: a module asking
	// for more than 1.12 would not start on a Companion 4.0.
	check(
		'on a framework version every Companion from 4.0 to 5.1 can run',
		/^1\.12\./.test(reg.apiVersion),
		`apiVersion ${reg.apiVersion}`,
	)
	await call('init', {
		label: 'cuemark',
		isFirstInit: false,
		config: { host: '127.0.0.1', port: String(port), key: 'K3Y', poll: true },
		lastUpgradeIndex: -1,
		feedbacks: {},
		actions: {},
	})
	await wait(1500)
	for (const name of [
		'setActionDefinitions',
		'setFeedbackDefinitions',
		'setVariableDefinitions',
		'setPresetDefinitions',
	]) {
		check(
			`init gives Companion its ${name.replace('set', '').replace('Definitions', '').toLowerCase()}`,
			calls.includes(name),
		)
	}
	check(
		'it reads Cuemark and says it is OK',
		statuses.some((s) => s.status === 'ok'),
		JSON.stringify(statuses.slice(-3)),
	)
	check(
		'what is on deck, and main and backup, come through as variables',
		variables.deck === 'LX 12' && variables.follow === 'BACKUP · MAIN LOST',
		JSON.stringify(variables),
	)
	heard.length = 0
	await call('executeAction', {
		action: { id: 'a1', controlId: 'bank:1', actionId: 'take_over', options: {}, upgradeIndex: null, disabled: false },
		surfaceId: undefined,
	})
	await call('executeAction', {
		action: {
			id: 'a2',
			controlId: 'bank:2',
			actionId: 'lines_next',
			options: { count: 5 },
			upgradeIndex: null,
			disabled: false,
		},
		surfaceId: undefined,
	})
	await wait(400)
	check(
		'a Take over button press reaches Cuemark, with the key',
		heard.includes('/take-over?key=K3Y'),
		heard.join(', '),
	)
	check('a jump button set to 5 lines asks for 5', heard.includes('/lines/next/5?key=K3Y'), heard.join(', '))
	await call('executeAction', {
		action: {
			id: 'a3',
			controlId: 'bank:3',
			actionId: 'page_number',
			options: { page: 12.5 },
			upgradeIndex: null,
			disabled: false,
		},
		surfaceId: undefined,
	})
	await wait(300)
	check('Go to page with 12.5 typed goes to a whole page', heard.includes('/page/13?key=K3Y'), heard.join(', '))

	// Nothing changes in Cuemark: nothing is sent again (Bitfocus review N1).
	const okCount = statuses.filter((entry) => entry.status === 'ok').length
	const sendsBefore = variableSends
	await wait(1600)
	check(
		'with nothing changing, no variables or OK status are sent again',
		variableSends === sendsBefore && statuses.filter((entry) => entry.status === 'ok').length === okCount,
		`${variableSends - sendsBefore} variable sends, ${statuses.filter((entry) => entry.status === 'ok').length - okCount} more OKs`,
	)

	// A wrong key: the poll says so, not only a button press (review M1).
	const config = { host: '127.0.0.1', port: String(port), poll: true }
	await call('updateConfigAndLabel', { label: 'cuemark', config: { ...config, key: 'K3X' } })
	await wait(1200)
	const last = statuses.at(-1)
	check(
		'a wrong key shows as a bad config straight away, from the poll',
		last?.status === 'bad_config' && /Key refused/.test(last?.message || ''),
		JSON.stringify(statuses.slice(-3)),
	)

	// Read what is on deck off: checked once, then left alone (review L1).
	heard.length = 0
	await call('updateConfigAndLabel', { label: 'cuemark', config: { ...config, key: 'K3Y', poll: false } })
	await wait(1600)
	check(
		'with Read what is on deck off, Cuemark is asked once and the status says OK',
		heard.filter((entry) => entry.startsWith('/state')).length === 1 && statuses.at(-1)?.status === 'ok',
		`${heard.join(', ')} · ${JSON.stringify(statuses.at(-1))}`,
	)

	// Cuemark closed: said once, logged once, not twice a second (review L2).
	const logsBefore = logs.length
	const failuresBefore = statuses.filter((entry) => entry.status === 'connection_failure').length
	await call('updateConfigAndLabel', { label: 'cuemark', config: { ...config, key: 'K3Y', port: '1' } })
	await wait(4000)
	const failures = statuses.filter((entry) => entry.status === 'connection_failure').length - failuresBefore
	check(
		'with Cuemark not answering, it says so once and logs it once',
		failures === 1 && logs.length - logsBefore === 1,
		`${failures} statuses, ${logs.length - logsBefore} log lines`,
	)
	await call('destroy', {}).catch(() => null)
}
child.kill()
cuemark.close()
console.log(`\n${passed}/${passed + failed} checks of the module running as Companion runs it`)
process.exit(failed ? 1 : 0)
