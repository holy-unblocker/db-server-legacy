export const PROXY_TYPES = ['ultraviolet', 'rammerhead', 'stomp'];

/**
 * @typedef {object} Compat
 * @property {string} host
 * @property {'ultraviolet'|'rammerhead'|'stomp'} proxy
 */

/**
 *
 * @param {Compat} compat
 * @returns {object}
 */
export function compat_to_query(compat) {
	const query = {};

	if ('host' in compat) {
		if (typeof compat.host !== 'string') {
			throw new TypeError('Compat host was not a string');
		}

		query.$host = compat.host;
	}

	if ('proxy' in compat) {
		if (!PROXY_TYPES.includes(compat.proxy)) {
			throw new TypeError(
				`Proxy type was not one of the following: ${PROXY_TYPES}`
			);
		}

		query.$proxy = compat.proxy;
	}

	return query;
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
	async show_compat(host) {
		const result = await this.server.db.get(
			'SELECT * FROM compat WHERE host = $host',
			compat_to_query({
				host,
			})
		);

		if (result === undefined) {
			throw new RangeError(`Proxy with host ${host} doesn't exist.`);
		}

		return result;
	}
	/**
	 * @returns {Compat[]}
	 */
	async list_compat() {
		return await this.server.db.all('SELECT * FROM compat;');
	}
	/**
	 * @param {string} host
	 */
	async delete_compat(host) {
		const { changes } = await this.server.db.run(
			'DELETE FROM compat WHERE host = $host;',
			compat_to_query({
				host,
			})
		);

		return changes !== 0;
	}
	/**
	 *
	 * @param {string} host
	 * @param {string} proxy
	 * @returns {Game}
	 */
	async create_compat(host, proxy) {
		const compat = {
			host,
			proxy,
		};

		await this.server.db.run(
			'INSERT INTO compat (host, proxy) VALUES ($host, $proxy);',
			compat_to_query(compat)
		);

		return compat;
	}
	/**
	 *
	 * @param {string} host
	 * @param {string} [proxy]
	 */
	async update_compat(host, proxy) {
		let compat = await this.show_compat(host);

		if (proxy === undefined) {
			proxy = compat.proxy;
		}

		compat = {
			host,
			proxy,
		};

		await this.server.db.run(
			'UPDATE compat SET proxy = $proxy WHERE host = $host',
			compat_to_query(compat)
		);

		return compat;
	}
}
