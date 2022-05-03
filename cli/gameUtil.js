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

		console.table(await server.games.show_game(id));
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

export async function list_games(category) {
	const server = new Server();

	await server.open;
	const list = [];

	for (let game of await server.games.list_games(category)) {
		const g = { ...game };
		delete g.index;
		delete g.controls;
		list.push(g);
	}

	console.table(list);

	await server.close();
}

export async function show_game(id) {
	const server = new Server();

	await server.open;

	id = await resolve_id(server, id);

	console.table(await server.games.show_game(id));

	await server.close();
}

export async function delete_game(id) {
	const server = new Server();

	await server.open;

	id = await resolve_id(server, id, true);

	const deleted = await server.games.delete_game(id);

	if (deleted) {
		console.log('Game deleted.');
	} else {
		console.log("Game wasn't deleted. Is the ID valid?");
	}

	await server.close();
}

export async function update_game(id, { name, type, src, category, controls }) {
	const server = new Server();

	await server.open;

	id = await resolve_id(server, id);

	await server.games.update_game(
		id,
		name,
		type,
		src,
		category,
		JSON.parse(controls || '[]')
	);

	console.log('Updated game.');

	await server.close();
}

export async function create_game({ name, type, src, category, controls }) {
	const server = new Server();

	await server.open;

	const game = await server.games.create_game(
		name,
		type,
		src,
		category,
		JSON.parse(controls || '[]')
	);

	console.log(`Game created. ID: ${game.id.toString('hex')}`);

	await server.close();
}
