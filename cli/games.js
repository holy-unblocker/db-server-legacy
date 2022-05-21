import { config } from 'dotenv-flow';
config();

import { GAME_TYPES } from '../GamesWrapper.js';
import { Command } from 'commander';
import promptly from 'promptly';
import Server from '../Server.js';

/**
 *
 * @param {import('../Server.js').default} server
 * @param {string|number} i
 * @returns
 */
async function resolve_id(server, i, confirm) {
	if (!isNaN(i)) {
		const id = await server.games.id_at_index(i);

		if (confirm !== true) {
			return id;
		}

		console.table(await server.games.show(id));
		if (await promptly.confirm('Is this the correct game? (y/n)')) {
			return id;
		} else {
			await server.close();
			process.exit();
		}
	} else if (typeof i === 'string') {
		return i;
	} else {
		throw new TypeError(`Unknown ID type ${typeof i}`);
	}
}

const program = new Command();

program
	.command('create')
	.requiredOption('-n, --name <name>')
	.requiredOption('-c, --category <category>')
	.option('-co, --controls <controls>')
	.requiredOption(`-t, --type <${GAME_TYPES}>`)
	.requiredOption('-s, --src <url>')
	.action(async ({ name, type, src, category, controls }) => {
		const server = new Server();

		await server.open;

		if (typeof controls === 'string') {
			controls = JSON.parse(controls);
		} else {
			controls = [];
		}

		const game = await server.games.create(name, type, src, category, controls);

		console.log(`Game created. ID: ${game.id.toString('hex')}`);

		await server.close();
	});

program
	.command('update')
	.argument('id')
	.option('-n, --name <name>')
	.option('-c, --category <category>')
	.option('-co, --controls <controls>')
	.option(`-t, --type <${GAME_TYPES}>`)
	.option('-s, --src <url>')
	.action(async (id, { name, type, src, category, controls }) => {
		const server = new Server();

		await server.open;

		id = await resolve_id(server, id);

		if (typeof controls === 'string') {
			controls = JSON.parse(controls);
		}

		await server.games.update(id, name, type, src, category, controls);

		console.log('Updated game.');

		await server.close();
	});

program
	.command('show')
	.argument('id')
	.action(async id => {
		const server = new Server();

		await server.open;

		id = await resolve_id(server, id);

		console.table(await server.games.show(id));

		await server.close();
	});

program
	.command('delete')
	.argument('id')
	.action(async id => {
		const server = new Server();

		await server.open;

		id = await resolve_id(server, id, true);

		const deleted = await server.games.delete(id);

		if (deleted) {
			console.log('Game deleted.');
		} else {
			console.log("Game wasn't deleted. Is the ID valid?");
		}

		await server.close();
	});

program
	.command('list')
	.argument('[category]')
	.action(async category => {
		const server = new Server();

		await server.open;
		const list = [];

		for (let game of await server.games.list(category)) {
			const g = { ...game };
			delete g.index;
			delete g.controls;
			list.push(g);
		}

		console.table(list);

		await server.close();
	});
