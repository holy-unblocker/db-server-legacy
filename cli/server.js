import { config } from 'dotenv-flow';
config();

import { Command } from 'commander';
import Fastify from 'fastify';
import Server from '../Server.js';
import registerTheatre from '../registerTheatre.js';
import registerCompat from '../registerCompat.js';
import registerVoucher from '../registerVoucher.js';

function cors(request, reply) {
	reply.header('access-control-allow-headers', '*');
	reply.header('access-control-allow-origin', request.headers.origin || '*');
	reply.header('access-control-allow-max-age', '600');
	reply.header('access-control-allow-credentials', 'true');
	reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE');
}

const program = new Command();

program
	.option('-h, --host <string>', 'Listening host', 'localhost')
	.option('-p, --port <number>', 'Listening port', process.env.PORT || 80)
	.option(
		'-hs, --hcaptcha-secret <string>',
		'HCaptcha secret',
		process.env.HCAPTCHA_SECRET || '0x0000000000000000000000000000000000000000'
	)
	.requiredOption(
		'-ce, --cf-email <email>',
		'Cloudflare API Email',
		process.env.CF_EMAIL
	)
	.requiredOption(
		'-ck, --cf-key <key>',
		'Cloudflare API Key',
		process.env.CF_KEY
	)
	.requiredOption(
		'-nk, --namesilo-key <key>',
		'NameSilo API Key',
		process.env.NAMESILO
	)
	.requiredOption(
		'-ns1, --nameserver1 <nameserver>',
		'Domain nameserver 1',
		process.env.NS1
	)
	.requiredOption(
		'-ns1, --nameserver2 <nameserver>',
		'Domain nameserver 2',
		process.env.NS2
	)
	.action(
		({
			hcaptchaSecret,
			nameserver1,
			nameserver2,
			cfEmail,
			cfKey,
			namesiloKey,
			port,
			host,
		}) => {
			const server = new Server();
			const fastify = Fastify({
				logger: {
					level: 'error',
				},
			});

			fastify.route({
				url: '*',
				method: 'OPTIONS',
				handler(request, reply) {
					cors(request, reply);
					reply.send();
				},
			});

			fastify.register(registerTheatre, {
				prefix: '/theatre',
				server,
				cors,
				hcaptchaSecret,
			});

			fastify.register(registerCompat, {
				prefix: '/compat',
				server,
				cors,
			});

			fastify.register(registerVoucher, {
				prefix: '/vouchers',
				server,
				cors,
				nameserver1,
				nameserver2,
				cfEmail,
				cfKey,
				namesiloKey,
			});

			fastify.listen(port, host, (error, url) => {
				if (error) {
					console.error(error);
					process.exit(1);
				}

				console.log('Fastify server listening. View live at', url);
			});
		}
	);

program.parse(process.argv);
