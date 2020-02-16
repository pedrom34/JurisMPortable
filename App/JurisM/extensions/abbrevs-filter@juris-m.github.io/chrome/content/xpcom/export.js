// Export an abbreviation list
AbbrevsFilter.prototype.exportList = function (window, document) {
	var me = this;
	Zotero.Promise.spawn(function* () {		
		var styleID = me.styleID;
		var shortname = styleID;
		var m = styleID.match(/.*\/(.*)/);
		if (m) {
			shortname = m[1];
		}
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Set the file for export", nsIFilePicker.modeSave);
		fp.appendFilter("JSON data", "*.json");
		fp.defaultExtension = ".json";
		fp.defaultString = shortname + ".json"
		var rv = fp.show();
		if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
			var json_obj = {};
			var sql = "SELECT jurisdiction,category,Raw.string AS raw,Abbr.string AS abbr FROM abbreviations "
				+ "NATURAL JOIN list "
				+ "NATURAL JOIN jurisdiction "
				+ "NATURAL JOIN category "
				+ "LEFT JOIN strings Raw ON abbreviations.rawID=Raw.stringID "
				+ "LEFT JOIN strings Abbr ON abbreviations.abbrID=Abbr.stringID "
				+ "WHERE list=?";

			// Why select by category? Why not just grab everything, and
			// assign what drifts through the category filter to JSON?

			var rows = yield me.db.queryAsync(sql, [styleID]);
			for (var i = 0, ilen = rows.length; i < ilen; i += 1) {
				var row = rows[i];
				if (["title", "title-phrase", "container-phrase", "nickname", "hereinafter"].indexOf(row.category) > -1) {
					continue;
				}
				if (!json_obj[row.jurisdiction]) {
					json_obj[row.jurisdiction] = {};
				}
				if (!json_obj[row.jurisdiction][row.category]) {
					json_obj[row.jurisdiction][row.category] = {};
				}
				json_obj[row.jurisdiction][row.category][row.raw] = row.abbr;
			}

			json_str = JSON.stringify(json_obj, null, 2);
			file = fp.file;
			Components.utils.import("resource://gre/modules/NetUtil.jsm");
			Components.utils.import("resource://gre/modules/FileUtils.jsm");
			var ostream = FileUtils.openSafeFileOutputStream(file)
			var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";
			var istream = converter.convertToInputStream(json_str);
   			NetUtil.asyncCopy(istream, ostream);
		}
	});
};
