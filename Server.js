import Database from 'sqlite-async';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import GamesWrapper from './GamesWrapper.js';
import CompatWrapper from './CompatWrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class Server {
	games = new GamesWrapper(this);
	compat = new CompatWrapper(this);
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
			plays NUMBER NOT NULL
		);`);

		await this.db.run(`CREATE TABLE IF NOT EXISTS compat (
			host TEXT PRIMARY KEY NOT NULL UNIQUE,
			proxy TEXT NOT NULL
		);`);
	}
}
