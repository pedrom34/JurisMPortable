const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

/*
 * Function to pick up Zotero and tinker with it.
 */

var Zotero;
var AbbrevsFilter;
var AbbrevsFilterFactory;
var AbbrevsService;

// Preferences
// From https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless
function getGenericPref(branch,prefName)
{
	switch (branch.getPrefType(prefName))
	{
    default:
    case 0:   return undefined;                      // PREF_INVALID
    case 32:  return getCharPref(prefName);  // PREF_STRING
    case 64:  return branch.getIntPref(prefName);    // PREF_INT
    case 128: return branch.getBoolPref(prefName);   // PREF_BOOL
	}
}
function setGenericPref(branch,prefName,prefValue)
{
	switch (typeof prefValue)
	{
	case "string":
		branch.setCharPref(prefName,prefValue);
		return;
	case "number":
		branch.setIntPref(prefName,prefValue);
		return;
	case "boolean":
		branch.setBoolPref(prefName,prefValue);
		return;
	}
}
function setDefaultPref(prefName,prefValue)
{
	var defaultBranch = Services.prefs.getDefaultBranch(null);
	setGenericPref(defaultBranch,prefName,prefValue);
}

// [JavaScript Error: "NS_NOINTERFACE: Component returned failure code: 0x80004002 (NS_NOINTERFACE) [nsIPrefBranch.setComplexValue]" {file: "resource://gre/modules/addons/XPIProvider.jsm -> file:///media/storage/src/JM/zotero-standalone-build/staging/Jurism_linux-x86_64/extensions/abbrevs-filter@juris-m.github.io/bootstrap.js" line: 58}]

var initializePlugin = function() {
    Zotero = Components.classes["@zotero.org/Zotero;1"]
	    .getService(Components.interfaces.nsISupports)
	    .wrappedJSObject;
	if (AbbrevsService && AbbrevsFilterFactory) {
		const registrar = Components.manager.QueryInterface(Components.utils.nsIComponentRegistrar);
		registrar.unregisterFactory(AbbrevsService.prototype.classID,
									AbbrevsFilterFactory);
	}
	// Set up preferences
	Services.scriptloader.loadSubScript("chrome://abbrevs-filter/content/defaultprefs.js",
										{pref:setDefaultPref} );
	// Empty context for build
	var buildContext = {
		Zotero: Zotero
	};
	// Build and instantiate the component
	var xpcomFiles = [
		"component",
		"utils",
		"save",
		"cache",
		"getabbrev",
		"initializers",
		"attachers",
		"import",
		"export"
	];
	for (var i=0, ilen=xpcomFiles.length; i < ilen; i += 1) {
		Services.scriptloader.loadSubScript("chrome://abbrevs-filter/content/xpcom/" + xpcomFiles[i] + ".js", buildContext);
	}
	AbbrevsService = function () {
		this.wrappedJSObject = new buildContext.AbbrevsFilter();
	};
	// Define the service
	AbbrevsService.prototype = {
		classDescription: 'Juris-M Abbreviation Filter',
		contractID: '@juris-m.github.io/abbrevs-filter;1',
		classID: Components.ID("{e2731ad0-8426-11e0-9d78-0800200c5798}"),
		service: true,
		QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsISupports])
	}
	// Plugin factory
	AbbrevsFilterFactory = Object.freeze({
		createInstance: function(aOuter, aIID) {
			if (aOuter) { throw Components.results.NS_ERROR_NO_AGGREGATION; }
			return new AbbrevsService();
		},
		loadFactory: function (aLock) { /* unused */ },
		QueryInterface: XPCOMUtils.generateQI([Components.utils.nsIFactory])
	});
	const registrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
	registrar.registerFactory(AbbrevsService.prototype.classID,
							  AbbrevsService.prototype.classDescription,
							  AbbrevsService.prototype.contractID,
							  AbbrevsFilterFactory);

	AbbrevsFilter = Components.classes['@juris-m.github.io/abbrevs-filter;1'].getService(Components.interfaces.nsISupports).wrappedJSObject;
	AbbrevsFilter.initComponent(Zotero);
}.bind(this);

function domListener (event) {
	var doc = event.target;
	if (doc.getElementById("abbrevs-button")) return;
	
	// To be executed when opening CSL Editor or one of the integration plugins
	if (doc.getElementById('abbrevs-button')) return;

	if (doc.getElementById('automaticJournalAbbreviations-checkbox')) {
		var checkboxElem = doc.getElementById('automaticJournalAbbreviations-checkbox');
		checkboxElem.setAttribute('label', 'Abbreviation Filter installed (overrides Medline abbrevs)');
		checkboxElem.disabled = true;
		var description = checkboxElem.nextSibling
		description.innerHTML = 'To use the default Medline abbreviations, disable the Abbreviation Filter and restart Zotero.';
		return;
	} else if (doc.documentElement.getAttribute('id') === 'csl-edit') {

		Zotero = Components.classes["@zotero.org/Zotero;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;
		
		var AbbrevsFilter = Components.classes['@juris-m.github.io/abbrevs-filter;1'].getService(Components.interfaces.nsISupports).wrappedJSObject;
		AbbrevsFilter.initWindow(doc.defaultView, doc);
		
		var hasEngine = false;
		
		var refresh = doc.getElementById("preview-refresh-button");
		var cslmenu = doc.getElementById("zotero-csl-list");
		var csleditor = doc.getElementById("zotero-csl-editor");

		var button = doc.createElement("button");
		button.setAttribute("label", "Abbrevs.");
		button.setAttribute("id","abbrevs-button");
		button.setAttribute('disabled','true');
		cslmenu.parentNode.insertBefore(button, null);

		function attachStyleEngine () {
			if (hasEngine) return;
			var button = doc.getElementById('abbrevs-button');
			var items = Zotero.getActiveZoteroPane().getSelectedItems();
			if (items.length > 0) {
				button.removeAttribute('disabled');
				button.addEventListener("command", function() {
					var io = {
						style:csleditor.styleEngine,
						AFZ: AbbrevsFilter
					};
					io.wrappedJSObject = io;
					doc.defaultView.openDialog('chrome://abbrevs-filter/content/dialog.xul', 'AbbrevsFilterDialog', 'chrome,centerscreen,alwaysRaised,modal',io);
				}, false);
				hasEngine = true;
			}
		}
		attachStyleEngine();
		cslmenu.addEventListener("command", attachStyleEngine, false);
		refresh.addEventListener("command", attachStyleEngine, false);
		button.addEventListener("command", attachStyleEngine, false);
	} else if (doc.getElementById("zotero-add-citation-dialog") || doc.getElementById("quick-format-search")) {

		var stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
			.getService(Components.interfaces.nsIStringBundleService)
			.createBundle("chrome://abbrevs-filter/locale/overlay.properties")

		var AbbrevsFilter = Components.classes['@juris-m.github.io/abbrevs-filter;1'].getService(Components.interfaces.nsISupports).wrappedJSObject;
		AbbrevsFilter.initWindow(doc.defaultView, doc);

		var io = doc.defaultView.arguments[0].wrappedJSObject;

		io = {
			style:io.style,
			AFZ: AbbrevsFilter
		}
		io.wrappedJSObject = io;

		function processorIsLoaded() {
			if (io.wrappedJSObject.style.registry.citationreg.citationByIndex.length) {
				return true;
			} else {
				return false;
			}
		}

		function abbrevsPopup() {
			doc.defaultView.openDialog('chrome://abbrevs-filter/content/dialog.xul', 
									   'AbbrevsFilterDialog', 
									   'chrome,centerscreen,alwaysRaised,modal',
									   io);
		}
		
		function makeButtonBox() {
			var bx = doc.createElement("hbox");
			var button = doc.createElement("button");
			button.setAttribute("type", "button");
			button.setAttribute("label", "Abbrevs.");
			//button.setAttribute("image", "chrome://zotero/skin/abbrevs-button.png");
			button.setAttribute("margin", "0 0 0 0");
			button.setAttribute("padding", "0 0 0 0");
			button.setAttribute("id", "abbrevs-button");
			button.addEventListener("command", abbrevsPopup);
			button.setAttribute("disabled", "true");
			bx.appendChild(button);
			return bx;
		}

		function attachButton() {
			var dialog = doc.getElementById("zotero-add-citation-dialog");
			if (dialog) {
				var vbox = doc.getElementById("zotero-select-items-container");
				var bx = makeButtonBox();
				dialog.insertBefore(bx, vbox);
			} else {
				var spinner = doc.getElementById("quick-format-spinner");
				var bx = makeButtonBox();
				bx.setAttribute("style", "margin-top: -3px;height: 18px;");
				spinner.parentNode.insertBefore(bx, null);
			}
			if (processorIsLoaded()) {
				var button = doc.getElementById("abbrevs-button");
				button.removeAttribute("disabled");
			}
		}
		attachButton();
	}
	event.target.removeEventListener(event.type, arguments.callee);
}

var startupObserver = {
	observe: function(subject, topic, data) {
		initializePlugin();
	},
	register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "final-ui-startup", false);
	},
	unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "final-ui-startup");
	}
}

var popupObserver = {
	observe: function(subject, topic, data) {
		var target = subject.QueryInterface(Components.interfaces.nsIDOMWindow);
		target.addEventListener("DOMContentLoaded", domListener, false);
	},
	register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "chrome-document-global-created", false);
	},
	unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "chrome-document-global-created");
	}
}

/*
 * Bootstrap functions
 */

function startup (data, reason) {
	startupObserver.register();
	popupObserver.register();
};

function shutdown (data, reason) {
	if (AbbrevsFilter.db) {
		AbbrevsFilter.db.closeDatabase(true);
	}
}

function install (data, reason) {}

function uninstall (data, reason) {}
