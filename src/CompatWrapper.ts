import type { Client } from 'pg';

export const proxyTypes = ['ultraviolet', 'rammerhead', 'stomp'];

interface Compat {
	host: string;
	proxy: 'ultraviolet' | 'rammerhead' | 'stomp' | string;
}

export function validate(compat: Compat): compat is Compat {
	if ('host' in compat) {
		if (typeof compat.host !== 'string') {
			throw new TypeError('Compat host was not a string');
		}
	}

	if ('proxy' in compat) {
		if (!proxyTypes.includes(compat.proxy)) {
			throw new TypeError(
				`Proxy type was not one of the following: ${proxyTypes}`
			);
		}
	}

	return true;
}

export default class CompatWrapper {
	client: Client;
	constructor(client: Client) {
		this.client = client;
	}
	async show(host: string): Promise<Compat> {
		const {
			rows: [result],
		} = await this.client.query('SELECT * FROM compat WHERE host = $1', [host]);

		if (result === undefined) {
			throw new RangeError(`Proxy with host ${host} doesn't exist.`);
		}

		return result;
	}
	async list(): Promise<Compat[]> {
		const { rows: compat } = await this.client.query('SELECT * FROM compat;');
		return compat;
	}
	async delete(host: string): Promise<Boolean> {
		const { rowCount } = await this.client.query(
			'DELETE FROM compat WHERE host = $1;',
			[host]
		);

		return rowCount !== 0;
	}
	async create(host: Compat['host'], proxy: Compat['proxy']): Promise<Compat> {
		const compat: Compat = {
			host,
			proxy,
		};

		validate(compat);

		await this.client.query(
			'INSERT INTO compat (host, proxy) VALUES ($1, $2);',
			[compat.host, compat.proxy]
		);

		return compat;
	}
	async update(host: Compat['host'], proxy?: Compat['proxy']): Promise<Compat> {
		let compat = await this.show(host);

		if (proxy === undefined) {
			proxy = compat.proxy;
		}

		compat = {
			host,
			proxy,
		};

		validate(compat);

		await this.client.query('UPDATE compat SET proxy = $1 WHERE host = $2', [
			compat.proxy,
			compat.host,
		]);

		return compat;
	}
}
