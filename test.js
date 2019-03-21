const os = require('os');

let interfaces = os.networkInterfaces();
let networkKeys = {};
for (let interfaceName of Object.keys(interfaces)) {
    let alias = 0;
    console.log(interfaceName);
    for (let iface of interfaces[interfaceName]) {
        if ('IPv4' == iface.family && !iface.internal) {
            if (alias >=  1) {
                networkKeys[interfaceName + ':' + alias] = iface.address;
            } else {
                networkKeys[interfaceName] = iface.address;
            }
            ++alias;
        }
    }
}
console.log(networkKeys);