export const TLD_TYPES = ['.com', '.org', '.net', '.us', '.xyz'];

// (rounded to nearest whole)
export const FLOOR_TLD_PRICES = {
	'.com': 10,
	'.org': 11,
	'.net': 12,
	'.us': 3,
	'.xyz': 1,
};

/**
 * @typedef {object} Voucher
 * @property {string} code
 * @property {'.com'|'.org'|'.net'|'.us'|'.xyz'} proxy
 */

/**
 *
 * @param {Voucher} voucher
 */
export function validate_voucher(voucher) {
	if ('code' in voucher) {
		if (typeof voucher.code !== 'string') {
			throw new TypeError('Voucher code was not a string');
		}
	}

	if ('tld' in voucher) {
		if (!TLD_TYPES.includes(voucher.tld)) {
			throw new TypeError(
				`Voucher TLD was not one of the following: ${TLD_TYPES}`
			);
		}
	}
}

export default class VoucherWrapper {
	constructor(server) {
		/**
		 * @type {import('./Server.js').default}
		 */
		this.server = server;
	}
	/**
	 *
	 * @param {string} host
	 * @returns {Voucher}
	 */
	async show(code) {
		const {
			rows: [row],
		} = await this.server.client.query(
			'SELECT * FROM vouchers WHERE code = $1',
			[code]
		);

		if (row === undefined) {
			throw new RangeError(`Voucher with code ${code} doesn't exist.`);
		}

		return row;
	}
	/**
	 * @returns {Voucher[]}
	 */
	async list() {
		const { rows } = await this.server.client.query('SELECT * FROM vouchers;');

		return rows;
	}
	/**
	 * @param {string} code
	 */
	async delete(code) {
		const { rowCount } = await this.server.client.query(
			'DELETE FROM vouchers WHERE code = $1;',
			[code]
		);

		return rowCount !== 0;
	}
	/**
	 *
	 * @param {string} tld
	 * @returns {Voucher}
	 */
	async create(tld) {
		const voucher = {
			code: Math.random().toString(36).slice(2),
			tld,
		};

		validate_voucher(voucher);

		await this.server.client.query(
			'INSERT INTO vouchers (code, tld) VALUES ($1, $2);',
			[voucher.code, voucher.tld]
		);

		return voucher;
	}
	/**
	 *
	 * @param {string} code
	 * @param {string} [tld]
	 */
	async update(code, tld) {
		let voucher = await this.show(code);

		if (tld === undefined) {
			tld = voucher.tld;
		}

		voucher = {
			code,
			tld,
		};

		validate_voucher(voucher);

		await this.server.client.query(
			'UPDATE vouchers SET tld = $1 WHERE code = $2',
			[voucher.tld, voucher.code]
		);

		return voucher;
	}
}
