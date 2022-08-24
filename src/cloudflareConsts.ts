import type { DNSRecord, Zone } from '@e9x/cloudflare/v4';

export const getRules = (zone: Zone) => [
	{
		status: 'active',
		priority: 1,
		actions: [{ id: 'cache_level', value: 'cache_everything' }],
		targets: [
			{
				target: 'url',
				constraint: {
					operator: 'matches',
					value: `${zone.name}/static/*`,
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
					value: `${zone.name}/theatre/*`,
				},
			},
		],
	},
];

export const getDNS = () =>
	<DNSRecord[]>[
		{
			name: 'rh',
			type: 'CNAME',
			content: 'rh.holy.how',
			proxied: true,
		},
		{
			name: 'uv',
			type: 'CNAME',
			content: 'uv.holy.how',
			proxied: true,
		},
		{
			name: 'a',
			type: 'CNAME',
			content: 'a.holy.how',
			proxied: true,
		},
		{
			name: '@',
			type: 'CNAME',
			content: 'static.holy.how',
			proxied: true,
		},
		{
			name: 'www',
			type: 'CNAME',
			content: 'static.holy.how',
			proxied: true,
		},
		{
			name: 'wm',
			type: 'CNAME',
			content: 'wm.holy.how',
			proxied: true,
		},
		{
			name: 'paln',
			type: 'CNAME',
			content: 'pal.holy.how',
			proxied: true,
		},
	];
