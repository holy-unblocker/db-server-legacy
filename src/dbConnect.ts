import type { ClientConfig } from 'pg';
import pg from 'pg';

const dbConnect = async (pgConfig?: string | ClientConfig) => {
	const client = new pg.Client(
		pgConfig || {
			host: process.env.PG_HOST,
			port: parseInt(process.env.PG_PORT),
			user: process.env.PG_USER,
			password: process.env.PG_PASSWORD,
			database: process.env.PG_DATABASE,
		}
	);

	await client.connect();

	return client;
};

export default dbConnect;
