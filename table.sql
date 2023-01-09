CREATE EXTENSION pg_trgm;

CREATE TABLE IF NOT EXISTS theatre (
	index SERIAL,
	id TEXT PRIMARY KEY NOT NULL UNIQUE,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	type TEXT NOT NULL,
	src TEXT NOT NULL,
	plays INTEGER NOT NULL,
	controls TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS trgm_idx ON theatre USING GIST (name gist_trgm_ops);

CREATE TABLE IF NOT EXISTS compat (
	host TEXT PRIMARY KEY NOT NULL UNIQUE,
	proxy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vouchers (
	code TEXT PRIMARY KEY NOT NULL UNIQUE,	
	tld TEXT NOT NULL,
	issued DATE NOT NULL DEFAULT CURRENT_DATE,
	-- 0 - valid
	-- 1 - redeemed
	-- 2 - invalid (fraud, etc)
	status INT NOT NULL DEFAULT 0,
	-- the redeemed domain name
	-- NULL if not redeemed
	name TEXT,
	redeemed_on DATE
);