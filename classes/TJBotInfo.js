/**
 *	TJBotInfo.js
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

const hardware = [/*'servo', 'led',*/ 'microphone', 'speaker'];


/*----------------------------------------------------------------------------*/
/* BotManager					                                              */
/*----------------------------------------------------------------------------*/

class TJBotInfo {
	/**
	 * TJBotInfo
	 *
	 * @constructor
	 */
	constructor(callback) {
		this.tjdata = {};
		this.tjdata.os_type = os.type();
		this.tjdata.os_release = os.release();
		this.tjdata.os_platform = os.platform();
		this.tjdata.nodejs_version = process.version;
		this.tjdata.networkKey = this.getNetworkKeys();
		this.tjdata.firmware = shell.exec('/opt/vc/bin/vcgencmd version', {silent:true}).split(/\r?\n/);
		this.tjdata.npm_version = this.getNPMVersion();
		this.credentials = {};
		this.config = {
			log: {
				level: 'verbose'
			}
		};
		if (this.tjdata.os_platform == 'linux') {
			this.tjdata.hostname = shell.cat('/etc/hostname');
			this.tjdata.os_info = this.getOSInfo();
			this.tjdata.cpuinfo = this.getCPUInfo();
		} else {
			this.tjdata.cpuinfo = {};
			this.tjdata.cpuinfo.Serial = "test-serial-1234";
		}
	}
	
	/**
	 * return tjbot information
	 */
	getData() {
		return this.tjdata;
	}

	/**
	 * return list of network keys
	 */
	getNetworkKeys() {
		let interfaces = os.networkInterfaces();
		let networkKeys = [];
		for (let interfaceName of Object.keys(interfaces)) {
			let alias = 0;
			for (let iface of interfaces[interfaceName]) {
				if ('IPv4' !== iface.family || iface.internal !== false) {
					return;
				}
		
				if (alias >=  1) {
					networkKeys.push(interfaceName + ':' + alias, iface.address);
				} else {
					networkKeys.push(interfaceName, iface.address);
				}
				++alias;
			}
		}
		return networkKeys;
	}

	/**
	 * return list from shell command npm version
	 */
	getNPMVersion() {
		let npmVersion = {};
		for (let npm_version of shell.exec('npm version', {silent:true}).replace(/[\'{}]/g, "").split(",")) {
			let entry = npm_version.split(":");
			if (entry.length == 2) {
			npmVersion[entry[0].trim()] = entry[1].trim();
			}
		}
		return npmVersion;
	}

	/**
	 * callback method for shell.exec function
	 * @param stdout call return value
	 */
	setNPMPackage(stdout) {
		this.tjdata.npm_package = {};
		for (let part of stdout.replace(/[\-└┬─├│]/g, "").split(/\r?\n/)) {
			let entry = part.split("@");
			if (entry.length == 2) {
				this.tjdata.npm_package[entry[0].trim()] = entry[1].trim();
			}
		}
	}

	/**
	 * get OS Information
	 */
	getOSInfo() {
		let osInfo = [];
		for (let part of shell.cat('/etc/os-release').split(" ")) {
			osInfo.push(part.split("="));
		}
		return osInfo;
	}

	/**
	 * get CPU Information
	 */
	getCPUInfo() {
		let cpuinfo = {};
		for (let element of shell.cat('/proc/cpuinfo').split(/\r?\n/)) {
			let entry = element.split(":");
			if (entry.length == 2) {
				cpuinfo[entry[0].trim()] = entry[1].trim();
			}
		}
		return cpuinfo;
	}

	/**
	 * configures credentials
	 * for given service
	 * @param {string} service
	 * @param {string} config
	 */
	setCredentials(service, config) {
		if (!service || !config) {
			throw new Error("initialize error, service or config not set");
		}

		if (!this.credentials[service]) {
			this.credentials[service] = {};
		}

		this.credentials[service].apikey = config.iam_apikey;
		this.credentials[service].url = config.url;
	}


	/**
	 * configures watson service
	 * @param {string} configList list of configuration to be set
	 */
	configureService(configList) {
		for (let service of Object.keys(configList)) {
			switch (service) {
				case 'text_to_speech':

					if (!this.config.hasOwnProperty('speak')) {
						this.config.speak = {};
					}
					this.config.speak.voice = configList[service].option;

					if (!hardware.includes('speaker')) {
						hardware.push('speaker');
					}
					break;
				case 'speech_to_text':
			
					if (!this.config.hasOwnProperty('listen')) {
						this.config.listen = {};
					}
					this.config.listen.language = configList[service].option;

					if (!hardware.includes('microphone')) {
						hardware.push('microphone');
					}
					break;
			}

			this.setCredentials(service, configList[service]);
		}

		this.tj = new TJBOT(hardware, this.config, this.credentials);
		console.log("TJBot instance created");
	}



	/**
	 * make bot handle the event
	 * @param {string} param parameters of the event
	 */
	handleEvent(param) {
		switch(param.target) {
			case 'arm':
				if (param.action == 'wave') {
					if (this.tj != null) {
						this.tj.wave();
					} else {
						console.log("I am waving");
					}
				}
				break;
			case 'led':
				if (this.tj != null) {
					this.tj.shine(param.action)
				}
				break;
			case 'source':
				this.shellexec('git pull');
				this.shellexec('npm install');
				break;
			case 'nodejs':
				this.shellexec('npm cache clean -f');
				this.shellexec('npm install -g n');
				this.shellexec('n 9.11.2');
				this.shellexec('rs');
				break;
			case 'npm':
				this.shellexec('npm update -g');
				this.shellexec('rs');
				break;
			case 'nodemon':
				this.shellexec('npm i -g nodemon');
				this.shellexec('rs');
				break;
			case 'firmware':
				this.shellexec('apt-get update');
				this.shellexec('apt-get install --reinstall raspberrypi-bootloader raspberrypi-kernel');
				this.shellexec('rs');
				break;
			case 'service':
				this.configureService(param.config);
				break;
			case 'microphone':
				console.log(param.action);
				if (param.action == "on") {
					console.log("Mic ON");
					if (this.config.listen != null && this.config.listen.language != null ) {
						console.log("Mic listening");
						console.log("config" + this.config);
						console.log("credentials" + this.credentials);
						this.tj.listen(function(msg) {
							console.log("Mic heard " + msg);
							//socket.emit('listen', msg)
							if (this.config.speak != null && this.config.speak.voice != null) {
								this.tj.speak(msg);
							}
						});
					} else if (this.config.listen == null) {
						console.log("listen is null");
					} else if (this.config.listen.language == null) {
						console.log("language is null");
					}
				} else {
					this.tj.stopListening();
				}
				break;
		}
	}
		
	/**
	 * run shell command and print executed command
	 * @param {string} command
	 */
	shellexec(command) {
		console.log("exec " + command);
		shell.exec(command);
	}
}


/*----------------------------------------------------------------------------*/
/* EXPORTS                                                                    */
/*----------------------------------------------------------------------------*/

module.exports = TJBotInfo;
