"use strict";

const options = {
	speed: 1,
	filter: true,
	vsync: false,
	ntviewer: false,
	bg0: false,
	sborder: false,
	soverlay: false,
	vsync: false,
	ntsc: false,
	borders: false
};

const defaults = {};
Object.keys(options).forEach(k => defaults[k] = [typeof(options[k]), options[k]]);

window.location.search.substring(1).split('&').forEach(v => options[v.split('=')[0]] = v.substring(v.indexOf('=') + 1));

for (const option in options) {
	const v = options[option];
	
	if (!defaults[option]) defaults[option] = ['', ''];
	switch(defaults[option][0]) {
		case 'number':
			options[option] = defaults[option][1];
			if (!isNaN(parseFloat(v))) options[option] = parseFloat(v);
			break;
		case 'boolean':
			options[option] = defaults[option][1];
			if (v == 'false') options[option] = false;
			if (v == 'true') options[option] = true;
			break;
	}
	
	const i = document.getElementById(option);
	
	if (i && i.type == 'checkbox') {
		i.checked = options[option];
	}
}