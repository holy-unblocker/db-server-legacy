import '../collectENV.js';
import type { TheatreEntry } from '../TheatreWrapper.js';
import TheatreWrapper, { theatreTypes } from '../TheatreWrapper.js';
import dbConnect from '../dbConnect.js';
import { Command } from 'commander';
import type { Client } from 'pg';
import promptly from 'promptly';

async function resolveID(client: Client, i: string, confirm?: boolean) {
	const theatre = new TheatreWrapper(client);
	const number = parseInt(i);

	if (!isNaN(number)) {
		const id = await theatre.indexID(number);

		if (confirm !== true) {
			return id;
		}

		console.table(await theatre.show(id));
		if (await promptly.confirm('Is this the correct game? (y/n)')) {
			return id;
		} else {
			await client.end();
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
	.requiredOption(`-t, --type <${theatreTypes}>`)
	.requiredOption('-s, --src <url>')
	.action(async ({ name, type, src, category, controls }) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);

		if (typeof controls === 'string') controls = JSON.parse(controls);
		else controls = [];

		if (typeof category === 'string') category = category.split(',');
		else category = [];

		const game = await theatre.create(name, type, src, category, controls);

		console.log(`Game created. ID: ${game.id.toString()}`);

		await client.end();
	});

program
	.command('update')
	.argument('id')
	.option('-n, --name <name>')
	.option('-c, --category <category>')
	.option('-co, --controls <controls>')
	.option(`-t, --type <${theatreTypes}>`)
	.option('-s, --src <url>')
	.action(async (id, { name, type, src, category, controls }) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);
		id = await resolveID(client, id);
		if (typeof controls === 'string') controls = JSON.parse(controls);
		if (typeof category === 'string') category = category.split(',');
		await theatre.update(id, name, type, src, category, controls);
		console.log('Updated game.');
		await client.end();
	});

program
	.command('show')
	.argument('id')
	.action(async (id) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);
		id = await resolveID(client, id);
		console.table(await theatre.show(id));
		await client.end();
	});

program
	.command('delete')
	.argument('id')
	.action(async (id) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);
		id = await resolveID(client, id, true);
		const deleted = await theatre.delete(id);
		if (deleted) console.log('Game deleted.');
		else console.log("Game wasn't deleted. Is the ID valid?");
		await client.end();
	});

program
	.command('list')
	.argument('[category]')
	.action(async (category) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);

		const list: Omit<TheatreEntry, 'controls'>[] = [];

		for (const game of (await theatre.list(category)).entries) {
			const g: Partial<TheatreEntry> = { ...game };
			delete g.controls;
			list.push(g as Omit<TheatreEntry, 'controls'>);
		}

		console.table(list);

		await client.end();
	});

program.parse(process.argv);
