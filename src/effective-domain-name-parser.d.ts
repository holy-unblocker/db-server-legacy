declare module 'effective-domain-name-parser' {
	export function parse(name: string): {
		tld: string;
		sld: string;
		subdomain: string;
	};
}
