import pg from 'pg';

const dbConnect = async () => {
	const client = new pg.Client({ connectionString: process.env.PG });

	await client.connect();

	return client;
};

export default dbConnect;
