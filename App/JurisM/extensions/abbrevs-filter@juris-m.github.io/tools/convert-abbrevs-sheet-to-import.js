#!/usr/bin/node

var fs = require('fs');
var csv = require('csv');

var segment = {
    "container-title": {},
    "collection-title": {},
    "institution-entire": {},
    "institution-part": {},
    nickname: {},
    number: {},
    title: {},
    place: {},
    hereinafter: {},
    classic: {},
    "container-phrase": {},
    "title-phrase": {}
}

var ret = {};
ret["default"] = JSON.parse(JSON.stringify(segment));

csv.parse(fs.readFileSync('courts-and-jurisdictions-all-us.csv'), function(err, data){
	for (var entry of data) {
		if (entry[4]) {
			if (!ret[entry[0]]) {
				ret[entry[0]] = JSON.parse(JSON.stringify(segment));
			}
			ret[entry[0]]["institution-part"][entry[3].toLowerCase()] = entry[4];
		}
	}
	var wrappedret = {
		filename: "courts-and-jurisdictions-all-us.json",
		name: "Abbreviations: standard US court abbreviations",
		xdata: ret
	}
	fs.writeFileSync("courts-and-jurisdictions-all-us.json", JSON.stringify(wrappedret, null, 2));
})
