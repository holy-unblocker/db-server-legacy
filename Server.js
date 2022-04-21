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

		await this.db.run(`
		CREATE TABLE IF NOT EXISTS games (
			id TEXT PRIMARY KEY NOT NULL UNIQUE,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			src TEXT NOT NULL,
			plays NUMBER NOT NULL,
			favorites NUMBER NOT NULL,
			retention NUMBER NOT NULL
		);
		`);
	}
	/**
	 *
	 * @param {number} index
	 * @returns {Game}
	 */
	async id_at_index(index) {
		const result = await this.db.get(
			`
		SELECT id FROM games LIMIT 1 OFFSET $index
		`,
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
	 * @returns {Game}
	 */
	async show_game(id) {
		const result = await this.db.get(
			`
		SELECT * FROM games WHERE id = $id
		`,
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
	 * @yields {Game}
	 */
	async *list_games() {
		for (let game of await this.db.all(`
		SELECT * FROM games
		`)) {
			yield query_to_game(game);
		}
	}
	/**
	 * @param {string} id
	 */
	async delete_game(id) {
		const { changes } = await this.db.run(
			`
		DELETE FROM games WHERE id = $id;
		`,
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
	 * @returns {Game}
	 */
	async add_game(name, type, src) {
		const game = query_to_game({
			id: Math.random().toString(36).slice(2),
			name,
			type,
			src,
			plays: 0,
			retention: 0,
			favorites: 0,
		});

		await this.db.run(
			`
		INSERT INTO games (id, name, type, src, plays, retention, favorites) VALUES($id, $name, $type, $src, $plays, $retention, $favorites);
		`,
			game_to_query(game)
		);

		return game;
	}
}
