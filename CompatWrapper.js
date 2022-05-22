export const PROXY_TYPES = ['ultraviolet', 'rammerhead', 'stomp'];

/**
 * @typedef {object} Compat
 * @property {string} host
 * @property {'ultraviolet'|'rammerhead'|'stomp'} proxy
 */

/**
 *
 * @param {Compat} compat
 */
export function validate(compat) {
	if ('host' in compat) {
		if (typeof compat.host !== 'string') {
			throw new TypeError('Compat host was not a string');
		}
	}

	if ('proxy' in compat) {
		if (!PROXY_TYPES.includes(compat.proxy)) {
			throw new TypeError(
				`Proxy type was not one of the following: ${PROXY_TYPES}`
			);
		}
	}
}

export default class CompatWrapper {
	constructor(server) {
		/**
		 * @type {import('./Server.js').default}
		 */
		this.server = server;
	}
	/**
	 *
	 * @param {string} host
	 * @returns {Compat}
	 */
	async show(host) {
		const {
			rows: [result],
		} = await this.server.client.query('SELECT * FROM compat WHERE host = $1', [
			host,
		]);

		if (result === undefined) {
			throw new RangeError(`Proxy with host ${host} doesn't exist.`);
		}

		return result;
	}
	/**
	 * @returns {Compat[]}
	 */
	async list() {
		const { rows: compat } = await this.server.client.query(
			'SELECT * FROM compat;'
		);

		return compat;
	}
	/**
	 * @param {string} host
	 */
	async delete(host) {
		const { rowCount } = await this.server.client.query(
			'DELETE FROM compat WHERE host = $1;',
			[host]
		);

		return rowCount !== 0;
	}
	/**
	 *
	 * @param {string} host
	 * @param {string} proxy
	 * @returns {Voucher}
	 */
	async create(host, proxy) {
		const compat = {
			host,
			proxy,
		};

		validate(compat);

		await this.server.client.query(
			'INSERT INTO compat (host, proxy) VALUES ($1, $2);',
			[compat.host, compat.proxy]
		);

		return compat;
	}
	/**
	 *
	 * @param {string} host
	 * @param {string} [proxy]
	 */
	async update(host, proxy) {
		let compat = await this.show(host);

		if (proxy === undefined) {
			proxy = compat.proxy;
		}

		compat = {
			host,
			proxy,
		};

		validate(compat);

		await this.server.client.query(
			'UPDATE compat SET proxy = $1 WHERE host = $2',
			[compat.proxy, compat.host]
		);

		return compat;
	}
}
