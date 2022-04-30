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
 * @param {object} object
 * @returns {Game}
 */
export function query_to_game(object) {
	return object;
}

/**
 *
 * @param {Game} object
 * @returns {object}
 */
export function game_to_query(game) {
	const query = {};

	if ('id' in game) {
		query.$id = game.id;
	}

	if ('name' in game) {
		query.$name = game.name;
	}

	if ('type' in game) {
		if (!GAME_TYPES.includes(game.type)) {
			throw new TypeError(
				`Game type was not one of the following: ${GAME_TYPES}`
			);
		}

		query.$type = game.type;
	}

	if ('category' in game) {
		query.$category = game.category;
	}

	if ('src' in game) {
		if (typeof game.src !== 'string') {
			throw new TypeError('Game src was not a string');
		}

		query.$src = game.src;
	}

	if ('plays' in game) {
		if (typeof game.plays !== 'number') {
			throw new TypeError('Game plays was not a number');
		}

		query.$plays = game.plays;
	}

	return query;
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
	 * @returns {import('./Objects.js').Game}
	 */
	async id_at_index(index) {
		const result = await this.server.db.get(
			'SELECT id FROM games LIMIT 1 OFFSET $index;',
			{
				$index: index,
			}
		);

		if (result === undefined) {
			throw new RangeError(`Game doesn't exist at index ${index}.`);
		}

		return result.id;
	}
	/**
	 *
	 * @param {string} id
	 * @returns {import('./Objects.js').Game}
	 */
	async show_game(id) {
		const result = await this.server.db.get(
			'SELECT * FROM games WHERE id = $id',
			game_to_query({
				id,
			})
		);

		if (result === undefined) {
			throw new RangeError(`Game with ID ${id} doesn't exist.`);
		}

		return query_to_game(result);
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
	 */
	/**
	 * @param {ListGamesOptions} [options]
	 * @returns {import('./Objects.js').Game[]}
	 */
	async list_games(options) {
		const games = [];

		// 0: select, 1: condition, 2: order, 3: limit
		const select = ['SELECT * FROM games a'];
		const conditions = [];
		const vars = {};

		if (typeof options.category === 'string') {
			conditions.push('category = $category');
			vars.$category = options.category;
		}

		if (typeof options.limitPerCategory === 'number') {
			conditions.push(
				`(SELECT COUNT(*) FROM games b WHERE category = a."category" AND a."ROWID" < b."ROWID") < ${options.limitPerCategory} - 1`
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
					select[2] = 'ORDER BY 1 - instr(UPPER(name), $search)';
					vars.$search = options.search.toUpperCase();
				}
				break;
		}

		if (conditions.length !== 0) {
			select[1] = `WHERE ${conditions}`;
		}

		if (typeof options.limit === 'number') {
			select[3] = `LIMIT ${options.limit}`;
		}

		// console.log(select.join(' '));

		const query = await this.server.db.all(
			select.filter(str => str).join(' '),
			vars
		);

		for (let game of query) {
			games.push(query_to_game(game));
		}

		if (options.leastGreatest === true) {
			games.reverse();
		}

		return games;
	}
	/**
	 * @param {string} id
	 */
	async delete_game(id) {
		const { changes } = await this.server.db.run(
			'DELETE FROM games WHERE id = $id;',
			game_to_query({
				id,
			})
		);

		return changes !== 0;
	}
	/**
	 *
	 * @param {string} name
	 * @param {string} type
	 * @param {string} src
	 * @param {string} category
	 * @returns {import('./Objects.js').Game}
	 */
	async add_game(name, type, src, category) {
		const game = query_to_game({
			id: Math.random().toString(36).slice(2),
			name,
			type,
			category,
			src,
			plays: 0,
		});

		await this.server.db.run(
			'INSERT INTO games (id, name, type, category, src, plays) VALUES($id, $name, $type, $category, $src, $plays);',
			game_to_query(game)
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

		game = query_to_game({
			id,
			name,
			type,
			category,
			src,
		});

		await this.server.db.run(
			'UPDATE games SET name = $name, type = $type, category = $category, src = $src WHERE id = $id',
			game_to_query(game)
		);

		return game;
	}
}
