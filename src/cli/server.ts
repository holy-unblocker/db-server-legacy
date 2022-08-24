import dbConnect from '../dbConnect.js';
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
	.option('-p, --port <number>', 'Listening port', process.env.PORT || '80')
	.action(async ({ port, host }) => {
		const client = await dbConnect();
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
			client,
			cors,
		});

		server.register(registerCompat, {
			prefix: '/compat',
			client,
			cors,
		});

		server.register(registerVoucher, {
			prefix: '/vouchers',
			client,
			cors,
		});

		server.listen(port, host, (error, url) => {
			if (error) {
				console.error(error);
				process.exit(1);
			}

			console.log('Fastify server listening. View live at', url);
		});
	});

program.parse(process.argv);