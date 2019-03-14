/**
 *	index.js
 */

/*----------------------------------------------------------------------------*/
/* IMPORTS                                                                    */
/*----------------------------------------------------------------------------*/

const TJBotInfo = require('./classes/TJBotInfo.js');
const shell = require('shelljs');

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

tj = new TJBotInfo();

shell.exec('npm list -g --depth 1', {silent:true}, function(code, stdout, stderr) {
	console.log("NPM Package code: " + code);
	if (stderr) {
		console.log(stderr);
	} else {
		tj.setNPMPackage(stdout);
	}
});



let url = getURL();
console.log("Connecting to " + url);
let socket = require('socket.io-client')(url);
// called when connection established
socket.on('start', function(data){
	console.log("connected to " + url + " " + socket.id);
	console.log(data + " " + (new Date()));
	socket.emit('checkin', JSON.stringify(tj.getData()));
});

// called as reply to checkin event with initial config
socket.on('init_config', function(data) {
	let config = JSON.parse(data);
	tj.configureService(config);
	console.log("Config set");
});

// called on browser event
socket.on('event', function(data){
	let param = JSON.parse(data);
	console.log("event:" + param.target);
	tj.handleEvent(param);
});
