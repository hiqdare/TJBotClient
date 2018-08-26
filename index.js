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
tjbot.os_type = os.type();
tjbot.os_release = os.release();
tjbot.os_platform = os.platform();
tjbot.nodejs_version = process.version;
tjbot.npm_version = shell.exec('npm version');
tjbot.npm_package = shell.exec('npm list');
tjbot.os_info = shell.exec('cat /etc/os-release');

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
	console.log('a great user connected');
	console.log(data);
	socket.emit('checkin', JSON.stringify(tjbot));
});
socket.on('event', function(data){
	console.log('a great user event');
});
socket.on('disconnect', function(){
	console.log('a great user disconnected');
});

function getURL() {
	return 'http://192.168.1.104:3456';
}
