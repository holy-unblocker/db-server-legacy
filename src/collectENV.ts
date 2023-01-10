import { expand } from 'dotenv-expand';
import { config } from 'dotenv-flow';

expand(config());

export const cfEmail: string = process.env.CF_EMAIL!;
export const cfKey: string = process.env.CF_KEY!;
export const namesiloKey: string = process.env.NAMESILO!;
export const nameserver1: string = process.env.NS1!;
export const nameserver2: string = process.env.NS2!;
// for debugging without spending money
export const skipPayment: boolean = process.env.SKIP_PAYMENT === '1';
