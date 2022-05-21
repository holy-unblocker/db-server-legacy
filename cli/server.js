import { config } from 'dotenv-flow';
config();

import { Command } from 'commander';
import Fastify from 'fastify';
import Server from '../Server.js';
import registerGames from '../registerGames.js';
import registerCompat from '../registerCompat.js';

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
		'-s, --secret <string>',
		'HCaptcha secret',
		process.env.HCAPTCHA_SECRET || '0x0000000000000000000000000000000000000000'
	)
	.action(({ secret, port, host }) => {
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

		fastify.register(registerGames, {
			prefix: '/games',
			server,
			secret,
			cors,
		});

		fastify.register(registerCompat, {
			prefix: '/compat',
			server,
			cors,
		});

		fastify.listen(port, host, (error, url) => {
			if (error) {
				console.error(error);
				process.exit(1);
			}

			console.log('Fastify server listening. View live at', url);
		});
	});

program.parse(process.argv);
