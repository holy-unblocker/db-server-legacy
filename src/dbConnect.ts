import { pgURL } from './collectENV.js';
import pg from 'pg';

const dbConnect = async () => {
	const client = new pg.Client({ connectionString: pgURL });

	await client.connect();

	return client;
};

export default dbConnect;
