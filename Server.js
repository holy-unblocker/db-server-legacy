import pg from 'pg';
import GamesWrapper from './GamesWrapper.js';
import CompatWrapper from './CompatWrapper.js';

export default class Server {
	games = new GamesWrapper(this);
	compat = new CompatWrapper(this);
	constructor() {
		this.client = new pg.Client({
			host: process.env.PG_HOST,
			port: process.env.PG_PORT,
			user: process.env.PG_USER,
			password: process.env.PG_PASSWORD,
			database: process.env.PG_DATABASE,
		});
		/**
		 * @type {pg.Client}
		 */
		this.open = this.open_db();
	}
	async close() {
		await this.client.end();
	}
	async open_db() {
		await this.client.connect();

		// \c holy
		// CREATE EXTENSION pg_trgm;

		await this.client.query(`CREATE TABLE IF NOT EXISTS games (
			index SERIAL,
			id TEXT PRIMARY KEY NOT NULL UNIQUE,
			name TEXT NOT NULL,
			category TEXT NOT NULL,
			type TEXT NOT NULL,
			src TEXT NOT NULL,
			plays INTEGER NOT NULL
		);`);

		await this.client.query(
			'CREATE INDEX IF NOT EXISTS trgm_idx ON games USING GIST (name gist_trgm_ops);'
		);

		await this.client.query(`CREATE TABLE IF NOT EXISTS compat (
			host TEXT PRIMARY KEY NOT NULL UNIQUE,
			proxy TEXT NOT NULL
		);`);
	}
}
