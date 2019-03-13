/**
 *	TJBotInfo.js
 */

/*----------------------------------------------------------------------------*/
/* IMPORTS                                                                    */
/*----------------------------------------------------------------------------*/

const os = require('os');
const shell = require('shelljs');
//let TJBOT = require('tjbot');

/*----------------------------------------------------------------------------*/
/* DECLARATION AND INITIALIZATION                                             */
/*----------------------------------------------------------------------------*/

const hardware = ['servo', 'led', 'microphone', 'speaker'];


/*----------------------------------------------------------------------------*/
/* BotManager					                                              */
/*----------------------------------------------------------------------------*/

class TJBotInfo {
	/**
	 * TJBotInfo
	 *
	 * @constructor
	 */
	constructor() {
		this.tjdata = {};
		this.tjdata.os_type = os.type();
		this.tjdata.os_release = os.release();
		this.tjdata.os_platform = os.platform();
		this.tjdata.nodejs_version = process.version;
		this.tjdata.networkKey = this.getNetworkKeys();
		this.tjdata.firmware = shell.exec('/opt/vc/bin/vcgencmd version', {silent:true}).split(/\r?\n/);
		this.tjdata.npm_version = this.getNPMVersion()
		this.tjdata.npm_package = this.getNPMPackage();
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

	getData() {
		return this.tjdata;
	}

	setConfiguration(config) {
		this.configureService(config);
		this.tj = new TJBOT(hardware, this.config, {});
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
	 * return list from shell command npm list
	 */
	getNPMPackage() {
		let npmPackage = {};
		for (let part of shell.exec('npm list -g --depth 1', {silent:true}).replace(/[\-└┬─├│]/g, "").split(/\r?\n/)) {
			let entry = part.split("@");
			if (entry.length == 2) {
				npmPackage[entry[0].trim()] = entry[1].trim();
			}
		}
		return npmPackage;
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
		//this.tj = new TJBOT(hardware, this.config, this.credentials);
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
				this.tj.shine(param.action)
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
				this.configureService(param.config);
				break;
			case 'microphone':
				if (param.action == "on") {
					if (this.config.listen != null && this.config.listen.language != null ) {
						this.tj.listen(function(msg) {
							socket.emit('listen', msg)
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
					tj.stopListening();
				}
				break;
		}
		
		/**
		 * run shell command and print executed command
		 * @param {string} command
		 */
		function shellexec(command) {
			console.log("exec " + command);
			shell.exec(command);
		}
	}
}


/*----------------------------------------------------------------------------*/
/* EXPORTS                                                                    */
/*----------------------------------------------------------------------------*/

module.exports = TJBotInfo;
