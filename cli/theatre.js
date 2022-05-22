import { config } from 'dotenv-flow';
config();

import TheatreWrapper, { THEATRE_TYPES } from '../TheatreWrapper.js';
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
	const games = new TheatreWrapper(server);

	if (!isNaN(i)) {
		const id = await games.id_at_index(i);

		if (confirm !== true) {
			return id;
		}

		console.table(await games.show(id));
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
	.requiredOption(`-t, --type <${THEATRE_TYPES}>`)
	.requiredOption('-s, --src <url>')
	.action(async ({ name, type, src, category, controls }) => {
		const server = new Server();
		await server.open;
		const games = new TheatreWrapper(server);

		if (typeof controls === 'string') {
			controls = JSON.parse(controls);
		} else {
			controls = [];
		}

		if (typeof category === 'string') {
			category = category.split(',');
		} else {
			category = [];
		}

		const game = await games.create(name, type, src, category, controls);

		console.log(`Game created. ID: ${game.id.toString('hex')}`);

		await server.close();
	});

program
	.command('update')
	.argument('id')
	.option('-n, --name <name>')
	.option('-c, --category <category>')
	.option('-co, --controls <controls>')
	.option(`-t, --type <${THEATRE_TYPES}>`)
	.option('-s, --src <url>')
	.action(async (id, { name, type, src, category, controls }) => {
		const server = new Server();
		await server.open;
		const games = new TheatreWrapper(server);

		id = await resolve_id(server, id);

		if (typeof controls === 'string') {
			controls = JSON.parse(controls);
		}

		if (typeof category === 'string') {
			category = category.split(',');
		}

		await games.update(id, name, type, src, category, controls);

		console.log('Updated game.');

		await server.close();
	});

program
	.command('show')
	.argument('id')
	.action(async id => {
		const server = new Server();
		await server.open;
		const games = new TheatreWrapper(server);

		id = await resolve_id(server, id);

		console.table(await games.show(id));

		await server.close();
	});

program
	.command('delete')
	.argument('id')
	.action(async id => {
		const server = new Server();
		await server.open;
		const games = new TheatreWrapper(server);

		id = await resolve_id(server, id, true);

		const deleted = await games.delete(id);

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
		const games = new TheatreWrapper(server);

		const list = [];

		for (let game of await games.list(category)) {
			const g = { ...game };
			delete g.index;
			delete g.controls;
			list.push(g);
		}

		console.table(list);

		await server.close();
	});

program.parse(process.argv);
