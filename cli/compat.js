import CompatWrapper, { PROXY_TYPES } from '../src/CompatWrapper.js';
import Server from '../src/Server.js';
import { Command } from 'commander';
import { config } from 'dotenv-flow';

config();

const program = new Command();

program
	.command('create')
	.argument('host')
	.argument('proxy', `<${PROXY_TYPES}>`)
	.action(async (host, proxy) => {
		const server = new Server();
		await server.openDB();
		const compat = new CompatWrapper(server);

		await compat.create(host, proxy);

		console.log('Compat created.');

		await server.closeDB();
	});

program
	.command('update')
	.argument('host')
	.argument('proxy', `<${PROXY_TYPES}>`)
	.action(async (host, proxy) => {
		const server = new Server();
		await server.openDB();
		const compat = new CompatWrapper(server);
		await compat.update(host, proxy);
		console.log('Updated compat.');
		await server.closeDB();
	});

program
	.command('show')
	.argument('host')
	.action(async host => {
		const server = new Server();
		await server.openDB();
		const compat = new CompatWrapper(server);
		console.table(await compat.show(host));
		await server.closeDB();
	});

program
	.command('delete')
	.argument('host')
	.action(async host => {
		const server = new Server();
		await server.openDB();
		const compat = new CompatWrapper(server);
		const deleted = await compat.delete(host);

		if (deleted) console.log('Compat deleted.');
		else console.log("Compat wasn't deleted. Is the host valid?");

		await server.closeDB();
	});

program.command('list').action(async () => {
	const server = new Server();
	await server.openDB();
	const compat = new CompatWrapper(server);
	console.table(await compat.list());
	await server.closeDB();
});

program.parse(process.argv);
