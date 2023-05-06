import { pgURL } from './collectENV.js';
import pg from 'pg';

export default async function dbConnect() {
	const client = new pg.Client({ connectionString: pgURL });

	await client.connect();

	return client;
}
