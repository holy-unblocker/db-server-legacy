export const TLD_TYPES = ['.com', '.org', '.net', '.us', '.xyz'];

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
		 * @type {import('../voucher-backend/Server.js').default}
		 */
		this.server = server;
	}
	/**
	 *
	 * @param {string} host
	 * @returns {Voucher}
	 */
	async show(code) {
		const result = await this.server.client.get(
			'SELECT * FROM vouchers WHERE code = $1',
			[code]
		);

		if (result === undefined) {
			throw new RangeError(`Voucher with code ${code} doesn't exist.`);
		}

		return result;
	}
	/**
	 * @returns {Voucher[]}
	 */
	async list() {
		const vouchers = await this.server.client.all('SELECT * FROM vouchers;');

		return vouchers;
	}
	/**
	 * @param {string} code
	 */
	async delete(code) {
		const { changes } = await this.server.client.run(
			'DELETE FROM vouchers WHERE code = $1;',
			[code]
		);

		return changes !== 0;
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

		await this.server.client.run(
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

		await this.server.client.run(
			'UPDATE vouchers SET tld = $1 WHERE code = $2',
			[voucher.tld, voucher.code]
		);

		return voucher;
	}
}
