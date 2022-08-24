import VoucherWrapper, { FLOOR_TLD_PRICES } from './VoucherWrapper.js';
import { getDNS, getRules } from './cloudflareConsts.js';
import {
	cfEmail,
	cfKey,
	nameserver1,
	nameserver2,
	namesiloKey,
} from './collectENV.js';
import Cloudflare from '@e9x/cloudflare';
import type { Zone } from '@e9x/cloudflare/v4';
import { XMLParser } from 'fast-xml-parser';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import createError from 'http-errors';
import fetch from 'node-fetch';
import type { Client } from 'pg';

const notExist = /Voucher with code .*? doesn't exist/;
const validDomainName = /^[a-z0-9-]*$/i;

interface NamesiloAPI {
	namesilo: {
		request: { operation: string; ip: string; [key: string]: any };
		reply: { code: number; detail: string; [key: string]: any };
	};
}

export default async function registerVoucher(
	fastify: FastifyInstance,
	{
		cors,
		client,
	}: {
		cors: (req: FastifyRequest, reply: FastifyReply) => void;
		client: Client;
	}
) {
	const voucher = new VoucherWrapper(client);

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
				const { tld } = await voucher.show(
					(request.params as { voucher: string }).voucher
				);

				reply.send({
					tld,
				});
			} catch (error) {
				if (notExist.test(error)) {
					throw new createError.NotFound('Invalid voucher.');
				} else {
					throw error;
				}
			}
		},
	});

	const xml = new XMLParser({
		ignoreAttributes: false,
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
				const { tld } = await voucher.show(
					(request.body as { voucher: string }).voucher
				);

				const floorPrice = FLOOR_TLD_PRICES[tld];

				if (isNaN(floorPrice)) {
					const log = `Missing floor price for TLD ${tld}.`;
					console.error(log);
					throw new createError.InternalServerError(log);
				}

				// if not thrown, the code is valid

				if (
					!validDomainName.test((request.body as { domain: string }).domain)
				) {
					throw new createError.BadRequest('Invalid domain name.');
				}

				const host = `${(request.body as { domain: string }).domain}${tld}`;

				// AVABILITY
				{
					const request = await fetch(
						'https://www.namesilo.com/api/checkRegisterAvailability?' +
							new URLSearchParams({
								version: '1',
								type: 'xml',
								key: namesiloKey,
								domains: host,
							})
					);

					const data: NamesiloAPI = xml.parse(await request.text());

					if (!data.namesilo.reply.available) {
						throw new createError.NotFound('Domain unavailable.');
					}

					const price = Number(data.namesilo.reply.available.domain['@_price']);

					if (isNaN(price) || price > floorPrice) {
						throw new createError.BadRequest('Domain price exceeds limit.');
					}
				}

				await voucher.delete((request.params as { voucher: string }).voucher);

				// REGISTER
				console.log('REGISTER', host);
				{
					const request = await fetch(
						'https://www.namesilo.com/api/registerDomain?' +
							new URLSearchParams({
								version: '1',
								type: 'xml',
								key: namesiloKey,
								ns1: nameserver1,
								ns2: nameserver2,
								domain: host,
								years: '1',
								private: tld === '.us' ? '0' : '1',
								auto_renew: '0',
							})
					);

					const data: NamesiloAPI = xml.parse(await request.text());

					if (data.namesilo.reply.detail !== 'success') {
						console.error(data.namesilo.reply);
						throw new createError.InternalServerError(
							'Unable to register domain.'
						);
					}
				}

				console.log('delaying configuration', host);
				await new Promise((resolve) => setTimeout(resolve, 8e3));

				// CONFIGURE
				console.log('configure', host);

				let zone = await cf.post<Zone, { name: string }>(`v4/zones`, {
					name: host,
				});

				const newRules = getRules(zone);

				const newDNS = getDNS();

				try {
					await Promise.all([
						...newRules.map((rule) =>
							cf.post(`v4/zones/${zone.id}/pagerules`, rule)
						),
						...newDNS.map((dns) =>
							cf.post(`v4/zones/${zone.id}/dns_records`, dns)
						),
						cf.patch(`v4/zones/${zone.id}/settings/always_use_https`, {
							value: 'on',
						}),
						cf.patch(`v4/zones/${zone.id}/settings/ssl`, {
							value: 'full',
						}),
					]);
				} catch (err) {
					console.error(err);
					throw new createError.InternalServerError(
						'Cannot configure zone on Cloudflare.'
					);
				}

				console.log('REGISTERED', host);

				reply.send({
					tld,
					host,
				});
			} catch (error) {
				if (notExist.test(error)) {
					throw new createError.NotFound('Invalid voucher.');
				} else {
					throw error;
				}
			}
		},
	});
}
