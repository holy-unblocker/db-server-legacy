import fetch, { Headers } from 'node-fetch';

function formatError({ code, message, error_chain }) {
	const result = [`Error ${code}: ${message}`];

	if (error_chain) {
		for (let error of error_chain) {
			result.push(
				formatError(error)
					.split('\n')
					.map(line => `\t${line}`)
					.join('\n')
			);
		}
	}

	return result.join('\n');
}

/**
 *
 * @param {string} key
 * @param {string} email
 * @param {string|url} url
 * @param {{method:string,body:string}} [cf_init]
 * @returns {Promise<object>}
 */
export async function fetchCloudflare(key, email, url, cf_init = {}) {
	const init = {
		headers: new Headers({
			'x-auth-key': key,
			'x-auth-email': email,
		}),
		method: cf_init.method,
	};

	if (cf_init.body !== undefined) {
		init.headers.set('content-type', 'application/json');
		init.body = JSON.stringify(cf_init.body);
	}

	const request = await fetch(
		new URL(url, 'https://api.cloudflare.com/client/'),
		init
	);

	const { success, result, errors, messages } = await request.json();

	for (let message of messages) {
		console.warn(message);
	}

	if (!success) {
		throw new Error('\n' + errors.map(formatError).join('\n'));
	}

	return result;
}

/**
 *
 * @typedef {object} Zone
 * @param {string} id
 * @param {string} name
 */

/**
 *
 * @param {string} key
 * @param {string} email
 * @returns {AsyncGenerator<object>}
 */
export async function* listAllZones(key, email) {
	let page = 0;

	while (true) {
		page++;

		const zones = await fetchCloudflare(key, email, `v4/zones?page=${page}`);

		if (!zones.length) {
			break;
		}

		for (let zone of zones) {
			yield zone;
		}
	}
}
