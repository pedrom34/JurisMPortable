
// Okay!
// This needs to Do The Right Thing for jurisdiction and court.

AbbrevsFilter.prototype.preloadAbbreviations = Zotero.Promise.coroutine(function* (styleEngine, citation) {
	if (this._preloadingInProgress) return;
	this._preloadingInProgress = true;
	var styleID = styleEngine.opt.styleID;
	var obj = styleEngine.transform.abbrevs;
	var suppressedJurisdictions = styleEngine.opt.suppressedJurisdictions;
	var CSL = this.CSL;
	var jurisdiction, category, rawvals;
	var isMlzStyle = styleEngine.opt.version.slice(0, 4) === '1.1m';
	var styleModulePreferences = styleEngine.locale[styleEngine.opt.lang].opts["jurisdiction-preference"];

	let rawFieldFunction = {
        "container-title": function (item, varname) {
            return item[varname] ? [item[varname]] : [];
        },
        "collection-title": function (item, varname) {
		    return item[varname] ? [item[varname]] : [];
        },
        "institution-entire": function (item, varname) {
		    let ret = [];
		    let names = item[varname];
		    for (let i=0,ilen=names.length;i<ilen;i++) {
			    if (names[i].literal) {
				    ret.push(names[i].literal);
			    }
		    }
		    return ret.length ? ret : [];
        },
        "institution-part": function (item, varname) {
		    let ret = [];
		    let names = item[varname];
		    for (let i=0,ilen=names.length;i<ilen;i++) {
			    if (names[i].literal) {
				    let nameparts = names[i].literal.split(/\s*\|\s*/);
				    for (let j=0,jlen=nameparts.length;j<jlen;j++) {
					    ret.push(nameparts[j]);
				    }
			    }
		    }
		    return ret.length ? ret : [];
        },
        "number": function (item, varname) {
            return varname === "number" ? [item[varname]] : [];
        },
        "title": function (item, varname) {
		    return [
			    "title",
			    "title-short",
			    "genre",
			    "event",
			    "medium"
		    ].indexOf(varname) > -1 ? [item[varname]] : [];
        },
        "place": function (item, varname) {
		    return [
			    "archive-place",
			    "publisher-place",
			    "event-place",
			    "country",
			    "jurisdiction",
			    "language-name",
			    "language-name-original"
		    ].indexOf(varname) > -1 ? [item[varname]] : [];
        }
    };

	// For items
    let rawItemFunction = {
        "nickname": function (item) {
		    var ret = [];
		    for (let varname in CSL.CREATORS) {
			    if (item[varname]) {
				    for (let i=0,ilen=item[varname].length;i<ilen;i++) {
					    let name = item[varname][i];
					    if (!name.literal) {
						    let rawname = CSL.Util.Names.getRawName(item[varname][i]);
						    ret.push(rawname);
					    }
				    }
			    }
		    }
		    return ret.length ? ret : false;
        },
        "hereinafter": function (item) {
            return item.id;
        },
        "classic": function (item) {
		    // This is a change from legacy, which used "<author>, <title>"
            return item.id;
        }
    }

	var _registerEntries = Zotero.Promise.coroutine(function* (val, jurisdictions, category, passed_field) {
		if (passed_field) {
			var topCode = jurisdictions.join(":");
			var humanVal = null;
			if ("authority" === passed_field) {
				humanVal = styleEngine.sys.getHumanForm(topCode, val);
				// If humanVal found, assume val is a code. Normalize humanVal, leave
				// val unscathed. Otherwise, normalize val.
				if (humanVal) {
					humanVal = styleEngine.sys.normalizeAbbrevsKey(passed_field, humanVal);
				} else {
					val = styleEngine.sys.normalizeAbbrevsKey(passed_field, val);
				}
			} else {
				val = styleEngine.sys.normalizeAbbrevsKey(passed_field, val);
			}
		}
		for (let i=jurisdictions.length;i>0;i--) {
			let jurisdiction = jurisdictions.slice(0,i).join(":");
			yield this._setCacheEntry(styleID, obj, jurisdiction, category, val, humanVal);
		}
		yield this._setCacheEntry(styleID, obj, "default", category, val, humanVal);
	}.bind(this));

	// process
	for (var i=0,ilen=citation.citationItems.length;i<ilen;i++) {
		var id = citation.citationItems[i].id;
		var item = this.sys.retrieveItem(id);
		if (item.jurisdiction) {
			var jurisdictions = item.jurisdiction.split(":");
			// Do it. Right here.
			yield this.installAbbrevsForJurisdiction(styleID, jurisdictions[0], styleModulePreferences);
		} else {
			var jurisdictions = [];
		}
		if (item.language) {
			var lst = item.language.toLowerCase().split("<");
			if (lst.length > 0) {
				item["language-name"] = lst[0];
			}
			if (lst.length === 2) {
				item["language-name-original"] = lst[1];
			}
		}
		// fields
		for (let field of Object.keys(item)) {
			category = CSL.FIELD_CATEGORY_REMAP[field];
			var rawvals = false;
			var hackedvals = false;
			if (category) {
				rawvals = rawFieldFunction[category](item, field).map(function(val){
					return [val, category, field];
				});
				if ("jurisdiction" === field) {
					rawvals = rawvals.concat(rawFieldFunction[category](item, field).map(function(val){
						val = val.split(":")[0];
						return [val, category, "country"];
					}));
				}
			} else if (CSL.CREATORS.indexOf(field) > -1) {
				rawvals = rawFieldFunction["institution-entire"](item, field).map(function(val){
					return [val, "institution-entire", field];
				});
				rawvals = rawvals.concat(rawFieldFunction["institution-part"](item, field).map(function(val){
					return [val, "institution-part", field];
				}));
			} else if (field === "authority") {
				if ("string" === typeof item[field]) {
					//var spoofItem = {authority:[{literal:styleEngine.sys.getHumanForm(item.jurisdiction, item[field])}]};
					var spoofItem = {authority:[{literal:item[field]}]};
				} else {
					var spoofItem = item;
				}
				rawvals = rawFieldFunction["institution-entire"](spoofItem, field).map(function(val){
					return [val, "institution-entire", field];
				});
				rawvals = rawvals.concat(rawFieldFunction["institution-part"](spoofItem, field).map(function(val){
					return [val, "institution-part", field];
				}));
			}
			if (!rawvals) continue;
			for (var j=0,jlen=rawvals.length;j<jlen;j++) {
				var val = rawvals[j][0];
				var category = rawvals[j][1];
				var passed_field = rawvals[j][2];

				// zzz This would have broken courtID if it contains a period.
				// val = styleEngine.sys.normalizeAbbrevsKey(passed_field, val);

				yield _registerEntries(val, jurisdictions, category, passed_field);
				if (item.multi && item.multi._keys.jurisdiction) {
					for (var key of Object.keys(item.multi._keys.jurisdiction)) {
						val = item.multi._keys[key];

						// zzz see above
						// val = styleEngine.sys.normalizeAbbrevsKey(passed_field, val);

						yield _registerEntries(val, jurisdictions, category, passed_field);
					}
				}
			}
			
		}
		// items
		for (let key in rawItemFunction) {
			rawvals = rawItemFunction[key](item);
			for (let i=0,ilen=rawvals.length;i<ilen;i++) {
				var val = rawvals[i];
				yield _registerEntries(val, jurisdictions, key);
			}
		}
		yield this.Zotero.CachedJurisdictionData.load(item);
	}
	this._preloadingInProgress = false;
});

AbbrevsFilter.prototype._setCacheEntry = Zotero.Promise.coroutine(function* (styleID, obj, jurisdiction, category, rawval, humanRawVal) {
	if (!rawval) return;
	var sql, abbrev;
	var kc = this.keycache;
	
	// Otherwise, set the cache for the current entry and all of its fallbacks from DB record,
	// stopping at the first hit.
	rawval = "" + rawval;
	let rawID = yield this._getStringID(rawval);

	// Screw-up recovery here.

	// Code originally used human-readable transform of rawval for
	// institution names.  This worked more or less, but when
	// processing a courtID, the post-processed key was used for DB
	// save, retrieval, and mapping -- which defeated the purpose of
	// using a machine-readable key in the first place.

	// Som Many mappings in the wild have been set to the human
	// rawval, but we need to migrate to machine-rawval without
	// breaking everyone's existing abbreviation choices.

	// Try machine-rawval first. If we find it, just use it.

	// If there is NO machine-rawval, try for a match on the old
	// human-rawval if one is provided.

	// If human-rawval is used, we read it into memory against the
	// machine-readable key that we now use for mappings. The result
	// of the remapping will be that the human-rawval abbrev becomes a
	// persistent read-only fallback value standing behind any abbrev
	// set directly on the machine-readable key. That's a small price
	// to pay for what could have been substantial data loss in user
	// abbrev listings.

	var humanRawID = false;
	if (humanRawVal) {
		humanRawID = yield this._getStringID(humanRawVal);
	}
	if (rawID || humanRawID) {
		var jurisd = jurisdiction;
		yield this.db.executeTransaction(function* () {
			yield this._setKeys(styleID, jurisd, category);
		}.bind(this));
		if (!obj[jurisd]) {
			obj[jurisd] = {};
		}
		if (!obj[jurisd][category]) {
			obj[jurisd][category] = {};
		}
	}
	var ids = [rawID];
	if (humanRawID) {
		ids.push(humanRawID);
	}
	for (var i=0,ilen=ids.length; i<ilen; i++) {
		var id = ids[i];
		if (id) {
			sql = "SELECT S.string AS abbrev FROM abbreviations A JOIN strings S ON A.abbrID=S.stringID WHERE listID=? AND jurisdictionID=? AND categoryID=? AND rawID=?";
			abbrev = yield this.db.valueQueryAsync(sql, [kc[styleID], kc[jurisd], kc[category], id]);
			if (abbrev) {
				obj[jurisd][category][rawval] = abbrev;
				break;
			}
		}
	}
});

AbbrevsFilter.prototype._setKeys = Zotero.Promise.coroutine(function* (styleID, jurisdiction, category) {
	var me = this;
	var sql, res, abbrID, kc = this.keycache;
	let keys = {
		list: styleID,
		jurisdiction: jurisdiction,
		category: category
	}
	for (let key in keys) {
		if (!keys[key]) {
			throw `[AFZ] No value for ${key} in _setKeys()`;
		}
		if (!kc[keys[key]]) {
			// Look up or create ID
			sql = `SELECT ${key}ID FROM ${key} WHERE ${key}=?`;
			var id = yield this.db.valueQueryAsync(sql, [keys[key]]);
			if (!id) {
				let insertSql = `INSERT INTO ${key} VALUES (NULL, ?)`;
				yield this.db.queryAsync(insertSql, [keys[key]]);
				id = yield this.db.valueQueryAsync(sql, [keys[key]]);
			}
			kc[keys[key]] = id;
		}
	}
});

AbbrevsFilter.prototype._getStringID = Zotero.Promise.coroutine(function* (str, forceID) {
	var strID;
	let me = this;
	var sql = "SELECT stringID FROM strings WHERE string=?";
	strID = yield this.db.valueQueryAsync(sql, [str]);
	if (!strID && forceID) {
		sql = "INSERT INTO strings VALUES (NULL, ?)";
		yield this.db.queryAsync(sql, [str]);
		sql = "SELECT stringID FROM strings WHERE string=?";
		strID = yield this.db.valueQueryAsync(sql, str);
	}
	return strID;
});

AbbrevsFilter.prototype.setCachedAbbrevList = Zotero.Promise.coroutine(function* (styleID) {
	var cachedAbbreviations = {};
	// Load style abbreviations, if any, to cache
	var sql = "SELECT jurisdiction,category,RV.string AS rawval, ABBR.string AS abbr "
		+ "FROM abbreviations A "
		+ "JOIN list USING(listID) "
		+ "JOIN jurisdiction USING(jurisdictionID) "
		+ "JOIN category USING(categoryID) "
		+ "JOIN strings RV ON rawID=RV.stringID "
		+ "JOIN strings ABBR ON abbrID=ABBR.stringID "
		+ "WHERE list=?"
	var res = yield this.db.queryAsync(sql, [styleID]);
	if (res) {
		for (let i=0,ilen=res.length;i<ilen;i++) {
			let row = res[i];
			if (!cachedAbbreviations[row.jurisdiction]) {
				cachedAbbreviations[row.jurisdiction] = {};
			}
			if (!cachedAbbreviations[row.jurisdiction][row.category]) {
				cachedAbbreviations[row.jurisdiction][row.category] = {};
			}
			if (!cachedAbbreviations[row.jurisdiction][row.category][row.rawval]) {
				cachedAbbreviations[row.jurisdiction][row.category][row.rawval] = row.abbr;
			}
		}
	}
	this.cachedAbbreviations = cachedAbbreviations;
});
