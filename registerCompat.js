import HTTPErrors from 'http-errors';
import domianNameParser from 'effective-domain-name-parser';

const NOT_EXIST = /Proxy with host .*? doesn't exist/;

export default async function registerCompat(fastify, { cors, server }) {
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
			const parsed = domianNameParser.parse(request.params.host);

			try {
				const compat = await server.compat.show(`${parsed.sld}.${parsed.tld}`);
				reply.send(compat);
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
