AbbrevsFilter.prototype.initComponent = Zotero.Promise.coroutine(function* (Zotero) {
	dump("[AFZ] initComponent\n");
	try {
		Zotero.Prefs.init();
		yield Zotero.DataDirectory.init();
		this.Zotero = Zotero;
		this.CSL = Zotero.CiteProc.CSL;
		this.sys = new Zotero.Cite.System({ automaticJournalAbbreviations: false, uppercaseSubtitles: false });
		this.db = new Zotero.DBConnection("abbrevs-filter");
	} catch (e) {
		dump("[AFZ] initComponent OOPS: " + e);
	}
	yield this.initDB();
    this.attachPreloadAbbreviations();
    this.attachGetAbbreviation();
    this.attachSetSuppressJurisdictions();
	this.attachSetCachedAbbrevList();
	yield this.setCachedAbbrevList(Zotero.Prefs.get("export.quickCopy.setting"));
	this.attachGetCachedAbbrevList();
});

AbbrevsFilter.prototype.initPage = function () {}

AbbrevsFilter.prototype.initWindow = function (window, document) {
    if (!window.arguments) return;
    try {
	    var io = window.arguments[0].wrappedJSObject;
        this.io = io;
        var styleID = io.style.opt.styleID;
	    this.categories = [];
	    for (var key in io.style.transform.abbrevs) {
		    this.categories.push(key);
	    }
	    this.categories.sort();
	    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
	    prefs = prefs.getBranch("extensions.abbrevs-filter.");
	    var category = prefs.getCharPref("currentCategory");
	    var transform = io.style.transform;
	    this.transform = transform;
	    // Strings and things.
	    stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
		    .getService(Components.interfaces.nsIStringBundleService)
		    .createBundle("chrome://abbrevs-filter/locale/overlay.properties")
	    if (!category) {
		    category = "container-title";
	    }
    } catch (e) {
        this.Zotero.debug("AFZ: [ERROR] failure while attempting to add UI to Zotero integration: "+e);
    }
}

AbbrevsFilter.prototype.initDB = Zotero.Promise.coroutine(function* () {
    var sql = Zotero.File.getContentsFromURL("resource://abbrevs-filter/schema/abbrevs-filter.sql");
    var version = parseInt(sql.match(/^-- ([0-9]+)/)[1]);
	var tableExists = yield this.db.tableExists("abbreviations");
try {
    if (!tableExists) {
        Zotero.debug("AFZ: [SETUP] no abbreviations table table found, performing scratch install)");
		yield this.db.executeTransaction(function* () {
			yield this.db.executeSQLFile(sql);
			yield this.setDBVersion('abbreviations', version);
		}.bind(this));
	} else {
		yield this.db.executeTransaction(function* () {
			var dbVersion = yield this.getDBVersion('abbreviations');
			if (version > dbVersion) {
				Zotero.debug("AFZ: [SETUP] upgrading database schema to version " + version);
				try {
					// make backup of database first
					this.db.backupDatabase(dbVersion, true);
					
					for (var i=dbVersion,ilen=version+1;i<ilen;i+=1) {
						// Next version
						// if (i === 15) {
						//   Do stuff
						//}
					}
					yield this.setDBVersion('abbreviations', version);
					
				} catch (e) {
					Zotero.debug("AFZ: [ERROR] failure during setup: "+e);
					throw("AFZ: [ERROR] failure during setup: " + e);
				}
			}
		}.bind(this));
	}
} catch (e) {
	dump("[AFZ] dbInit OOPS: " + e + "\n");
}
});
