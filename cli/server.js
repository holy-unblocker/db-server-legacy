import Fastify from 'fastify';
import Server from '../Server.js';

export default function server({ port, host }) {
	const server = new Server();
	const fastify = Fastify();

	fastify.listen(port, host, (error, url) => {
		if (error) {
			console.error(error);
			process.exit(1);
		}

		console.log('Fastify server listening. View live at', url);
	});
}
