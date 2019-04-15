const miio = require('miio');
//const util = require('util');

var allDevices = {
    instance: Math.random()
};

var optionDevices = [];

var propertyCallbacks = {};
var actionCallbacks = {};
var motionCallbacks = {};

var disableEventListener = true;

const devices = miio.devices({
	cacheTime: 300 // 5 minutes. Default is 1800 seconds (30 minutes)
});

/* ======================================================================================================= */
devices.on('available', reg => {

	const device = reg.device;
	if(!device) {
		console.log(reg.id, 'could not be connected to');
		return;
	}
	
	console.log('Detected device with identifier:', reg.id, ' ip address:', device.handle.api.address, ' model:', device.miioModel);
	
	if(typeof allDevices[reg.id] === 'undefined') {
    	optionDevices.push({
    		id: reg.id,
    		address: device.handle.api.address,
    		model: device.miioModel
    	});
    	
		allDevices[reg.id] = device;
				
		if(device.miioModel.indexOf('airpurifier') !== -1) {
            hookGenericStateAndAction(reg.id, device);
 
		} else if(device.miioModel.indexOf('sensor') !== -1) {
            hookGenericStateAndAction(reg.id, device);
            
		} else if(device.miioModel.indexOf('gateway') !== -1) {
            hookGenericStateAndAction(reg.id, device);
            
		} else if(device.miioModel.indexOf('controller') !== -1) {
            hookGenericStateAndAction(reg.id, device);
            
		} else if(device.miioModel.indexOf('magnet') !== -1) {
            // Fix the issue with miio library
            device.contact().then(contact => device.magnetContact = contact);
            setTimeout(function() {
                disableEventListener = false;
                console.log('Enabled event listeners');
            }, 5000);
            hookGenericStateAndAction(reg.id, device);
            
		} else if(device.miioModel.indexOf('motion') !== -1) {
            hookGenericStateAndAction(reg.id, device);
            
		} else {
			console.log('Skip device:', reg.id, ' ip address:', device.handle.api.address , ' model:' , device.miioModel);
		}	
	} else {
	    console.log('The device has already been initialized.');
	}
});

/* ======================================================================================================= */
devices.on('unavailable', device => {
    // Device is no longer available and is destroyed
    console.log('Device unavailable', device);
});

/* ======================================================================================================= */
function triggerCallback(id, deviceCallbacks, event) {

	var callbacks = deviceCallbacks[id];
	//console.log('event: ', event);
	if(callbacks) {
		for(var i = 0, len = callbacks.length; i < len; i++) {
			var callback = callbacks[i];
			if(typeof callback === "function") {
			    event = (typeof event === 'undefined') ? {} : event;
				callback(event);
			}
		}
	}
}

/* ======================================================================================================= */
function hookGenericStateAndAction(id, device) {
    
    device.on('stateChanged', e => {
        if(disableEventListener) {
            return;
        }
        var event = {
            deviceId: id,
            key: e.key,
            value: e.value,
            model: device.miioModel
        };
    	// Fix the issue with miio library: https://github.com/aholstenson/miio/issues/170
    	if( (device.miioModel.indexOf('magnet') !== -1) && (e.key == 'contact') ) {
    	    device.magnetContact = e.value;
    	}
        triggerCallback(id, propertyCallbacks, event);
    });

    device.on('action', e => {   
        if(disableEventListener) {
            return;
        }  
        var event = {
            deviceId: id,
            action: e.action,
            model: device.miioModel,
            amount: e.data.amount
        };
		triggerCallback(id, actionCallbacks, event);
    });    
}

/* ======================================================================================================= */
function addCallbacks(deviceId, deviceCallbacks, callback) {
	if(!deviceCallbacks[deviceId]) {
		deviceCallbacks[deviceId] = [];
	}
	deviceCallbacks[deviceId].push(callback);	
}

/* ======================================================================================================= */
module.exports = {
	devices: allDevices,
	optionDevices: optionDevices,
    registerPropertyListener: function(deviceId, callback) {
    	addCallbacks(deviceId, propertyCallbacks, callback);
    },
    registerActionListener: function(deviceId, callback) {
    	addCallbacks(deviceId, actionCallbacks, callback);
    },
    registerMotionListener: function(deviceId, callback) {
    	addCallbacks(deviceId, motionCallbacks, callback);
    }
}