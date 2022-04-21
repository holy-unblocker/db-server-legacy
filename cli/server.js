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
		async handler(request, reply) {
			const games = await server.list_games();
			const send = [];

			let lg = 'least-greatest' in request.query;

			switch (request.query.sort) {
				case 'favorites':
					games.sort((a, b) => {
						if (lg) {
							a = b;
						}

						return b.favorites - a.favorites;
					});
					break;
				case 'plays':
					games.sort((a, b) => {
						if (lg) {
							a = b;
						}

						return b.plays - a.plays;
					});
					break;
				case 'retention':
					games.sort((a, b) => {
						if (lg) {
							a = b;
						}

						b.retention - a.retention;
					});
					break;
			}

			for (let game of games) {
				send.push({
					name: game.name,
					id: game.id,
					category: game.category,
				});
			}

			reply.send(send);
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
				if (NOT_EXIST.test(error)) {
					throw new HTTPErrors.NotFound();
				} else {
					throw error;
				}
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
