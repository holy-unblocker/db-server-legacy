import type { DNSRecord, Zone } from '@e9x/cloudflare/v4';

export const getRules = (zoneName: Zone['name']) => [
	{
		status: 'active',
		priority: 1,
		actions: [{ id: 'cache_level', value: 'cache_everything' }],
		targets: [
			{
				target: 'url',
				constraint: {
					operator: 'matches',
					value: `${zoneName}/static/*`,
				},
			},
		],
	},
	{
		status: 'active',
		priority: 1,
		actions: [{ id: 'cache_level', value: 'cache_everything' }],
		targets: [
			{
				target: 'url',
				constraint: {
					operator: 'matches',
					value: `${zoneName}/cdn/*`,
				},
			},
		],
	},
];

export const getDNS = (zoneName: Zone['name']) =>
	<DNSRecord[]>[
		{
			name: `rh.${zoneName}`,
			type: 'CNAME',
			content: 'rh.holyubofficial.net',
			proxied: true,
		},
		{
			name: `uv.${zoneName}`,
			type: 'CNAME',
			content: 'uv.holyubofficial.net',
			proxied: true,
		},
		{
			name: zoneName,
			type: 'CNAME',
			content: 'holyubofficial.net',
			proxied: true,
		},
		{
			name: 'www',
			type: 'CNAME',
			content: 'www.holyubofficial.net',
			proxied: true,
		},
	];
