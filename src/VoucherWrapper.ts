import type { Client } from 'pg';

export const tldTypes = ['.com', '.org', '.net', '.us', '.xyz'];

// (rounded to nearest whole)
export const FLOOR_TLD_PRICES: Record<string, number> = {
	'.com': 12,
	'.org': 12,
	'.net': 12,
	'.us': 3,
	'.xyz': 3,
};

export enum VoucherStatus {
	valid = 0,
	redeemed = 1,
	invalid = 2,
}

export interface Voucher {
	code: string;
	tld: '.com' | '.org' | '.net' | '.us' | '.xyz' | string;
	issued: Date;
	status: VoucherStatus;
	name?: string;
	redeemed_on?: Date;
}

export default class VoucherWrapper {
	client: Client;
	constructor(client: Client) {
		this.client = client;
	}
	async show(code: string) {
		return (
			await this.client.query<Voucher>(
				'SELECT * FROM vouchers WHERE code = $1',
				[code]
			)
		).rows[0] as Voucher | undefined;
	}
	async list() {
		return (await this.client.query<Voucher>('SELECT * FROM vouchers;')).rows;
	}
	async redeem(code: string, name: string) {
		const { rowCount } = await this.client.query(
			'UPDATE vouchers SET status = 1, name = $1, redeemed_on = CURRENT_DATE WHERE code = $2 AND status = 0;',
			[name, code]
		);

		return rowCount !== 0;
	}
	async delete(code: string) {
		const { rowCount } = await this.client.query(
			'DELETE FROM vouchers WHERE code = $1;',
			[code]
		);

		return rowCount !== 0;
	}
	async create(tld: Voucher['tld']) {
		return (
			await this.client.query<Voucher>(
				'INSERT INTO vouchers (code, tld) VALUES ($1, $2) RETURNING *;',
				[Math.random().toString(36).slice(2), tld]
			)
		).rows[0];
	}
}
