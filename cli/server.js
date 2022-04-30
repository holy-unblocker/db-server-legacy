import Fastify from 'fastify';
import Server from '../Server.js';
import HTTPErrors from 'http-errors';
import hcaptcha from 'hcaptcha';

const NOT_EXIST = /Game with ID .*? doesn't exist/;

export default function server({ secret, port, host }) {
	const server = new Server();
	const fastify = Fastify({
		logger: {
			level: 'error',
		},
	});

	function cors(request, reply) {
		reply.header('access-control-allow-headers', '*');
		reply.header('access-control-allow-origin', request.headers.origin || '*');
		reply.header('access-control-allow-max-age', '600');
		reply.header('access-control-allow-credentials', 'true');
		reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE');
	}

	fastify.route({
		url: '*',
		method: 'OPTIONS',
		handler(request, reply) {
			cors(request, reply);
			reply.send();
		},
	});

	fastify.route({
		url: '/games/',
		method: 'GET',
		schema: {
			querystring: {
				type: 'object',
				properties: {
					leastGreatest: { type: 'boolean' },
					sort: { type: 'string' },
					category: { type: 'string' },
					search: { type: 'string' },
					limit: { type: 'number' },
					limitPerCategory: { type: 'number' },
				},
			},
		},
		async handler(request, reply) {
			cors(request, reply);

			const games = await server.games.list_games(request.query);
			const send = [];

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
			cors(request, reply);

			try {
				const game = await server.games.show_game(request.params.id);
				reply.send(game);
			} catch (error) {
				if (NOT_EXIST.test(error)) {
					throw new HTTPErrors.NotFound();
				} else {
					throw error;
				}
			}
		},
	});

	fastify.route({
		url: '/games/:id/plays',
		method: 'PUT',
		schema: {
			querystring: {
				type: 'object',
				properties: {
					token: { type: 'string' },
				},
				required: ['token'],
			},
		},
		async handler(request, reply) {
			cors(request, reply);

			const data = await hcaptcha.verify(secret, request.query.token);

			if (!data.success) {
				throw new HTTPErrors.Forbidden('Bad captcha');
			}

			try {
				await server.db.run(
					'UPDATE games SET plays = plays + 1 WHERE id = $id',
					{
						$id: request.params.id,
					}
				);
				const game = await server.games.show_game(request.params.id);
				reply.send(game);
			} catch (error) {
				if (NOT_EXIST.test(error)) {
					throw new HTTPErrors.NotFound();
				} else {
					throw error;
				}
			}
		},
	});

	console.log('HCaptcha secret:', secret);

	fastify.listen(port, host, (error, url) => {
		if (error) {
			console.error(error);
			process.exit(1);
		}

		console.log('Fastify server listening. View live at', url);
	});
}
