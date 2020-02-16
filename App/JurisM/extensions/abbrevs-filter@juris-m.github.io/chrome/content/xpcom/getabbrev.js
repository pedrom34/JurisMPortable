var Zotero = this.Zotero;
var CSL = Zotero.CiteProc.CSL;
this.citeproc = CSL;

// Install a custom abbreviations handler on the processor.
AbbrevsFilter.prototype.getAbbreviation = function (styleID, obj, jurisdiction, category, key, itemType) {
	var ret = false;
	var jurisdictions = jurisdiction.split(":");
	for (var i=jurisdictions.length;i>0;i--) {
		var jurisdiction = jurisdictions.slice(0, i).join(":");
		if (!obj[jurisdiction]) {
			obj[jurisdiction] = {};
		}
		if (!obj[jurisdiction][category]) {
			obj[jurisdiction][category] = {};
		}
		if (!obj[jurisdiction][category][key]) {
			obj[jurisdiction][category][key] = "";
		} else if (!ret) {
			ret = jurisdiction;
		}
	}

	jurisdiction = "default";
	if (!obj[jurisdiction]) {
		obj[jurisdiction] = {};
	}
	if (!obj[jurisdiction][category]) {
		obj[jurisdiction][category] = {};
	}
	if (!obj[jurisdiction][category][key]) {
		obj[jurisdiction][category][key] = "";
	}
	if (!ret) {
		ret = "default";
	}
	return ret;
}
