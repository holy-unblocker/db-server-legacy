export const GAME_TYPES = [
	'emulator.nes',
	'emulator.gba',
	'emulator.genesis',
	'flash',
	'embed',
	'proxy',
];

/**
 * @typedef {object} Game
 * @property {'emulator.nes'|'emulator.gba'|'emulator.genesis'|'embed'|'proxy'} type
 * @property {string} id
 * @property {string} name
 * @property {number} plays
 */

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
			'SELECT id FROM games LIMIT 1 OFFSET $1;',
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
			rows: [result],
		} = await this.server.client.query('SELECT * FROM games WHERE id = $1', [
			id,
		]);

		if (result === undefined) {
			throw new RangeError(`Game with ID ${id} doesn't exist.`);
		}

		return result;
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
	async list_games(options) {
		// 0: select, 1: condition, 2: order, 3: limit
		const select = ['SELECT * FROM games a'];
		const conditions = [];
		const vars = [];

		if (typeof options.category === 'string') {
			vars.push(options.category);
			conditions.push(`category = $${vars.length + 1}`);
		}

		if (typeof options.limitPerCategory === 'number') {
			vars.push(options.limitPerCategory - 1);
			conditions.push(
				`(SELECT COUNT(*) FROM games b WHERE category = a."category" AND a."id" < b."id") < $${vars.length}`
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
					select[2] = `ORDER BY 1 - instr(UPPER(name), $${vars.length})`;
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

		const { rows: games, ...x } = await this.server.client.query(
			select.filter(str => str).join(' '),
			vars
		);

		console.log({ games, ...x });

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
	async create_game(name, type, src, category) {
		const game = {
			id: Math.random().toString(36).slice(2),
			name,
			type,
			category,
			src,
			plays: 0,
		};

		validate_game(game);

		await this.server.client.query(
			'INSERT INTO games (id, name, type, category, src, plays) VALUES ($1, $2, $3, $4, $5, $6);',
			[game.id, game.name, game.type, game.category, game.src, game.plays]
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
	 */
	async update_game(id, name, type, src, category) {
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

		game = {
			id,
			name,
			type,
			category,
			src,
		};

		validate_game(game);

		await this.server.client.query(
			'UPDATE games SET name = $1, type = $2, category = $3, src = $4 WHERE id = $5',
			[game.name, game.type, game.category, game.src, game.id]
		);

		return game;
	}
}
