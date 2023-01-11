import '../collectENV.js';
import CompatWrapper, { proxyTypes } from '../CompatWrapper.js';
import dbConnect from '../dbConnect.js';
import { Command } from 'commander';

const program = new Command();

program
	.command('create')
	.argument('host')
	.argument('proxy', `<${proxyTypes}>`)
	.action(async (host: string, proxy: string) => {
		const client = await dbConnect();
		const compat = new CompatWrapper(client);
		await compat.create(host, proxy);
		console.log('Compat created.');
		await client.end();
	});

program
	.command('update')
	.argument('host')
	.argument('proxy', `<${proxyTypes}>`)
	.action(async (host: string, proxy: string) => {
		const client = await dbConnect();
		const compat = new CompatWrapper(client);
		await compat.update(host, proxy);
		console.log('Updated compat.');
		await client.end();
	});

program
	.command('show')
	.argument('host')
	.action(async (host: string) => {
		const client = await dbConnect();
		const compat = new CompatWrapper(client);
		console.table(await compat.show(host));
		await client.end();
	});

program
	.command('delete')
	.argument('host')
	.action(async (host: string) => {
		const client = await dbConnect();
		const compat = new CompatWrapper(client);
		const deleted = await compat.delete(host);
		if (deleted) console.log('Compat deleted.');
		else console.log("Compat wasn't deleted. Is the host valid?");
		await client.end();
	});

program.command('list').action(async () => {
	const client = await dbConnect();
	const compat = new CompatWrapper(client);
	console.table(await compat.list());
	await client.end();
});

program.parse(process.argv);
