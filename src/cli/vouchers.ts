import '../collectENV.js';
import VoucherWrapper, { tldTypes } from '../VoucherWrapper.js';
import dbConnect from '../dbConnect.js';
import { Command } from 'commander';

const program = new Command();

program
	.command('create')
	.argument(`<${tldTypes}>`)
	.action(async (tld) => {
		const client = await dbConnect();
		const voucher = new VoucherWrapper(client);
		const { code } = await voucher.create(tld);
		console.log('Voucher created.');
		console.log(code);
		await client.end();
	});

program
	.command('bulk-create')
	.argument('tld', `<${tldTypes}>`)
	.argument('amount', 'Amount of vouchers to create')
	.action(async (tld, amount) => {
		const client = await dbConnect();
		const voucher = new VoucherWrapper(client);

		for (let i = 0; i < amount; i++) {
			const { code } = await voucher.create(tld);
			console.log(code);
		}

		await client.end();
	});

program
	.command('show')
	.argument('code')
	.action(async (code) => {
		const client = await dbConnect();
		const voucher = new VoucherWrapper(client);
		console.table(await voucher.show(code));
		await client.end();
	});

program
	.command('delete')
	.argument('code')
	.action(async (code) => {
		const client = await dbConnect();
		const voucher = new VoucherWrapper(client);

		const deleted = await voucher.delete(code);

		if (deleted) {
			console.log('Voucher deleted.');
		} else {
			console.log("Voucher wasn't deleted. Is the code valid?");
		}

		await client.end();
	});

program.command('list').action(async () => {
	const client = await dbConnect();
	const voucher = new VoucherWrapper(client);
	console.table(await voucher.list());
	await client.end();
});

program.parse(process.argv);
