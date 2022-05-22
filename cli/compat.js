import { config } from 'dotenv-flow';
config();

import CompatWrapper, { PROXY_TYPES } from '../CompatWrapper.js';
import { Command } from 'commander';
import Server from '../Server.js';

const program = new Command();

program
	.command('create')
	.argument('host')
	.argument('proxy', `<${PROXY_TYPES}>`)
	.action(async (host, proxy) => {
		const server = new Server();
		await server.open;
		const compat = new CompatWrapper(server);

		await compat.create(host, proxy);

		console.log('Compat created.');

		await server.close();
	});

program
	.command('update')
	.argument('host')
	.argument('proxy', `<${PROXY_TYPES}>`)
	.action(async (host, proxy) => {
		const server = new Server();

		await server.open;

		const compat = new CompatWrapper(server);

		await compat.update(host, proxy);

		console.log('Updated compat.');

		await server.close();
	});

program
	.command('show')
	.argument('host')
	.action(async host => {
		const server = new Server();
		await server.open;
		const compat = new CompatWrapper(server);

		console.table(await compat.show(host));

		await server.close();
	});

program
	.command('delete')
	.argument('host')
	.action(async host => {
		const server = new Server();
		await server.open;
		const compat = new CompatWrapper(server);

		const deleted = await compat.delete(host);

		if (deleted) {
			console.log('Compat deleted.');
		} else {
			console.log("Compat wasn't deleted. Is the host valid?");
		}

		await server.close();
	});

program.command('list').action(async () => {
	const server = new Server();
	await server.open;
	const compat = new CompatWrapper(server);

	console.table(await compat.list());

	await server.close();
});

program.parse(process.argv);
