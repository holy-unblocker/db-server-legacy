import { Command, Option } from 'commander';
import { GAME_TYPES } from './Objects.js';
import server from './cli/server.js';
import {
	create_game,
	delete_game,
	show_game,
	list_games,
	update_game,
} from './cli/util.js';

const program = new Command();

program
	.command('server')
	.addOption(
		new Option('-h, --host <string>', 'Listening host').default('localhost')
	)
	.addOption(
		new Option('-p, --port <number>', 'Listening port').default(80).env('PORT')
	)
	.action(server);

program
	.command('create-game')
	.addOption(new Option('-n, --name <name>'))
	.addOption(new Option(`-c, --category <category>`))
	.addOption(new Option(`-t, --type <${GAME_TYPES}>`))
	.addOption(new Option(`-s, --src <url>`))
	.action(create_game);

program
	.command('update-game')
	.argument('id')
	.option('-n, --name <name>')
	.option(`-c, --category <category>`)
	.option(`-t, --type <${GAME_TYPES}>`)
	.option(`-s, --src <url>`)
	.action(update_game);

program.command('show-game').argument('id').action(show_game);

program.command('delete-game').argument('id').action(delete_game);

program.command('list-games').argument('[category]').action(list_games);

program.parse(process.argv);
