import Server from '../Server.js';

export async function list_compat() {
	const server = new Server();

	await server.open;

	console.table(await server.compat.list_compat());

	await server.close();
}

export async function show_compat(host) {
	const server = new Server();

	await server.open;

	console.table(await server.compat.show_compat(host));

	await server.close();
}

export async function delete_compat(host) {
	const server = new Server();

	await server.open;

	const deleted = await server.compat.delete_compat(host);

	if (deleted) {
		console.log('Compat deleted.');
	} else {
		console.log("Compat wasn't deleted. Is the host valid?");
	}

	await server.close();
}

export async function update_compat(host, { proxy }) {
	const server = new Server();

	await server.open;

	await server.compat.update_compat(host, proxy);

	console.log('Updated compat.');

	await server.close();
}

export async function create_compat(host, { proxy }) {
	const server = new Server();

	await server.open;

	await server.compat.create_compat(host, proxy);

	console.log('Compat created.');

	await server.close();
}
