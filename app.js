import { Command } from 'commander';
import { GAME_TYPES } from './GamesWrapper.js';
import { PROXY_TYPES } from './CompatWrapper.js';
import server from './cli/server.js';
import {
	create_game,
	delete_game,
	show_game,
	list_games,
	update_game,
} from './cli/gameUtil.js';

import {
	create_compat,
	delete_compat,
	show_compat,
	list_compat,
	update_compat,
} from './cli/compatUtil.js';

const program = new Command();

program
	.command('server')
	.option('-h, --host <string>', 'Listening host', 'localhost')
	.option(
		'-p, --port <number>',
		'Listening port',
		'PORT' in process.env ? process.env.PORT : 80
	)
	.option(
		'-s, --secret <string>',
		'HCaptcha secret',
		'0x0000000000000000000000000000000000000000'
	)
	.action(server);

program
	.command('create-game')
	.requiredOption('-n, --name <name>')
	.requiredOption('-c, --category <category>')
	.requiredOption(`-t, --type <${GAME_TYPES}>`)
	.requiredOption('-s, --src <url>')
	.action(create_game);

program
	.command('update-game')
	.argument('id')
	.option('-n, --name <name>')
	.option('-c, --category <category>')
	.option(`-t, --type <${GAME_TYPES}>`)
	.option('-s, --src <url>')
	.action(update_game);

program.command('show-game').argument('id').action(show_game);

program.command('delete-game').argument('id').action(delete_game);

program.command('list-games').argument('[category]').action(list_games);

program
	.command('create-compat')
	.argument('host')
	.requiredOption(`-p, --proxy <${PROXY_TYPES}>`)
	.action(create_compat);

program
	.command('update-compat')
	.argument('host')
	.option(`-p, --proxy <${PROXY_TYPES}>`)
	.action(update_compat);

program.command('show-compat').argument('host').action(show_compat);

program.command('delete-compat').argument('host').action(delete_compat);

program.command('list-compat').action(list_compat);

program.parse(process.argv);
