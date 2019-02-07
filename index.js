/**
 *	index.js
 */

/*----------------------------------------------------------------------------*/
/* IMPORTS                                                                    */
/*----------------------------------------------------------------------------*/

var os = require('os');
const shell = require('shelljs');
var TJBOT = require('tjbot');

/*----------------------------------------------------------------------------*/
/* DECLARATION AND INITIALIZATION                                             */
/*----------------------------------------------------------------------------*/

var hardware = ['servo'];
var tjConfig = {
	log: {
		level: 'verbose'
	}
}
let tjCredentials = {};

var tj;

let vcapServices = null;

var interfaces = os.networkInterfaces();

var tjdata = {};
var networkKey = 'network';
tjdata[networkKey] = [];


/*----------------------------------------------------------------------------*/
/* MAIN 						                                              */
/*----------------------------------------------------------------------------*/

Object.keys(interfaces).forEach(function(interfaceName) {
	var alias = 0;
	interfaces[interfaceName].forEach(function(iface) {
		if ('IPv4' !== iface.family || iface.internal !== false) {
			return;
		}

		if (alias >=  1) {
			tjdata[networkKey].push(interfaceName + ':' + alias, iface.address);
		} else {
			tjdata[networkKey].push(interfaceName, iface.address);
		}
		++alias;
	});
});

tjdata.os_type = os.type();
tjdata.firmware = os.release();
tjdata.os_platform = os.platform();
tjdata.nodejs_version = process.version;
tjdata.npm_version = {};
tjdata.npm_package = {};
tjdata.cpuinfo = {};
var npm_version = shell.exec('npm version').replace(/[\'{}]/g, "").split(",");
var npm_package = shell.exec('npm list').replace(/[\-└┬─├│]/g, "").split(/\r?\n/);
npm_version.forEach(function(element) {
	 var entry = element.split(":");
	 if (entry.length == 2) {
		tjdata.npm_version[entry[0].trim()] = entry[1].trim();
	 }
});

npm_package.forEach(function(part) {
	var entry = part.split("@");
	if (entry.length == 2) {
		tjdata.npm_package[entry[0].trim()] = entry[1].trim();
	}
});

if (tjdata.os_platform == 'linux') {
	tjdata.os_info = shell.exec('cat /etc/os-release').split(" ");
	tjdata.os_info.forEach(function(part, index) {
		tjdata.os_info[index] = part.split("=");
	});
	tjdata.hostname = shell.exec('cat /etc/hostname');
	var cpuinfo = shell.exec('cat /proc/cpuinfo').split(/\r?\n/);
	cpuinfo.forEach(function(element) {
		var entry = element.split(":");
		if (entry.length == 2) {
			tjdata.cpuinfo[entry[0].trim()] = entry[1].trim();
		}
	})

} else {
	tjdata.cpuinfo.Serial = "test-serial-1234";
}

var url = getURL();
console.log("Connecting to " + url);

if (tjdata.os_platform == 'linux') {
	tj = new TJBOT(hardware, tjConfig, {});
}

var socket = require('socket.io-client')(url);
socket.on('start', function(data){
	console.log("connected to " + url);
	console.log(data);
	socket.emit('checkin', JSON.stringify(tjdata));
});

socket.on('vcapServices', function(data) {
	vcapServices = data;
});

socket.on('event', function(data){
	var param = JSON.parse(data);
	console.log(param.target + " " + param.event);
	switch(param.target) {
		case 'arm':
			if (param.event == 'wave') {
				if (tj != null) {
					tj.wave();
				} else {
					console.log("I am waving");
				}
			}
			break;
		case 'led':
			if (param.event == 'on') {
				tj.shine("red")
			}
			break;
		case 'source':
			shell.exec('git pull');
			break;
		case 'nodejs':
			shell.exec('npm cache clean -f');
			shell.exec('npm install -g n');
			shell.exec('n stable');
			break;
		case 'npm':
			shell.exec('npm update -g');
			break;
		case 'text_to_speech':
			tjConfig.speak = {};
			tjConfig.speak.voice = param.config.value;

			if (!hardware.includes('speaker')) {
				hardware.push('speaker');
			}

			initializeTJ(param.target);
			break;
	}
});

/*
socket.on('update', function(data){
	if (data == 'source') {
		shell.exec('git pull');
	} else if (data == 'nodejs') {
		shell.exec('npm cache clean -f');
		shell.exec('npm install -g n');
		shell.exec('n stable');
	} else if (data == 'npm') {
		shell.exec('npm update -g');
	}
});*/

function initializeTJ(service) {
	if (!service) {
		console.log("err");
	}

	if (!vcapServices.services[service]) {
		console.log("err");
	}

	if (!tjCredentials[service]) {
		tjCredentials[service] = {};

		if (!tjCredentials[service].apikey || !tjCredentials[service].url) {
			tjCredentials[service].apikey = vcapServices.services[service][0].credentials.apikey;
			tjCredentials[service].url = vcapServices.services[service][0].credentials.url;
		}
	}

	tj = new TJBOT(hardware, tjConfig, tjCredentials);
}

function getURL() {
	var argv = process.argv;

	if (argv.length < 3) {
		return 'https://tjbotbrowser.eu-de.mybluemix.net';
	} else {
		return "http://" + argv[2] + ':3000';
	}
	//return 'http://192.168.1.104:3000';
}

/*----------------------------------------------------------------------------*/
/* EXPORTS                                                                    */
/*----------------------------------------------------------------------------*/
