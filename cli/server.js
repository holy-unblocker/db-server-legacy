import Fastify from 'fastify';
import Server from '../Server.js';
import registerGames from './registerGames.js';
import registerCompat from './registerCompat.js';
import { cors } from './serverCommon.js';

export default function server({ secret, port, host }) {
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
	});

	fastify.register(registerCompat, {
		prefix: '/compat',
		server,
	});

	console.log('HCaptcha secret:', secret);

	fastify.listen(port, host, (error, url) => {
		if (error) {
			console.error(error);
			process.exit(1);
		}

		console.log('Fastify server listening. View live at', url);
	});
}
