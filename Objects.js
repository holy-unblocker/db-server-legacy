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
