export type i18nData = Record<string, string>;

export interface i18nRes {
	i18n: true;
	key: string;
	data: i18nData;
}

export default function t(key: string, data: i18nData = {}) {
	return {
		i18n: true,
		key,
		data,
	} as i18nRes;
}
