AbbrevsFilter.prototype.setDBVersion = Zotero.Promise.coroutine(function* (facility, version) {
	var sql = 'SELECT COUNT(*) FROM version WHERE schema=?';
	var hasSchema = yield this.db.valueQueryAsync(sql,[facility]);
	if (!hasSchema) {
		sql = "INSERT INTO version VALUES (?,?)";
		yield this.db.queryAsync(sql, [facility, version]);
	} else {
		sql = "UPDATE version SET version=? WHERE schema=?;";
		yield this.db.queryAsync(sql, [version, facility]);
	}
});

AbbrevsFilter.prototype.getDBVersion = Zotero.Promise.coroutine(function* (facility) {
	var tableExists = yield this.db.tableExists("version");
	if (tableExists) {
        var sql = "SELECT version FROM version WHERE schema=?";
        var dbVersion = yield this.db.valueQueryAsync(sql,[facility]);
        if (dbVersion) {
            dbVersion = parseInt(dbVersion, 10);
        } else {
            dbVersion = 0;
        }
    } else {
        dbVersion = 0;
    }
    return dbVersion;
});
