import '../collectENV.js';
import type { TheatreEntry } from '../TheatreWrapper.js';
import TheatreWrapper, { theatreTypes } from '../TheatreWrapper.js';
import dbConnect from '../dbConnect.js';
import { Command } from 'commander';

const program = new Command();

program
	.command('create')
	.requiredOption('-n, --name <name>')
	.requiredOption('-c, --category <category...>')
	.option('-co, --controls <controls>')
	.requiredOption(`-t, --type <${theatreTypes}>`)
	.requiredOption('-s, --src <url>')
	.action(
		async ({
			name,
			type,
			src,
			category,
			controls,
		}: {
			name: string;
			category: string[];
			controls: string;
			type: string;
			src: string;
		}) => {
			const client = await dbConnect();
			const theatre = new TheatreWrapper(client);

			const entry = await theatre.create(
				name,
				type,
				src,
				category,
				controls ? JSON.parse(controls) : []
			);

			console.log(`Enty added. ID: ${entry.id.toString()}`);

			await client.end();
		}
	);

program
	.command('update')
	.argument('id')
	.option('-n, --name <name>')
	.option('-c, --category <category...>')
	.option('-co, --controls <controls>', '[]')
	.option(`-t, --type <${theatreTypes}>`)
	.option('-s, --src <url>')
	.action(
		async (
			id: string,
			{
				name,
				type,
				src,
				category,
				controls,
			}: {
				name: string;
				type: string;
				src: string;
				category: string[];
				controls: string;
			}
		) => {
			const client = await dbConnect();
			const theatre = new TheatreWrapper(client);
			await theatre.update(
				id,
				name,
				type,
				src,
				category,
				controls ? JSON.parse(controls) : []
			);
			console.log('Updated entry.');
			await client.end();
		}
	);

program
	.command('show')
	.argument('id')
	.action(async (id: string) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);
		console.table(await theatre.show(id));
		await client.end();
	});

program
	.command('delete')
	.argument('id')
	.action(async (id: string) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);
		const deleted = await theatre.delete(id);
		if (deleted) console.log('Game deleted.');
		else console.log("Game wasn't deleted. Is the ID valid?");
		await client.end();
	});

program
	.command('list')
	.argument('[category]')
	.action(async (category: string | undefined) => {
		const client = await dbConnect();
		const theatre = new TheatreWrapper(client);

		const list: Omit<TheatreEntry, 'controls'>[] = [];

		for (const game of (await theatre.list({ category })).entries) {
			const g: Partial<TheatreEntry> = { ...game };
			delete g.controls;
			list.push(g as Omit<TheatreEntry, 'controls'>);
		}

		console.table(list);

		await client.end();
	});

program.parse(process.argv);
