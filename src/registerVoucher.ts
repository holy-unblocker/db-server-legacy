import VoucherWrapper, {
	FLOOR_TLD_PRICES,
	VoucherStatus,
} from './VoucherWrapper.js';
import { getDNS, getRules } from './cloudflareConsts.js';
import {
	cfEmail,
	cfKey,
	nameserver1,
	nameserver2,
	namesiloKey,
	skipPayment,
} from './collectENV.js';
import t from './i18n.js';
import Cloudflare from '@e9x/cloudflare';
import type { Zone } from '@e9x/cloudflare/v4';
import { XMLParser } from 'fast-xml-parser';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import createError from 'http-errors';
import fetch from 'node-fetch';
import type { Client } from 'pg';

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
	const voucherAPI = new VoucherWrapper(client);

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

			const voucher = await voucherAPI.show(
				(request.params as { voucher: string }).voucher
			);

			if (!voucher)
				return reply.status(400).send(t('voucher:error.reply.badCode'));

			reply.send({
				tld: voucher.tld,
			});
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

			let { domain: domainID } = request.body as { domain?: string };
			let { voucher: voucherID } = request.params as { voucher?: string };

			if (typeof voucherID !== 'string' || typeof domainID !== 'string')
				throw new createError.BadRequest();

			domainID = domainID.toLowerCase();
			// vouchers are lowercase
			voucherID = voucherID.toLowerCase();

			const voucher = await voucherAPI.show(voucherID);

			if (!voucher)
				return reply.status(400).send(t('voucher:error.reply.badCode'));

			switch (voucher.status) {
				case VoucherStatus.invalid:
					return reply
						.status(403)
						.send(t('voucher:error.reply.invalidVoucher'));
				case VoucherStatus.redeemed:
					return reply.status(403).send(
						t('voucher:error.reply.alreadyRedeemed', {
							domain: `${voucher.name}${voucher.tld}`,
						})
					);
			}
			const floorPrice = FLOOR_TLD_PRICES[voucher.tld];

			if (isNaN(floorPrice)) {
				console.error(`Missing floor price for TLD ${voucher.tld}.`);
				throw new createError.InternalServerError();
			}

			if (!validDomainName.test(domainID))
				return reply.status(400).send(t('voucher:error.reply.invalidName', {}));

			const host = `${domainID}${voucher.tld}`;

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

				if (!data.namesilo.reply.available)
					return reply.status(400).send(t('voucher:error.reply.unavailable'));

				const price = Number(data.namesilo.reply.available.domain['@_price']);

				if (isNaN(price) || price > floorPrice) {
					console.log(`${host} costs ${price}, exceeds ${floorPrice}`);
					return reply.status(400).send(
						t('voucher:error.reply.exceedsLimit', {
							price: `$${price}`,
							limit: `$${floorPrice}`,
						})
					);
				}
			}

			console.log('Processing voucher', {
				voucher: voucherID,
				domain: domainID,
				tld: voucher.tld,
			});

			// race condition?
			if (!(await voucherAPI.redeem(voucherID, domainID)))
				return reply.status(500).send(t('voucher:error.reply.updateVoucher'));

			console.log(voucherID, 'Redeemed voucher');

			if (skipPayment) {
				console.log('Skipping payment.');
			} else {
				// REGISTER
				console.log(voucherID, 'Register', host);
				{
					const request = await fetch(
						'https://www.namesilo.com/api/registerDomain?' +
							new URLSearchParams({
								version: '1',
								type: 'xml',
								domain: host,
								key: namesiloKey,
								ns1: nameserver1,
								ns2: nameserver2,
								years: '1',
								...(voucher.tld === '.us'
									? {
											private: '0',
											// may be subject to change if you're running your own DB server
											usnc: 'C21',
											usap: 'P1',
									  }
									: { private: '1' }),
								auto_renew: '0',
							})
					);

					const data: NamesiloAPI = xml.parse(await request.text());

					if (data.namesilo.reply.detail !== 'success') {
						console.error(data.namesilo.reply);
						return reply
							.status(500)
							.send(t('voucher:error.reply.registerDomain'));
					}
				}

				console.log('delaying configuration', host);
				await new Promise((resolve) => setTimeout(resolve, 10e3));

				// CONFIGURE
				console.log('configure', host);

				const zone = await cf.post<Zone, { name: string }>(`v4/zones`, {
					name: host,
				});

				if (
					zone.name_servers[0] !== nameserver1 ||
					zone.name_servers[1] !== nameserver2
				) {
					console.error(
						`Cloudflare's requested nameservers did not match nameservers in ENV. Current config is`,
						[nameserver1, nameserver2],
						', got',
						zone.name_servers
					);

					const request = await fetch(
						'https://www.namesilo.com/api/changeNameServers?' +
							new URLSearchParams({
								version: '1',
								type: 'xml',
								key: namesiloKey,
								domain: host,
								ns1: zone.name_servers[0],
								ns2: zone.name_servers[1],
							})
					);

					const data = await request.text();

					console.log('Updated nameservers.', request.status, data);
				}

				const newRules = getRules(zone.name);
				const newDNS = getDNS(zone.name);

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
					return reply.status(500).send(t('voucher:error.reply.configureZone'));
				}

				console.log('REGISTERED', host);
			}

			reply.send({
				tld: voucher.tld,
				host,
			});
		},
	});
}
