const miio = require('./../common/devices.js');

module.exports = function(RED) {

    function miioGeneric(config) {
        console.log('----> Init Generic Device! ');
        
        RED.nodes.createNode(this, config);
        var _node = this;

        // hook device events
        var deviceId = config.deviceId;
        if (deviceId) {
            
            _node.on('input',function(msg) {
                var payload = msg.payload;
                
                var device = payload.deviceId ? miio.devices[payload.deviceId] : miio.devices[deviceId];
                
                if (device) {
                    
                    if(device.miioModel.indexOf('magnet') !== -1) {
                        // Fix the issue with miio library: https://github.com/aholstenson/miio/issues/170
                        (async () => {
                            await device.contact();
                            msg.payload = {
                                open: device.magnetContact === false,
                                contact: device.magnetContact
                            } 
                        });  
                    } else {
                        msg.payload = device.properties;
                    }

                    _node.send(msg);

                } else {
                    console.log('No such device with identifier ', deviceId);        
                }
            });
            
        } else {
            console.log('Device identifier not specified.');
        }

        _node._enabled = true;
        
        _node.on('close',function() {
            _node._enabled = false;
        });
        
    }

    RED.nodes.registerType("miio-generic", miioGeneric, {
        settings: {
            miioGenericDevices: {
                value: miio.optionDevices,
                exportable: true
            }
        }
    });
}