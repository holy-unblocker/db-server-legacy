import type { ListOptions, TheatreEntry } from './TheatreWrapper.js';
import TheatreWrapper from './TheatreWrapper.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import createError from 'http-errors';
import type { Client } from 'pg';

export default async function registerTheatre(
	fastify: FastifyInstance,
	{
		cors,
		client,
	}: {
		cors: (req: FastifyRequest, reply: FastifyReply) => void;
		client: Client;
	}
) {
	const theatreAPI = new TheatreWrapper(client);

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

			const data = await theatreAPI.list(request.query as ListOptions);

			const send = {
				entries: [] as {
					name: TheatreEntry['name'];
					id: TheatreEntry['id'];
					category: TheatreEntry['category'];
				}[],
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
			const entry = await theatreAPI.show(
				(request.params as { id: string }).id
			);

			if (!entry) throw new createError.NotFound();

			reply.send(entry);
		},
	});

	fastify.route({
		url: '/:id/plays',
		method: 'PUT',
		async handler(request, reply) {
			cors(request, reply);

			if (!(await theatreAPI.countPlay((request.params as { id: string }).id)))
				throw new createError.BadRequest();
		},
	});
}
