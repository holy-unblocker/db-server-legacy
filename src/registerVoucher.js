import Cloudflare from './Cloudflare.js';
import VoucherWrapper, { FLOOR_TLD_PRICES } from './VoucherWrapper.js';
import { XMLParser } from 'fast-xml-parser';
import HTTPErrors from 'http-errors';
import fetch from 'node-fetch';
import { readFile } from 'node:fs/promises';

const DNS = JSON.parse(await readFile('./DNS.json'));
const NOT_EXIST = /Voucher with code .*? doesn't exist/;
const VALID_DOMAIN_NAME = /^[a-z0-9-]*$/i;

/**
 *
 * @typedef {object} NamesiloAPI
 * @property {Promise<{request:{operation:string,ip:string},reply:{code:number,detail:string}}>} namesilo
 */

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
				const { tld } = await voucher.show(request.params.voucher);

				const floorPrice = FLOOR_TLD_PRICES[tld];

				if (isNaN(floorPrice)) {
					const log = `Missing floor price for TLD ${tld}.`;
					console.error(log);
					throw new HTTPErrors.InternalServerError(log);
				}

				// if not thrown, the code is valid

				if (!VALID_DOMAIN_NAME.test(request.body.domain)) {
					throw new HTTPErrors.BadRequest('Invalid domain name.');
				}

				const host = `${request.body.domain}${tld}`;

				// AVABILITY
				{
					const request = await fetch(
						'https://www.namesilo.com/api/checkRegisterAvailability?' +
							new URLSearchParams({
								version: 1,
								type: 'xml',
								key: namesiloKey,
								domains: host,
							})
					);

					/**
					 * @type {NamesiloAPI}
					 */
					const data = xml.parse(await request.text());

					if (!data.namesilo.reply.available) {
						throw new HTTPErrors.NotFound('Domain unavailable.');
					}

					const price = Number(data.namesilo.reply.available.domain['@_price']);

					if (isNaN(price) || price > floorPrice) {
						throw HTTPErrors.BadRequest('Domain price exceeds limit.');
					}
				}

				await voucher.delete(request.params.voucher);

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
								private: Number(tld !== '.us'),
								auto_renew: 0,
							})
					);

					/**
					 * @type {NamesiloAPI}
					 */
					const data = xml.parse(await request.text());

					if (data.namesilo.reply.detail !== 'success') {
						console.error(data.namesilo.reply);
						throw new HTTPErrors.InternalServerError(
							'Unable to register domain.'
						);
					}
				}

				console.log('delaying configuration', host);
				await new Promise(resolve => setTimeout(resolve), 25e3);

				// CONFIGURE
				console.log('configure', host);
				{
					let id;

					{
						const resp = await cf.zones.add({ name: host });

						if (!resp.success) {
							console.error('Failure adding domain to zone:', resp);
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
							console.error('Failure enabling full SSL:', resp);
							throw new HTTPErrors.InternalServerError(
								'Unable to configure domain SSL.'
							);
						}
					}

					{
						const resp = await cf.zoneSettings.edit(
							id,
							'always_use_https',
							'{"value":"on"}'
						);

						if (!resp.success) {
							console.error('Failure enabling Always Use HTTPS:', resp);
							throw new HTTPErrors.InternalServerError(
								'Unable to enable Always Use HTTPS.'
							);
						}
					}

					await Promise.all(
						DNS.map(async record => {
							const resp = await cf.dnsRecords.add(id, record);

							if (!resp.success) {
								console.error('Failure adding DNS record:', record, resp);
								throw new HTTPErrors.InternalServerError(
									'Unable to add DNS records.'
								);
							}
						})
					);

					const rules = [
						{
							status: 'active',
							priority: 1,
							actions: [{ id: 'cache_level', value: 'cache_everything' }],
							targets: [
								{
									target: 'url',
									constraint: {
										operator: 'matches',
										value: `${host}/static/*`,
									},
								},
							],
						},
						{
							status: 'active',
							priority: 1,
							actions: [{ id: 'cache_level', value: 'cache_everything' }],
							targets: [
								{
									target: 'url',
									constraint: {
										operator: 'matches',
										value: `${host}/theatre/*`,
									},
								},
							],
						},
					];

					await Promise.all(
						rules.map(async rule => {
							try {
								await cf.post(`v4/zones/${id}/pagerules`, rule);
							} catch (error) {
								console.error('Failure adding page rule:', rule, error);
								throw new HTTPErrors.InternalServerError(
									'Unable to add page rules.'
								);
							}
						})
					);
				}

				console.log('REGISTERED', host);

				reply.send({
					tld,
					host,
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
}
