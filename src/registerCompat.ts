import CompatWrapper from './CompatWrapper.js';
import domianNameParser from 'effective-domain-name-parser';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import createError from 'http-errors';
import type { Client } from 'pg';

const notExist = /Proxy with host .*? doesn't exist/;

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
	const compat = new CompatWrapper(client);

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
			const parsed = domianNameParser.parse(
				(request.params as { host: string }).host
			);

			try {
				reply.send(await compat.show(`${parsed.sld}.${parsed.tld}`));
			} catch (error) {
				if (notExist.test(error)) throw new createError.NotFound();
				else throw error;
			}
		},
	});
}
