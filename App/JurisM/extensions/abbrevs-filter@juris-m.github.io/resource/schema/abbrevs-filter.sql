-- 15

DROP TABLE IF EXISTS suppressme;
CREATE TABLE suppressme (
   suppressmeID INTEGER PRIMARY KEY,
   jurisdictionID INTEGER,
   listID INTEGER
);
CREATE INDEX suppressme_list_jurisdiction ON suppressme(listID,jurisdictionID);

DROP TABLE IF EXISTS abbreviations;
CREATE TABLE abbreviations (
   abbreviationIdx INTEGER PRIMARY KEY,
   listID INTEGER,
   jurisdictionID INTEGER,
   categoryID INTEGER,
   rawID INTEGER,
   abbrID INTEGER,
   UNIQUE (listID, jurisdictionID, categoryID, rawID)
);
CREATE INDEX abbreviations_listID ON abbreviations(listID);
CREATE INDEX abbreviations_jurisdictionID ON abbreviations(jurisdictionID);
CREATE INDEX abbreviations_categoryID ON abbreviations(categoryID);
CREATE INDEX abbreviations_rawID ON abbreviations(rawID);
CREATE INDEX abbreviations_abbrID ON abbreviations(abbrID);

DROP TABLE IF EXISTS list;
CREATE TABLE list (
	listID INTEGER PRIMARY KEY,
	list TEXT NOT NULL
);
CREATE INDEX list_list ON list(list);

DROP TABLE IF EXISTS jurisdiction;
CREATE TABLE jurisdiction (
	jurisdictionID INTEGER PRIMARY KEY,
	jurisdiction TEXT NOT NULL
);
CREATE INDEX jurisdiction_jurisdiction ON jurisdiction(jurisdiction);
INSERT INTO jurisdiction VALUES(NULL, 'default');


DROP TABLE IF EXISTS category;
CREATE TABLE category (
	categoryID INTEGER PRIMARY KEY,
	category TEXT NOT NULL
);
CREATE INDEX category_category ON category(category);


DROP TABLE IF EXISTS containerPhrase;
CREATE TABLE containerPhrase (
	phraseID INTEGER PRIMARY KEY,
    listID INTEGER NOT NULL,
    jurisdictionID INTEGER,
	primaryID INTEGER NOT NULL,
    secondaryLen INTEGER NOT NULL,
	secondaryID INTEGER NOT NULL,
    abbrID TEXT NOT NULL
);

DROP TABLE IF EXISTS titlePhrase;
CREATE TABLE titlePhrase (
	phraseID INTEGER PRIMARY KEY,
    listID INTEGER NOT NULL,
    jurisdictionID INTEGER,
	primaryID INTEGER NOT NULL,
    secondaryLen INTEGER NOT NULL,
	secondaryID INTEGER NOT NULL,
    abbrID TEXT NOT NULL
);
DROP TABLE IF EXISTS strings;
CREATE TABLE strings (
	stringID INTEGER PRIMARY KEY,
	string TEXT NOT NULL
);
CREATE INDEX strings_string ON strings(string);


DROP TABLE IF EXISTS version;
CREATE TABLE version (
	schema TEXT NOT NULL,
	version INTEGER NOT NULL
);

DROP TABLE IF EXISTS abbrevsInstalled;
CREATE TABLE abbrevsInstalled (
    styleID TEXT,
    importListName TEXT,
    version INT,
    PRIMARY KEY (styleID, importListName)
);

CREATE INDEX title_phrase_primaryID ON titlePhrase(jurisdictionID, primaryID, secondaryLen, secondaryID);
CREATE INDEX container_phrase_primaryID ON containerPhrase(jurisdictionID, primaryID, secondaryLen, secondaryID);
