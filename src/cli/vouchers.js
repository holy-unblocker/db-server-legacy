import Server from '../Server.js';
import VoucherWrapper, { TLD_TYPES } from '../VoucherWrapper.js';
import { Command } from 'commander';
import { expand } from 'dotenv-expand';
import { config } from 'dotenv-flow';

expand(config());

const program = new Command();

program
	.command('create')
	.argument(`<${TLD_TYPES}>`)
	.action(async tld => {
		const server = new Server();
		await server.openDB();
		const voucher = new VoucherWrapper(server);

		const { code } = await voucher.create(tld);

		console.log('Voucher created.');

		console.log(code);

		await server.closeDB();
	});

program
	.command('bulk-create')
	.argument('tld', `<${TLD_TYPES}>`)
	.argument('amount', 'Amount of vouchers to create')
	.action(async (tld, amount) => {
		const server = new Server();
		await server.openDB();
		const voucher = new VoucherWrapper(server);

		for (let i = 0; i < amount; i++) {
			const { code } = await voucher.create(tld);
			console.log(code);
		}

		await server.closeDB();
	});

program
	.command('update')
	.argument('code')
	.argument(`<${TLD_TYPES}>`)
	.action(async (code, tld) => {
		const server = new Server();
		await server.openDB();
		const voucher = new VoucherWrapper(server);

		await voucher.update(code, tld);

		console.log('Updated voucher.');

		await server.closeDB();
	});

program
	.command('show')
	.argument('code')
	.action(async code => {
		const server = new Server();
		await server.openDB();
		const voucher = new VoucherWrapper(server);

		console.table(await voucher.show(code));

		await server.closeDB();
	});

program
	.command('delete')
	.argument('code')
	.action(async code => {
		const server = new Server();
		await server.openDB();
		const voucher = new VoucherWrapper(server);

		const deleted = await voucher.delete(code);

		if (deleted) {
			console.log('Voucher deleted.');
		} else {
			console.log("Voucher wasn't deleted. Is the code valid?");
		}

		await server.closeDB();
	});

program.command('list').action(async () => {
	const server = new Server();
	await server.openDB();
	const voucher = new VoucherWrapper(server);

	console.table(await voucher.list());

	await server.closeDB();
});

program.parse(process.argv);
