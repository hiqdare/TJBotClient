"use strict"; 

var os = require('os');

const shell = require('shelljs');

var str = "processor	: 3 \nmodel name	: ARMv7 Processor rev 4 (v7l)\nBogoMIPS	: 76.80\nFeatures	: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt vfpd32 lpae evtstrm crc32 \nCPU implementer	: 0x41\nCPU architecture: 7\nCPU variant	: 0x0\nCPU part	: 0xd03\nCPU revision	: 4";

var strarr = str.split(/\r?\n/);
var strres = {};
strarr.forEach(function(element) {
	var entry = element.split(":");
	if (entry.length == 2) {
		strres[entry[0].trim()] = entry[1].trim();
	}
});

console.log(strres);

return;

var interfaces = os.networkInterfaces();
//var config = require('./tjbot.json');
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

//tjbot.name = config.name;
//tjbot.image = config.image;
//tjbot.chocolate = config.chocolate;
tjbot.os_type = os.type();
tjbot.firmware = os.release();
tjbot.os_platform = os.platform();
tjbot.nodejs_version = process.version;
tjbot.npm_version = {};
tjbot.npm_package = {};
tjbot.cpuinfo = {};
var npm_version = shell.exec('npm version').replace(/[\'{}]/g, "").split(",");
var npm_package = shell.exec('npm list').replace(/[\-└┬─├│]/g, "").split(/\r?\n/);
npm_version.forEach(function(element) {
	 var entry = element.split(":");
	 if (entry.length == 2) {
		tjbot.npm_version[entry[0].trim()] = entry[1].trim();
	 }
});

npm_package.forEach(function(part, index) {
	//console.log(part.split("@"));
	var entry = part.split("@");
	if (entry.length == 2) {
		tjbot.npm_package[entry[0].trim()] = entry[1].trim();
	}
});

if (tjbot.os_platform == 'linux') {
	tjbot.os_info = shell.exec('cat /etc/os-release').split(" ");
	tjbot.os_info.forEach(function(part, index) {
		//console.log(part.split("="));
		tjbot.os_info[index] = part.split("=");
	});
	tjbot.hostname = shell.exec('cat /etc/hostname');
	var cpuinfo = shell.exec('cat /proc/cpuinfo').split(/\r?\n/);
	cpuinfo.forEach(function(element) {
		var entry = element.split(":");
		if (entry.length == 2) {
			tjbot.cpuinfo[entry[0].trim()] = entry[1].trim();
		}
	})
}

/*var script = exec('npm version', (error, stdout, stderr) => {
	tjbot.npm_version = stdout.split(/\r?\n/);
	tjbot.npm_version_stderr = stderr.split(/\r?\n/);
	if (error != null) {
		tjbot.npm_version_error = error;
	}
});*/

console.log("Connecting to " + getURL());
	
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
		shell.exec('npm cache clean -f');
		shell.exec('npm install -g n');
		shell.exec('n stable');
	} else if (data == 'npm') {
		shell.exec('npm update -g');
	}
});

function getURL() {
	//return 'https://tjbotbrowser.eu-de.mybluemix.net';
	//return 'http://127.0.0.1:3000';
	return 'http://192.168.1.104:3000';
}
