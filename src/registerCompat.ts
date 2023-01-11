import CompatWrapper from './CompatWrapper.js';
import { parse } from 'effective-domain-name-parser';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import createError from 'http-errors';
import type { Client } from 'pg';

export default async function registerCompat(
	fastify: FastifyInstance,
	{
		cors,
		client,
	}: {
		cors: (req: FastifyRequest, reply: FastifyReply) => void;
		client: Client;
	}
) {
	const compatAPI = new CompatWrapper(client);

	fastify.route({
		url: '/:host/',
		method: 'GET',
		schema: {
			params: {
				type: 'object',
				properties: {
					host: { type: 'string' },
				},
			},
		},
		async handler(request, reply) {
			cors(request, reply);
			const parsed = parse((request.params as { host: string }).host);
			const compat = await compatAPI.show(`${parsed.sld}.${parsed.tld}`);

			if (!compat) throw new createError.NotFound();

			reply.send(compat);
		},
	});
}
