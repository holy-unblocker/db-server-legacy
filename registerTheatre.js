import HTTPErrors from 'http-errors';
import TheatreWrapper from './TheatreWrapper.js';
// import hcaptcha from 'hcaptcha';

const NOT_EXIST = /Entry with ID .*? doesn't exist/;

export default async function registerTheatre(fastify, { cors, server }) {
	const theatre = new TheatreWrapper(server);

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

			const send = [];

			for (let entry of await theatre.list(request.query)) {
				send.push({
					name: entry.name,
					id: entry.id,
					category: entry.category,
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
				reply.send(await theatre.show(request.params.id));
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
				await theatre.count_play(request.params.id);
				reply.send({});
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
