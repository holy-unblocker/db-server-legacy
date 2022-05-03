export const GAME_TYPES = [
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
 * @typedef {object} Game
 * @property {'emulator.nes'|'emulator.gba'|'emulator.genesis'|'embed'|'proxy'} type
 * @property {Control[]} controls
 * @property {string} id
 * @property {string} name
 * @property {number} plays
 */

export function row_to_game(game) {
	const result = { ...game };

	if ('controls' in result) {
		result.controls = JSON.parse(game.controls);
	}

	return result;
}
/**
 *
 * @param {Game} object
 */
export function validate_game(game) {
	if ('id' in game) {
		if (typeof game.id !== 'string') {
			throw new TypeError('Game ID was not a string');
		}
	}

	if ('name' in game) {
		if (typeof game.name !== 'string') {
			throw new TypeError('Game name was not a string');
		}
	}

	if ('category' in game) {
		if (typeof game.category !== 'string') {
			throw new TypeError('Game category was not a string');
		}
	}

	if ('controls' in game) {
		if (!(game.controls instanceof Array)) {
			throw new TypeError('Game controls was not an array');
		}
	}

	if ('src' in game) {
		if (typeof game.src !== 'string') {
			throw new TypeError('Game src was not a string');
		}
	}

	if ('plays' in game) {
		if (typeof game.plays !== 'number') {
			throw new TypeError('Game plays was not a number');
		}
	}

	if ('type' in game) {
		if (!GAME_TYPES.includes(game.type)) {
			throw new TypeError(
				`Game type was not one of the following: ${GAME_TYPES}`
			);
		}
	}
}

export default class GamesWrapper {
	constructor(server) {
		/**
		 * @type {import('./Server.js').default}
		 */
		this.server = server;
	}
	/**
	 *
	 * @param {number} index
	 * @returns {string}
	 */
	async id_at_index(index) {
		const {
			rows: [result],
		} = await this.server.client.query(
			'SELECT id FROM games WHERE index = $1;',
			[index]
		);

		if (result === undefined) {
			throw new RangeError(`Game doesn't exist at index ${index}.`);
		}

		return result.id;
	}
	/**
	 *
	 * @param {string} id
	 * @returns {Game}
	 */
	async show_game(id) {
		const {
			rows: [row],
		} = await this.server.client.query('SELECT * FROM games WHERE id = $1', [
			id,
		]);

		if (row === undefined) {
			throw new RangeError(`Game with ID ${id} doesn't exist.`);
		}

		const game = row_to_game(row);

		return game;
	}
	/**
	 *
	 * @typedef {object} ListGamesOptions
	 * @property {'name'|'plays'|'search'} [sort]
	 * @property {boolean} [reverse]
	 * @property {boolean} [leastGreatest]
	 * @property {number} [limit]
	 * @property {number} [limitPerCategory]
	 * @property {string} [search]
	 * @property {string} [category]
	 */
	/**
	 * @param {ListGamesOptions} [options]
	 * @returns {Game[]}
	 */
	async list_games(options = {}) {
		// 0: select, 1: condition, 2: order, 3: limit
		const select = [];
		const conditions = [];
		const vars = [];
		const selection = ['*'];

		if (typeof options.category === 'string') {
			vars.push(options.category);
			conditions.push(`category = $${vars.length}`);
		}

		if (typeof options.limitPerCategory === 'number') {
			vars.push(options.limitPerCategory - 1);
			conditions.push(
				`(SELECT COUNT(*) FROM games b WHERE b."category" = a."category" AND a."index" < b."index") < $${vars.length}`
			);
		}

		switch (options.sort) {
			case 'name':
				select[2] = 'ORDER BY name';
				break;
			case 'plays':
				select[2] = 'ORDER BY plays, name';
				break;
			case 'search':
				if (typeof options.search === 'string') {
					vars.push(options.search.toUpperCase());
					selection.push(`similarity(name, $${vars.length}) as sml`);
					// conditions.push(`name % $${vars.length}`);
					select[2] = `ORDER BY sml DESC, name`;
				}
				break;
		}

		if (conditions.length !== 0) {
			select[1] = `WHERE ${conditions}`;
		}

		if (typeof options.limit === 'number') {
			vars.push(options.limit);
			select[3] = `LIMIT $${vars.length}`;
		}

		const query =
			['SELECT', selection.join(', '), 'FROM games a', ...select]
				.filter(str => str)
				.join(' ') + ';';

		const { rows } = await this.server.client.query(query, vars);

		const games = rows.map(row_to_game);

		if (options.leastGreatest === true) {
			games.reverse();
		}

		return games;
	}
	/**
	 * @param {string} id
	 */
	async delete_game(id) {
		const { changes } = await this.server.client.query(
			'DELETE FROM games WHERE id = $1;',
			[id]
		);

		return changes !== 0;
	}
	/**
	 *
	 * @param {string} name
	 * @param {string} type
	 * @param {string} src
	 * @param {string} category
	 * @returns {Game}
	 */
	async create_game(name, type, src, category, controls) {
		const game = {
			id: Math.random().toString(36).slice(2),
			name,
			type,
			category,
			src,
			plays: 0,
			controls: JSON.parse(controls),
		};

		validate_game(game);

		await this.server.client.query(
			'INSERT INTO games (id, name, type, category, src, plays, controls) VALUES ($1, $2, $3, $4, $5, $6, $7);',
			[
				game.id,
				game.name,
				game.type,
				game.category,
				game.src,
				game.plays,
				JSON.stringify(game.controls),
			]
		);

		return game;
	}
	/**
	 *
	 * @param {string} id
	 * @param {string} [name]
	 * @param {string} [type]
	 * @param {string} [src]
	 * @param {string} [category]
	 * @param {Control[]} [controls]
	 */
	async update_game(id, name, type, src, category, controls) {
		let game = await this.show_game(id);

		if (name === undefined) {
			name = game.name;
		}

		if (type === undefined) {
			type = game.type;
		}

		if (src === undefined) {
			src = game.src;
		}

		if (category === undefined) {
			category = game.category;
		}

		if (category === undefined) {
			category = game.category;
		}

		game = {
			id,
			name,
			type,
			category,
			src,
			controls,
		};

		validate_game(game);

		await this.server.client.query(
			'UPDATE games SET name = $1, type = $2, category = $3, src = $4, controls = $5 WHERE id = $6',
			[
				game.name,
				game.type,
				game.category,
				game.src,
				JSON.stringify(game.controls),
				game.id,
			]
		);

		return game;
	}
}
