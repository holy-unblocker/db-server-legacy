import type { Client } from 'pg';

export const tldTypes = ['.com', '.org', '.net', '.us', '.xyz'];

// (rounded to nearest whole)
export const FLOOR_TLD_PRICES = {
	'.com': 10,
	'.org': 11,
	'.net': 12,
	'.us': 3,
	'.xyz': 3,
};

interface Voucher {
	code: string;
	tld: '.com' | '.org' | '.net' | '.us' | '.xyz';
}

function validateVoucher(voucher: Voucher) {
	if ('code' in voucher) {
		if (typeof voucher.code !== 'string') {
			throw new TypeError('Voucher code was not a string');
		}
	}

	if ('tld' in voucher) {
		if (!tldTypes.includes(voucher.tld)) {
			throw new TypeError(
				`Voucher TLD was not one of the following: ${tldTypes}`
			);
		}
	}
}

export default class VoucherWrapper {
	client: Client;
	constructor(client: Client) {
		this.client = client;
	}
	async show(code: string): Promise<Voucher> {
		const {
			rows: [row],
		} = await this.client.query('SELECT * FROM vouchers WHERE code = $1', [
			code,
		]);

		if (row === undefined) 
			throw new RangeError(`Voucher with code ${code} doesn't exist.`);
		

		return row;
	}
	async list(): Promise<Voucher[]> {
		const { rows } = await this.client.query('SELECT * FROM vouchers;');

		return rows;
	}
	async delete(code: string) {
		const { rowCount } = await this.client.query(
			'DELETE FROM vouchers WHERE code = $1;',
			[code]
		);

		return rowCount !== 0;
	}
	async create(tld: Voucher['tld']): Promise<Voucher> {
		const voucher: Voucher = {
			code: Math.random().toString(36).slice(2),
			tld,
		};

		validateVoucher(voucher);

		await this.client.query(
			'INSERT INTO vouchers (code, tld) VALUES ($1, $2);',
			[voucher.code, voucher.tld]
		);

		return voucher;
	}
	async update(code: string, tld?: string): Promise<Voucher> {
		let voucher = await this.show(code);

		if (tld === undefined) {
			tld = voucher.tld;
		}

		voucher = {
			code,
			tld: <Voucher['tld']>tld,
		};

		validateVoucher(voucher);

		await this.client.query('UPDATE vouchers SET tld = $1 WHERE code = $2', [
			voucher.tld,
			voucher.code,
		]);

		return voucher;
	}
}
