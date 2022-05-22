import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import HTTPErrors from 'http-errors';
import fetch from 'node-fetch';
import Cloudflare from 'cloudflare';
import VoucherWrapper from './VoucherWrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DNS = JSON.parse(await readFile(join(__dirname, 'DNS.json')));

const NOT_EXIST = /Voucher with code .*? doesn't exist/;
const VALID_DOMAIN_NAME = /^[a-z0-9-]*$/i;

export default async function registerVoucher(
	fastify,
	{ cors, server, cfEmail, cfKey, namesiloKey, nameserver1, nameserver2 }
) {
	const voucher = new VoucherWrapper(server);

	const cf = new Cloudflare({
		email: cfEmail,
		key: cfKey,
	});

	fastify.route({
		url: '*',
		method: 'OPTIONS',
		handler(request, reply) {
			cors(request, reply);
			reply.send();
		},
	});

	fastify.route({
		url: '/:voucher/',
		method: 'GET',
		schema: {
			params: {
				type: 'object',
				properties: {
					voucher: { type: 'string' },
				},
			},
		},
		async handler(request, reply) {
			cors(request, reply);

			try {
				const { tld } = await voucher.show(request.params.voucher);

				reply.send({
					tld,
				});
			} catch (error) {
				if (NOT_EXIST.test(error)) {
					throw new HTTPErrors.NotFound('Invalid voucher.');
				} else {
					throw error;
				}
			}
		},
	});

	fastify.route({
		url: '/:voucher/',
		method: 'POST',
		schema: {
			params: {
				type: 'object',
				required: ['voucher'],
				properties: {
					voucher: { type: 'string' },
				},
			},
			body: {
				type: 'object',
				required: ['domain'],
				properties: {
					domain: { type: 'string' },
				},
			},
		},
		async handler(request, reply) {
			cors(request, reply);

			try {
				const { tld } = await voucher.show(request.params.voucher);

				// if not thrown, the code is valid

				if (!VALID_DOMAIN_NAME.test(request.body.domain)) {
					throw new HTTPErrors.BadRequest('Invalid domain name.');
				}

				await voucher.delete(request.params.voucher);

				const host = `${request.body.domain}${tld}`;

				// REGISTER
				console.log('REGISTER', host);
				{
					const request = await fetch(
						'https://www.namesilo.com/api/registerDomain?' +
							new URLSearchParams({
								version: 1,
								type: 'xml',
								key: namesiloKey,
								ns1: nameserver1,
								ns2: nameserver2,
								domain: host,
								years: 1,
								private: 1,
								auto_renew: 0,
							})
					);

					const text = await request.text();

					if (!text.includes('successfully processed.')) {
						console.error(text);
						throw new HTTPErrors.InternalServerError(
							'Unable to register domain.'
						);
					}
				}

				// CONFIGURE
				console.log('configure', host);
				{
					let id;

					{
						const resp = await cf.zones.add({ name: host });

						if (!resp.success) {
							console.error('add domain', resp);
							throw new HTTPErrors.InternalServerError(
								'Unable to add domain to zone.'
							);
						}

						id = resp.result.id;
					}

					{
						const resp = await cf.zoneSettings.edit(
							id,
							'ssl',
							'{"value":"full"}'
						);

						if (!resp.success) {
							console.error('ssl', resp);
							throw new HTTPErrors.InternalServerError(
								'Unable to configure domain SSL.'
							);
						}
					}

					for (let record of DNS) {
						const resp = await cf.dnsRecords.add(id, record);

						if (!resp.success) {
							console.error(record, resp);
							throw new HTTPErrors('Unable to add DNS records.');
						}
					}

					console.log('registered', host);

					reply.send({
						tld,
						host,
					});
				}
			} catch (error) {
				if (NOT_EXIST.test(error)) {
					throw new HTTPErrors.NotFound('Invalid voucher.');
				} else {
					throw error;
				}
			}
		},
	});
}
