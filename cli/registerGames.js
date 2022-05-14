import { cors } from './serverCommon.js';
import HTTPErrors from 'http-errors';
// import hcaptcha from 'hcaptcha';

const NOT_EXIST = /Game with ID .*? doesn't exist/;

export default async function registerGames(fastify, { server }) {
	fastify.route({
		url: '/',
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
		url: '/:id/',
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
		url: '/:id/plays',
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

			/* const data = await hcaptcha.verify(secret, request.query.token);

			if (!data.success) {
				throw new HTTPErrors.Forbidden('Bad captcha');
			}*/

			try {
				await server.client.query(
					'UPDATE games SET plays = plays + 1 WHERE id = $1',
					[request.params.id]
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
}
