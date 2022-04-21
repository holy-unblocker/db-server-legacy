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
		const id = await server.id_at_index(i);

		if (confirm !== true) {
			return id;
		}

		console.table(await server.show_game(id));
		if (await promptly.confirm('Is this the correct game? (y/n)')) {
			return id;
		} else {
			process.exit();
		}
	} else if (typeof i === 'string') {
		return i;
	} else {
		throw new TypeError(`Unknown ID type ${typeof i}`);
	}
}

export async function list_games() {
	const server = new Server();

	await server.open;

	console.table(await server.list_games());
}

export async function show_game(id) {
	const server = new Server();

	await server.open;

	id = await resolve_id(server, id);

	console.table(await server.show_game(id));
}

export async function delete_game(id) {
	const server = new Server();

	await server.open;

	id = await resolve_id(server, id, true);

	const deleted = await server.delete_game(id);

	if (deleted) {
		console.log(`Game deleted.`);
	} else {
		console.log(`Game wasn't deleted. Is the ID valid?`);
	}
}

export async function create_game({ name, type, src }) {
	const server = new Server();

	await server.open;

	const game = await server.add_game(name, type, src);

	console.log(`Game created. ID: ${game.id.toString('hex')}`);
}
