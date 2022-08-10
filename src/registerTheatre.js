import TheatreWrapper from './TheatreWrapper.js';
import HTTPErrors from 'http-errors';

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
					offset: { type: 'number' },
					limit: { type: 'number' },
					limitPerCategory: { type: 'number' },
				},
			},
		},
		async handler(request, reply) {
			cors(request, reply);

			const data = await theatre.list(request.query);

			const send = {
				entries: [],
				total: data.total,
			};

			for (const entry of data.entries)
				send.entries.push({
					name: entry.name,
					id: entry.id,
					category: entry.category,
				});

			reply.send(data);
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

			try {
				await theatre.countPlay(request.params.id);
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
