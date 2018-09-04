"use strict"; 

var os = require('os');

const shell = require('shelljs');

var interfaces = os.networkInterfaces();
var config = require('./tjbot.json');
var tjbot = {};
var networkKey = 'network';
tjbot[networkKey] = [];

Object.keys(interfaces).forEach(function(interfaceName) {
	var alias = 0;
	interfaces[interfaceName].forEach(function(iface) {
		if ('IPv4' !== iface.family || iface.internal !== false) {
			return;
		}
		
		if (alias >=  1) {
			tjbot[networkKey].push(interfaceName + ':' + alias, iface.address);
		} else {
			tjbot[networkKey].push(interfaceName, iface.address);
		}
		++alias;
	});
});

tjbot.name = config.name;
tjbot.image = config.image;
tjbot.chocolate = config.chocolate;
tjbot.os_type = os.type();
tjbot.firmware = os.release();
tjbot.os_platform = os.platform();
tjbot.nodejs_version = process.version;
tjbot.npm_version = {};
var npm_version = shell.exec('npm version').replace(/[\'{}]/g, "").split(",");
npm_version.forEach(function(element) {
	 var entry = element.split(":");
	 if (entry.length == 2) {
		tjbot.npm_version[entry[0].trim()] = entry[1].trim();
	 }
});
tjbot.npm_package = shell.exec('npm list').replace(/[\-└┬─├│]/g, "").split(/\r?\n/);
tjbot.npm_package.forEach(function(part, index) {
	console.log(part.split("@"));
	tjbot.npm_package[index] = part.split("@");
});

if (tjbot.os_platform == 'linux') {
	tjbot.os_info = shell.exec('cat /etc/os-release').split(" ");
	tjbot.os_info.forEach(function(part, index) {
		console.log(part.split("="));
		tjbot.os_info[index] = part.split("=");
	});
	tjbot.hostname = shell.exec('cat /etc/hostname');
	tjbot.cpuinfo = require("fs").readFileSync("/proc/cpuinfo", "utf8");
}

/*var script = exec('npm version', (error, stdout, stderr) => {
	tjbot.npm_version = stdout.split(/\r?\n/);
	tjbot.npm_version_stderr = stderr.split(/\r?\n/);
	if (error != null) {
		tjbot.npm_version_error = error;
	}
});*/

console.log("Opening connection");
	
var socket = require('socket.io-client')(getURL());
socket.on('start', function(data){
	console.log(data);
	socket.emit('checkin', JSON.stringify(tjbot));
});
socket.on('event', function(data){
	console.log('a great user event');
});
socket.on('disconnect', function(){
	console.log('Socket disconnected');
});

socket.on('update', function(data){
	if (data == 'source') {
		shell.exec('git pull');
	} else if (data == 'nodejs') {
		shell.exec('sudo npm cache clean -f');
		shell.exec('sudo npm install -g n');
		shell.exec('sudo n stable');
	} else if (data == 'npm') {
		shell.exec('npm update -g');
	}
});

function getURL() {
	//return 'https://tjbotbrowser.eu-de.mybluemix.net';
	return 'http://127.0.0.1:3456';
	//return 'http://192.168.1.104:3456';
}
