import { expand } from 'dotenv-expand';
import { config } from 'dotenv-flow';

expand(config());

export const pgURL = process.env.PG_URL || '';
if (!pgURL) throw new TypeError('Postgresql connection URI required (PG_URL)');
