export const THEATRE_TYPES = [
	'emulator.nes',
	'emulator.gba',
	'emulator.genesis',
	'flash',
	'embed',
	'proxy',
];

/**
 *
 * @typedef {'mouseleft'|'mouseright'|'scrollup'|'scrolldown'|'wasd'|'arrows'|string} KeyLike
 * @description one of the above types or a letter/key such as A,B,TAB,SPACE,SHIFT
 */

/**
 *
 * @typedef {object} Control
 * @property {KeyLike[]} keys
 * @property {string} label
 *
 */

/**
 * @typedef {object} TheatreEntry
 * @property {'emulator.nes'|'emulator.gba'|'emulator.genesis'|'embed'|'proxy'} type
 * @property {Control[]} controls
 * @property {string[]} category
 * @property {string} id
 * @property {string} name
 * @property {number} plays
 */

export function rowTo(entry) {
	const result = { ...entry };

	if ('controls' in result) {
		result.controls = JSON.parse(entry.controls);
	}

	if ('category' in result) {
		result.category = entry.category.split(',');
	}

	return result;
}

/**
 *
 * @param {TheatreEntry} entry
 */
export function validate(entry) {
	if ('id' in entry)
		if (typeof entry.id !== 'string')
			throw new TypeError('Entry ID was not a string');

	if ('name' in entry)
		if (typeof entry.name !== 'string')
			throw new TypeError('Entry name was not a string');

	if ('category' in entry) {
		if (!(entry.category instanceof Array))
			throw new TypeError('Entry category was not an array');

		for (const category of entry.category)
			if (typeof category !== 'string')
				throw new TypeError('Entry category element was not an array');
	}

	if ('controls' in entry)
		if (!(entry.controls instanceof Array))
			throw new TypeError('Entry controls was not an array');

	if ('src' in entry)
		if (typeof entry.src !== 'string')
			throw new TypeError('Entry src was not a string');

	if ('plays' in entry)
		if (typeof entry.plays !== 'number')
			throw new TypeError('Entry plays was not a number');

	if ('type' in entry)
		if (!THEATRE_TYPES.includes(entry.type))
			throw new TypeError(
				`Entry type was not one of the following: ${THEATRE_TYPES}`
			);
}

export default class TheatreWrapper {
	constructor(server) {
		/**
		 * @type {import('./Server.js').default}
		 */
		this.server = server;
	}
	/**
	 *
	 * @param {number} index
	 * @returns {Promise<string>}
	 */
	async indexID(index) {
		const {
			rows: [result],
		} = await this.server.client.query(
			'SELECT id FROM theatre WHERE index = $1;',
			[index]
		);

		if (result === undefined) {
			throw new RangeError(`Entry doesn't exist at index ${index}.`);
		}

		return result.id;
	}
	/**
	 *
	 * @param {string} id
	 * @returns {Promise<TheatreEntry>}
	 */
	async show(id) {
		const {
			rows: [row],
		} = await this.server.client.query('SELECT * FROM theatre WHERE id = $1', [
			id,
		]);

		if (row === undefined) {
			throw new RangeError(`Entry with ID ${id} doesn't exist.`);
		}

		return rowTo(row);
	}
	/**
	 * @param {{leastGreatest?:boolean,sort?:'name'|'plays'|'search',reverse?:boolean,limit?:number,offset?:number,limitPerCategory?:number,search?:string,category?:string}} [options]
	 * @returns {Promise<{total:TheatreEntry[],entries:TheatreEntry[]}>}
	 */
	async list(options = {}) {
		// 0: select, 1: condition, 3: order, 3: limit, 4: offset
		const select = [];
		const conditions = [];
		const vars = [];
		const selection = ['*', 'count(*) OVER() AS total'];

		if (typeof options.category === 'string') {
			const list = [];
			for (const category of options.category.split(','))
				list.push(`$${vars.push(category)}`);

			// split the entry category into an array
			// check if the input categories array has any elements in common with the entry category array
			conditions.push(`string_to_array(category, ',') && ARRAY[${list}]`);
		}

		if (typeof options.limitPerCategory === 'number')
			conditions.push(
				`(SELECT COUNT(*) FROM theatre b WHERE string_to_array(b."category", ',') && string_to_array(a."category", ',') AND a."index" < b."index") < $${vars.push(
					options.limitPerCategory
				)}`
			);

		const order = [];

		switch (options.sort) {
			case 'name':
				order.push('name', 'id');
				break;
			case 'plays':
				order.push('-plays', 'name', 'id');
				break;
			case 'search':
				if (typeof options.search === 'string') {
					selection.push(
						`similarity(name, $${vars.push(
							options.search.toUpperCase()
						)}) as sml`
					);
					order.push('sml DESC', 'name');
				}
				break;
		}

		if (order.length) {
			select[2] = [
				'ORDER BY',
				(options.leastGreatest
					? order.map(order => `${order} DESC`)
					: order
				).join(','),
			]
				.filter(Boolean)
				.join(' ');
		}

		if (conditions.length) {
			select[1] = `WHERE ${conditions.join('AND')}`;
		}

		if (typeof options.limit === 'number')
			select[3] = `LIMIT $${vars.push(options.limit)}`;

		if (typeof options.offset === 'number')
			select[4] = `OFFSET $${vars.push(options.offset)}`;

		const query =
			['SELECT', selection.join(', '), 'FROM theatre a', ...select]
				.filter(Boolean)
				.join(' ') + ';';

		const { rows } = await this.server.client.query(query, vars);

		const total = parseInt(rows[0]?.total);

		const entries = rows.map(rowTo);

		return {
			total,
			entries,
		};
	}
	/**
	 * @param {string} id
	 * @returns {Promise<boolean>} success
	 */
	async delete(id) {
		const { rowCount } = await this.server.client.query(
			'DELETE FROM theatre WHERE id = $1;',
			[id]
		);

		return rowCount !== 0;
	}
	/**
	 *
	 * @param {string} name
	 * @param {string} type
	 * @param {string} src
	 * @param {string[]} category
	 * @param {Control[]} category
	 * @returns {Promise<TheatreEntry>}
	 */
	async create(name, type, src, category, controls) {
		const entry = {
			id: Math.random().toString(36).slice(2),
			name,
			type,
			category,
			src,
			plays: 0,
			controls,
		};

		validate(entry);

		await this.server.client.query(
			'INSERT INTO theatre (id, name, type, category, src, plays, controls) VALUES ($1, $2, $3, $4, $5, $6, $7);',
			[
				entry.id,
				entry.name,
				entry.type,
				entry.category.join(','),
				entry.src,
				entry.plays,
				JSON.stringify(entry.controls),
			]
		);

		return entry;
	}
	/**
	 *
	 * @param {string} id
	 * @param {string} [name]
	 * @param {string} [type]
	 * @param {string} [src]
	 * @param {string[]} category
	 * @param {Control[]} [controls]
	 * @returns {Promise<TheatreEntry>}
	 */
	async update(id, name, type, src, category, controls) {
		let entry = await this.show(id);

		if (name === undefined) {
			name = entry.name;
		}

		if (type === undefined) {
			type = entry.type;
		}

		if (src === undefined) {
			src = entry.src;
		}

		if (category === undefined) {
			category = entry.category;
		}

		if (controls === undefined) {
			controls = entry.controls;
		}

		entry = {
			id,
			name,
			type,
			category,
			src,
			controls,
		};

		validate(entry);

		await this.server.client.query(
			'UPDATE theatre SET name = $1, type = $2, category = $3, src = $4, controls = $5 WHERE id = $6',
			[
				entry.name,
				entry.type,
				entry.category.join(','),
				entry.src,
				JSON.stringify(entry.controls),
				entry.id,
			]
		);

		return entry;
	}
	/**
	 *
	 * @param {string} id
	 * @returns {Promise<boolean>} success
	 */
	async countPlay(id) {
		const { rowCount } = await this.server.client.query(
			'UPDATE theatre SET plays = plays + 1 WHERE id = $1',
			[id]
		);

		return rowCount !== 0;
	}
}
