import Server from '../Server.js';
import registerCompat from '../registerCompat.js';
import registerTheatre from '../registerTheatre.js';
import registerVoucher from '../registerVoucher.js';
import { Command } from 'commander';
import { expand } from 'dotenv-expand';
import { config } from 'dotenv-flow';
import fastify from 'fastify';

expand(config());

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
		async ({
			nameserver1,
			nameserver2,
			cfEmail,
			cfKey,
			namesiloKey,
			port,
			host,
		}) => {
			const db = new Server();
			await db.openDB();
			console.log('DB open');

			const server = fastify({
				logger: {
					level: 'error',
				},
			});

			server.route({
				url: '*',
				method: 'OPTIONS',
				handler(request, reply) {
					cors(request, reply);
					reply.send();
				},
			});

			server.register(registerTheatre, {
				prefix: '/theatre',
				db,
				cors,
			});

			server.register(registerCompat, {
				prefix: '/compat',
				db,
				cors,
			});

			server.register(registerVoucher, {
				prefix: '/vouchers',
				db,
				cors,
				nameserver1,
				nameserver2,
				cfEmail,
				cfKey,
				namesiloKey,
			});

			server.listen(port, host, (error, url) => {
				if (error) {
					console.error(error);
					process.exit(1);
				}

				console.log('Fastify server listening. View live at', url);
			});
		}
	);

program.parse(process.argv);
