/**
 *	index.js
 */

/*----------------------------------------------------------------------------*/
/* IMPORTS                                                                    */
/*----------------------------------------------------------------------------*/

const TJBotInfo = require('./classes/TJBotInfo.js');

/*----------------------------------------------------------------------------*/
/* DECLARATION AND INITIALIZATION                                             */
/*----------------------------------------------------------------------------*/
let tj;

/*----------------------------------------------------------------------------*/
/* PRIVATE FUNCTION				                                              */
/*----------------------------------------------------------------------------*/




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


let url = getURL();
console.log("Connecting to " + url);
let socket = require('socket.io-client')(url);
// called when connection established
socket.on('start', function(data){
	console.log("connected to " + url + " " + socket.id);
	console.log((new Date()) + " " + data);
	tj = new TJBotInfo();
	socket.emit('checkin', JSON.stringify(tj.getData()));
});

// called as reply to checkin event with initial config
socket.on('init_config', function(data) {
	console.log("Config received");
	let config = JSON.parse(data);
	tj.setConfiguration(config);
	console.log("Config set");
});

// called on browser event
socket.on('event', function(data){
	let param = JSON.parse(data);
	console.log("event:" + param.target);
	tj.handleEvent(param);
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
