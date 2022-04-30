export function cors(request, reply) {
	reply.header('access-control-allow-headers', '*');
	reply.header('access-control-allow-origin', request.headers.origin || '*');
	reply.header('access-control-allow-max-age', '600');
	reply.header('access-control-allow-credentials', 'true');
	reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE');
}
