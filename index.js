/**
 *	index.js
 */

/*----------------------------------------------------------------------------*/
/* IMPORTS                                                                    */
/*----------------------------------------------------------------------------*/

const os = require('os');
const shell = require('shelljs');
let TJBOT = require('tjbot');


/*----------------------------------------------------------------------------*/
/* DECLARATION AND INITIALIZATION                                             */
/*----------------------------------------------------------------------------*/

let hardware = ['servo', 'led'];
let tjConfig = {
	log: {
		level: 'verbose'
	}
}
let tjCredentials = {};

let tj;

let vcapServices = null;

let interfaces = os.networkInterfaces();

let tjdata = {};
let networkKey = 'network';
tjdata[networkKey] = [];

/*----------------------------------------------------------------------------*/
/* PRIVATE FUNCTION				                                              */
/*----------------------------------------------------------------------------*/

/**
 * configures watson service
 * @param {string} service
 * @param {string} config
 */
function configureService(service, config) {
	switch (service) {
		case 'text_to_speech':

			if (!tjConfig.hasOwnProperty('speak')) {
				tjConfig.speak = {};
			}
			tjConfig.speak.voice = config;

			if (!hardware.includes('speaker')) {
				hardware.push('speaker');
			}

			initializeTJ(service);
			break;
	}
}

/**
 * run shell command and print executed command
 * @param {string} command
 */
function shellexec(command) {
	console.log("exec " + command);
	shell.exec(command);
}

/**
 * configures credentials
 * initialize tjbot libary
 * @param {string} service
 * @param {string} config
 */
function initializeTJ(service) {
	if (!service) {
		console.log("err");
	}

	if (!vcapServices[service]) {
		console.log("err");
	}

	if (!tjCredentials[service]) {
		tjCredentials[service] = {};

		if (!tjCredentials[service].apikey || !tjCredentials[service].url) {
			tjCredentials[service].apikey = vcapServices[service][0].credentials.apikey;
			tjCredentials[service].url = vcapServices[service][0].credentials.url;
		}
	}

	tj = new TJBOT(hardware, tjConfig, tjCredentials);
}

/**
 * gets URL from TJBotBrowser
 */
function getURL() {
	let argv = process.argv;

	if (argv.length < 3) {
		return 'https://tjbotbrowser.eu-de.mybluemix.net';
	} else {
		return "http://" + argv[2] + ':3000';
	}
	//return 'http://192.168.1.104:3000';
}

/*----------------------------------------------------------------------------*/
/* MAIN 						                                              */
/*----------------------------------------------------------------------------*/

Object.keys(interfaces).forEach(function(interfaceName) {
	let alias = 0;
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
tjdata.os_release = os.release();
tjdata.os_platform = os.platform();
tjdata.nodejs_version = process.version;
tjdata.npm_version = {};
tjdata.npm_package = {};
tjdata.cpuinfo = {};
tjdata.firmware = shell.exec('/opt/vc/bin/vcgencmd version', {silent:true}).split(/\r?\n/);
let npm_version = shell.exec('npm version', {silent:true}).replace(/[\'{}]/g, "").split(",");
let npm_package = shell.exec('npm list -g --depth 1', {silent:true}).replace(/[\-└┬─├│]/g, "").split(/\r?\n/);
npm_version.forEach(function(element) {
	 let entry = element.split(":");
	 if (entry.length == 2) {
		tjdata.npm_version[entry[0].trim()] = entry[1].trim();
	 }
});

npm_package.forEach(function(part) {
	let entry = part.split("@");
	if (entry.length == 2) {
		tjdata.npm_package[entry[0].trim()] = entry[1].trim();
	}
});

if (tjdata.os_platform == 'linux') {
	tjdata.os_info = shell.cat('/etc/os-release').split(" ");
	tjdata.os_info.forEach(function(part, index) {
		tjdata.os_info[index] = part.split("=");
	});
	tjdata.hostname = shell.cat('/etc/hostname');
	let cpuinfo = shell.cat('/proc/cpuinfo').split(/\r?\n/);
	cpuinfo.forEach(function(element) {
		let entry = element.split(":");
		if (entry.length == 2) {
			tjdata.cpuinfo[entry[0].trim()] = entry[1].trim();
		}
	})

} else {
	tjdata.cpuinfo.Serial = "test-serial-1234";
}

let url = getURL();
console.log("Connecting to " + url);

if (tjdata.os_platform == 'linux') {
	tj = new TJBOT(hardware, tjConfig, {});
}

let socket = require('socket.io-client')(url);
socket.on('start', function(data){
	console.log("connected to " + url);
	console.log(data);
	socket.emit('checkin', JSON.stringify(tjdata));
});

socket.on('vcapServices', function(data) {
	vcapServices = data;
});

socket.on('config', function(data) {
	let param = JSON.parse(data);

	Object.keys(param).forEach(function(service) {
		configureService(service, param[service]);
	});
});

socket.on('event', function(data){
	let param = JSON.parse(data);
	console.log(param.target);
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
			tj.shine(param.event)
			break;
		case 'source':
			shellexec('git pull');
			shellexec('npm install');
			break;
		case 'nodejs':
			shellexec('npm cache clean -f');
			shellexec('npm install -g n');
			shellexec('n 9.11.2');
			shellexec('rs');
			break;
		case 'npm':
			shellexec('npm update -g');
			shellexec('rs');
			break;
		case 'nodemon':
			shellexec('npm i -g nodemon');
			shellexec('rs');
			break;
		case 'firmware':
			shellexec('apt-get update');
			shellexec('apt-get install --reinstall raspberrypi-bootloader raspberrypi-kernel');
			shellexec('rs');
			break;
		case 'service':
			configureService(param.config.service, param.config.value);
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
