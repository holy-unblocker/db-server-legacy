import Fastify from 'fastify';
import Server from '../Server.js';
import HTTPErrors from 'http-errors';

const NOT_EXIST = /Game with ID .*? doesn't exist/;

export default function server({ port, host }) {
	const server = new Server();
	const fastify = Fastify();

	fastify.route({
		url: '/games/',
		method: 'GET',
		async handler(_request, reply) {
			const games = await server.list_games();
			reply.send(games);
		},
	});

	fastify.route({
		url: '/games/:id/',
		method: 'GET',
		async handler(request, reply) {
			try {
				const info = await server.show_game(request.params.id);
				reply.send(info);
			} catch (error) {
				throw new HTTPErrors.NotFound();
			}
		},
	});

	fastify.listen(port, host, (error, url) => {
		if (error) {
			console.error(error);
			process.exit(1);
		}

		console.log('Fastify server listening. View live at', url);
	});
}
