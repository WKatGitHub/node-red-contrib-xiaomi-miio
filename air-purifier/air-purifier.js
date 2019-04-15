const miio = require('./../common/devices.js');

function isSet(value) {
    return typeof value !== 'undefined' && value !== null;
}

module.exports = function(RED) {

    function miioAirPurifier(config) {
        console.log('----> Init Air Purifier! ');
        
        RED.nodes.createNode(this, config);
        var _node = this;

        // default automation configuration
        var automation = false;
        var autocfg = {
            pauseTime: 30, // 30 min.
            swPointDelta: 0, // additional switching hysteresis
            swOnPoint: 25, // hysteresis
            swPoints: [ // All points has condition: ">".
                {value: 0, mode: 'idle'},
                {value: 11, mode: 'favorite', fanSpeed: 1}, 
                {value: 25, mode: 'favorite', fanSpeed: 2},
                {value: 50, mode: 'favorite', fanSpeed: 3},
                {value: 75, mode: 'favorite', fanSpeed: 4},
                {value: 100, mode: 'favorite', fanSpeed: 5},
                {value: 125, mode: 'favorite', fanSpeed: 6},
                {value: 150, mode: 'favorite', fanSpeed: 7},
                {value: 175, mode: 'favorite', fanSpeed: 8},
                {value: 200, mode: 'favorite', fanSpeed: 9},
                {value: 225, mode: 'favorite', fanSpeed: 10},
                {value: 250, mode: 'favorite', fanSpeed: 11},
                {value: 275, mode: 'favorite', fanSpeed: 12},
                {value: 300, mode: 'favorite', fanSpeed: 13},
                {value: 325, mode: 'favorite', fanSpeed: 14},
                {value: 350, mode: 'favorite', fanSpeed: 15},
                {value: 375, mode: 'favorite', fanSpeed: 16},
                {value: 400, mode: 'auto'}
            ]
        }
        var swUpPoint = autocfg.swOnPoint;
        var swDownPoint = autocfg.swPoints[1].value;
        var swMode = 'initial';
        var swFanSpeed = undefined;
        var pauseTimer = null;
        var pauseStartTime = 0; 
        var swTime = 0;

        // hook device events
        var deviceId = config.deviceId;
        
        if (deviceId) {
            _node.on('input', function(msg) {
                if (!_node._enabled) {
                    return;
                }
                var payload = msg.payload;
                var device = miio.devices[deviceId]; // in device fail it will constatntly repeat this same value !!!
                if (device) {
                    if(payload.deviceName === undefined || payload.deviceName === _node.name){
                        if (isSet(payload.aqi) && (automation === true)) {
                            let swDeltaTime = Date.now() - swTime;
                            if(swDeltaTime > 1000){ // 1000ms time required to update device.properties after sending command
                                // Check if there was any manual switching. If yes, pause automation mode, for time = pauseTime.
                                if (swMode !== device.properties.mode || (swFanSpeed !== device.properties.favoriteLevel && swFanSpeed !== undefined)){   
                                    if (swMode !== 'initial'){ // start pause timer
                                        swUpPoint = 0; // update swUpPoint & swDownPoint after pause time ends
                                        pauseStartTime = Date.now(); // pause automation mode
                                        if(pauseTimer !== null){
                                            clearTimeout(pauseTimer);
                                        }
                                        let pauseTime = autocfg.pauseTime * 60000; // convert minutes to ms.
                                        pauseTimer = setTimeout(function(){pauseStartTime = 0;}, pauseTime);  
                                    }
                                    swMode = device.properties.mode;
                                    swFanSpeed = device.properties.favoriteLevel;
                                }
                            }
                            if(pauseStartTime === 0){
                                let aqi = msg.payload.aqi;  
                                if(aqi === 'internalSensor'){
                                    aqi = device.properties.aqi; 
                                }
                                if ((aqi < swDownPoint)||(aqi > swUpPoint)){       
                                    let maxIndex = autocfg.swPoints.length -1;
                                    for(let i = maxIndex; i > -1; i--){
                                        let swPoint = autocfg.swPoints[i];
                                        if(aqi > swPoint.value){
                                            swMode = swPoint.mode;
                                            swFanSpeed= swPoint.fanSpeed;
                                            msg.payload.mode = swMode;
                                            msg.payload.favoriteLevel = swFanSpeed;
                                            swDownPoint = swPoint.value - autocfg.swPointDelta;
                                            switch (i) {
                                                case 0:{
                                                    swUpPoint = autocfg.swOnPoint;  
                                                } 
                                                break;
                                                case maxIndex:{
                                                    swUpPoint = 1000;
                                                } 
                                                break;
                                                default:{
                                                    swUpPoint = autocfg.swPoints[i+1].value + autocfg.swPointDelta;
                                                }
                                            }
                                            i = -1;
                                            swTime = Date.now();
                                        }
                                    }
                                }
                            }
                        }
                        if (isSet(payload.automation)) {
                            automation = payload.automation; // updete automation status
                            if(pauseStartTime !== 0){ // turn off automation pause;
                                clearTimeout(pauseTimer);
                                pauseStartTime = 0;
                            }
                        }
                        if (isSet(payload.autocfg)) {
                            if(payload.autocfg !== autocfg){
                                autocfg = payload.autocfg; // save new automation config.
                                swUpPoint = 0; // update swUpPoint & swDownPoint at next payload.aqi event
                            }
                        }
                        if (isSet(payload.mode)) {
                            if (payload.mode !== device.properties.mode){
                                device.setMode(payload.mode);
                            }
                        }
                        if (isSet(payload.favoriteLevel)) {
                            if (payload.favoriteLevel !== device.properties.favoriteLevel){
                                device.setFavoriteLevel(payload.favoriteLevel);
                            }
                        } 
                        if (isSet(payload.ledBrightness)) {
                            if(payload.ledBrightness !== device.properties.ledBrightness){
                                device.ledBrightness(payload.ledBrightness);
                            }
                        }
                        if (isSet(payload.buzzer)) {
                            if(payload.buzzer !== device.properties.buzzer){
                                device.setBuzzer(payload.buzzer);
                            }
                        }
                        if (isSet(payload.learnMode)) {
                            if(payload.learnMode !== device.properties.learnMode){
                                device.setLearnMode(payload.learnMode);
                            }
                        }
                        if (isSet(payload.childLock)) {
                            if(payload.childLock !== device.properties.childLock){
                                device.setChildLock(payload.childLock);
                            }
                        }  
                        if (isSet(payload.turboMode)) {
                            if(payload.turboMode !== device.properties.turboMode){
                                device.setTurboMode(payload.turboMode);
                            }
                        }
                        if (isSet(payload.status)) { 
                            if (payload.status === 'properties') { 
                                msg.payload = device.properties;
                                if(pauseStartTime !== 0){
                                    let pauseTime = autocfg.pauseTime * 60000; // convert minutes to ms.
                                    let pauseTimeCounter = Math.ceil(((pauseStartTime + pauseTime) - Date.now())/60000);
                                    msg.payload.automation = 'paused for '+ pauseTimeCounter + 'm';
                                } else {
                                    msg.payload.automation = automation;
                                } 
                                msg.payload.deviceName = _node.name ? _node.name : 'AirP';   
                            } else if(payload.status ==='autocfg'){ // send actual configuration of automation
                                msg.payload = {};
                                msg.payload.autocfg = autocfg;
                                msg.payload.deviceName = _node.name ? _node.name : 'AirP';
                            }
                            _node.send(msg);
                        }
                    }
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
    RED.nodes.registerType("miio-air-purifier", miioAirPurifier, {
        settings: {
            miioAirPurifierDevices: {
                value: miio.optionDevices,
                exportable: true
            }
        }
    });
}