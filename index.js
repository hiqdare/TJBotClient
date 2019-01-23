"use strict"; 

var os = require('os');
var hardware = ['servo'];
var tjConfig = {
	log: { 
		level: 'verbose'
	}
}

const shell = require('shelljs');

var interfaces = os.networkInterfaces();

var tjdata = {};
var networkKey = 'network';
tjdata[networkKey] = [];

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
	var TJBOT = require('tjbot');
	var tj = new TJBOT(hardware, tjConfig, {});
	tj.wave();

	socket.on('event', function(data){
		param = JSON.parse(data);
		if(param.action == 'wave') {
			tj.wave();
		}
	
	});
} else {
	tjdata.cpuinfo.Serial = "test-serial-1234";
}

var url = getURL();
console.log("Connecting to " + url);

var socket = require('socket.io-client')(url);
socket.on('start', function(data){
	console.log("connected to " + url);
	console.log(data);
	socket.emit('checkin', JSON.stringify(tjdata));
});
socket.on('disconnect', function(){
	console.log('Socket disconnected');
});

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
});

function getURL() {
	var argv = process.argv;

	if (argv.length < 3) {
		return 'https://tjbotbrowser.eu-de.mybluemix.net';
	} else {
		return "http://" + argv[2] + ':3000';
	}
	
	//return 'http://192.168.1.104:3000';
}
