AbbrevsFilter.prototype.importList = 	Zotero.Promise.coroutine(function* (window, document, params) {
	/*
	  params = {
	  fileForImport: fp.file || false,
	  resourceListMenuValue: str (filename of list) || false,
	  mode: 0, 1, or 2
	  }
	*/
	
	yield this.JurisdictionMapper.init(this);
	
	var me = this;

	var sql, sqlinsert;
	var Zotero = me.Zotero;
	var CSL = me.CSL;
	var json_str = "";

	var jurisAbbrevsDir = Zotero.getJurisAbbrevsDirectory().path;
	
	if (params.fileForImport) {
		var file = params.fileForImport;
		params.fileForImport = false;
		// work with returned nsILocalFile...
		// |file| is nsIFile
		var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Components.interfaces.nsIFileInputStream);
		var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
			.createInstance(Components.interfaces.nsIConverterInputStream);
		fstream.init(file, -1, 0, 0);
		cstream.init(fstream, "UTF-8", 0, 0);
		var str = {};
		var read = 0;
		do {
			read = cstream.readString(0xffffffff, str);
			json_str += str.value;
		} while (read != 0);
		cstream.close(); // me closes fstream
	} else if (params.resourceListMenuValue) {
		json_str = yield Zotero.File.getContentsAsync(OS.Path.join(jurisAbbrevsDir, params.resourceListMenuValue));
	}

	var importOneList = Zotero.Promise.coroutine(function* (obj, shy) {
		var curr = 0;
		var tots = 0;
		for (var jurisdiction of Object.keys(obj)) {
			for (var category of Object.keys(obj[jurisdiction])) {
				for (var key of Object.keys(obj[jurisdiction][category])) {
					tots++;
				}
			}
		}
		if (document) {
			var progressNode = document.getElementById("import-progress");
			progressNode.setAttribute("hidden", false);
			progressNode.setAttribute("value", 0);
			progressNode.setAttribute("max", tots);
		}
		for (var jurisdiction of Object.keys(obj)) {
			for (var category of Object.keys(obj[jurisdiction])) {
				for (var key of Object.keys(obj[jurisdiction][category])) {
					var val = obj[jurisdiction][category][key];
					yield me.saveEntry(params.styleID, jurisdiction, category, key, val, shy);
					curr++;
					if (document) {
						if (!(curr % 10)) {
							progressNode.setAttribute("value", curr);
						}
					}
				}
			}
		}
	}.bind(me));

	if (json_str) {
		var listObj = JSON.parse(json_str);
		yield me.db.executeTransaction(function* () {
			switch (params.mode) {
			case 0:
				var shy = true;
				break;
				;;
			case 1:
				var shy = false;
				break
				;;
			case 2:
				var sql = "SELECT listID FROM list WHERE list=?";
				var listID = yield me.db.valueQueryAsync(sql, [params.styleID]);
				var sql = "DELETE FROM abbreviations WHERE listID=?";
				yield me.db.queryAsync(sql, [listID]);
				me.transform.abbrevs = {};
				me.transform.abbrevs["default"] = new me.CSL.AbbreviationSegments();
				var shy = false;
				var sql = "DELETE FROM abbrevsInstalled WHERE styleID=?";
				yield me.db.queryAsync(sql, [params.styleID]);
				me.abbrevsInstalled[params.styleID] = {};
				break;
				;;
			default:
				throw "Me can't happen";
				break;
				;;
			}
			if (listObj.xdata) {
				listObj = listObj.xdata;
				yield importOneList(listObj, shy);
			} else {
				var normalizedObjects = normalizeObjects(listObj);
				for (var i=0,ilen=normalizedObjects.length;i<ilen;i++) {
					yield importOneList(normalizedObjects[i], shy);
				}
			}
		}.bind(me));
		if (document) {
			var progressNode = document.getElementById("import-progress");
			progressNode.setAttribute("hidden", true);
		}
		if (window) {
			window.close();
		}
	}

	function normalizeObjects(obj) {
		// Set a list in which to collect objects
		// Traverse until we find an object with conforming keys and string pairs.
		var collector = [];
		getValidObjects(collector,null,obj);
		return collector;
	}
	function getValidObjects(collector,jurisdiction,obj) {
		if (!obj || "object" !== typeof obj || obj.length) {
			// Protect against: null obj, obj without keys
			return;
		}
		// Check if obj contains (at least one?) conforming key
		if (jurisdiction && hasValidKeys(obj) && hasValidKeyValues(obj)) {
			// If so, sanitize the object and push into collector
			var newObj = {};
			sanitizeObject(obj);
			newObj[jurisdiction] = obj;
			collector.push(newObj);
		} else {
			// If me isn't an abbrevs object itself, check each of its keys
			for (var key in obj) {
				getValidObjects(collector,key,obj[key]);
			}
		}
	}
	function hasValidKeys(obj) {
		// Check that all keys are valid
		for (var key in obj) {
			if (isValidKey(key)) {
				return true;
			}
		}
		return false;
	}
	function isValidKey(key) {
		var validKeys = [
			"container-title",
			"collection-title",
			"institution-entire",
			"institution-part",
			"nickname",
			"number",
			"title",
			"place",
			"hereinafter",
			"classic",
			"container-phrase",
			"title-phrase"
		]
		if (validKeys.indexOf(key) > -1) {
			return true;
		}
		return false;
	}
	function hasValidKeyValues(obj) {
		var ret = false;
		for (var key in obj) {
			if (!obj[key]) {
				continue;
			}
			for (var subkey in obj[key]) {
				if (obj[key][subkey] && "string" === typeof obj[key][subkey]) {
					ret = true;
				}
			}
		}
		return ret;
	}
	function sanitizeObject(obj) {
		// Blindly purge invalid keys and subkeys that are not simple key/string pairs.
		for (var key in obj) {
			if (!obj[key] || !isValidKey(key)) {
				delete obj[key];
				continue;
			}
			for (var subkey in obj[key]) {
				if (!obj[key][subkey] || "string" !== typeof obj[key][subkey]) {
					delete obj[key][subkey];
				}
			}
		}
	}
});
