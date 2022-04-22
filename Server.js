import Database from 'sqlite-async';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { game_to_query, query_to_game } from './Objects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class Server {
	constructor() {
		this.open = this.open_db();
	}
	async open_db() {
		/**
		 * @type {Database.prototype} db
		 */
		this.db = await Database.open(join(__dirname, 'server.db'));

		await this.db.run(`CREATE TABLE IF NOT EXISTS games (
			id TEXT PRIMARY KEY NOT NULL UNIQUE,
			name TEXT NOT NULL,
			category TEXT NOT NULL,
			type TEXT NOT NULL,
			src TEXT NOT NULL,
			plays NUMBER NOT NULL,
			favorites NUMBER NOT NULL,
		);`);
	}
	/**
	 *
	 * @param {number} index
	 * @returns {import('./Objects.js').Game}
	 */
	async id_at_index(index) {
		const result = await this.db.get(
			`SELECT id FROM games LIMIT 1 OFFSET $index;`,
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
		const result = await this.db.get(
			`SELECT * FROM games WHERE id = $id`,
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
	 * @param {string} [category]
	 * @returns {import('./Objects.js').Game[]}
	 */
	async list_games(category) {
		const games = [];

		let query;

		if (typeof category === 'string') {
			query = this.db.all(`SELECT * FROM games WHERE category = $category;`, {
				$category: category,
			});
		} else {
			query = this.db.all(`SELECT * FROM games;`);
		}

		for (let game of await query) {
			games.push(query_to_game(game));
		}

		return games;
	}
	/**
	 * @param {string} id
	 */
	async delete_game(id) {
		const { changes } = await this.db.run(
			`DELETE FROM games WHERE id = $id;`,
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
			favorites: 0,
		});

		await this.db.run(
			`INSERT INTO games (id, name, type, category, src, plays, favorites) VALUES($id, $name, $type, $category, $src, $plays, $favorites);`,
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

		await this.db.run(
			`UPDATE games SET name = $name, type = $type, category = $category, src = $src WHERE id = $id`,
			game_to_query(game)
		);

		return game;
	}
}
