var fs = require('fs');
const miio = require('miio');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
    if (!isConfig(homebridge.user.configPath(), "accessories", "MiHumidifier")) {
        return;
    }

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerAccessory('homebridge-smartmi-humidifier', 'MiHumidifier', MiHumidifier);
}

function isConfig(configFile, type, name) {
    var config = JSON.parse(fs.readFileSync(configFile));
    if ("accessories" === type) {
        var accessories = config.accessories;
        for (var i in accessories) {
            if (accessories[i]['accessory'] === name) {
                return true;
            }
        }
    } else if ("platforms" === type) {
        var platforms = config.platforms;
        for (var i in platforms) {
            if (platforms[i]['platform'] === name) {
                return true;
            }
        }
    } else {
    }

    return false;
}

function MiHumidifier(log, config) {
    if (null == config) {
        return;
    }

    this.log = log;
    this.config = config;

    this.log.info("[MiHumidifierPlatform][INFO]***********************************************************");
    this.log.info("[MiHumidifierPlatform][INFO]          MiHumidifierPlatform v%s by hassbian-ABC 0.0.1");
    this.log.info("[MiHumidifierPlatform][INFO]  GitHub: https://github.com/hassbian-ABC/homebridge-MiHumidifier ");
    this.log.info("[MiHumidifierPlatform][INFO]                                                                  ");
    this.log.info("[MiHumidifierPlatform][INFO]***********************************************************");
    this.log.info("[MiHumidifierPlatform][INFO]start success...");


    var that = this;
    this.device = new miio.Device({
        address: that.config.ip,
        token: that.config.token

    });
}

MiHumidifier.prototype = {
    identify: function (callback) {
        callback();
    },

    getServices: function () {
        var that = this;
        var services = [];

        var infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "SmartMi")
            .setCharacteristic(Characteristic.Model, "Humidifier")
            .setCharacteristic(Characteristic.SerialNumber, this.config.ip);
        services.push(infoService);

        var humidifierService = new Service.HumidifierDehumidifier(this.name);

        // Required Characteristics
        var currentHumidityCharacteristic = humidifierService.getCharacteristic(Characteristic.CurrentRelativeHumidity);
        var currentHumidifierDehumidifierStateCharacteristic = humidifierService.getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState);
        currentHumidifierDehumidifierStateCharacteristic.setProps({
            /*
            Characteristic.CurrentHumidifierDehumidifierState.INACTIVE = 0;
            Characteristic.CurrentHumidifierDehumidifierState.IDLE = 1;
            Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING = 2;
            Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING = 3;
            */
            validValues: [0, 2]
        });
        var targetHumidifierDehumidifierStateCharacteristic = humidifierService.getCharacteristic(Characteristic.TargetHumidifierDehumidifierState);
        targetHumidifierDehumidifierStateCharacteristic.setProps({
            /*
            Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER = 0;
            Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER = 1;
            Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER = 2;
            */
            validValues: [1]
        });
        var activeCharacteristic = humidifierService.getCharacteristic(Characteristic.Active);

        // Optional Characteristics
        var lockPhysicalControlsCharacteristic = humidifierService.addCharacteristic(Characteristic.LockPhysicalControls);
        var waterLevelCharacteristic = humidifierService.getCharacteristic(Characteristic.WaterLevel);
        var rotationSpeedCharacteristic = humidifierService.getCharacteristic(Characteristic.RotationSpeed);
        rotationSpeedCharacteristic.setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 25,
        });
        var relativeHumidityHumidifierThresholdCharacteristic = humidifierService.addCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold);
        relativeHumidityHumidifierThresholdCharacteristic.setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 10, 
        });


        activeCharacteristic // power on or off
            .on('get', function (callback) {
                that.log.debug("activeCharacteristic get");

                that.device.call("get_prop", ["power"]).then(result => {
                    that.log.debug("\tactiveCharacteristic get Result: " + result);
                    callback(null, result[0] === "on" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
                }).catch(function (err) {
                    that.log.error("\tactiveCharacteristic get Error: " + err);
                    callback(err);
                });
            }.bind(this))
            .on('set', function (value, callback) {
                that.log.debug("activeCharacteristic set: " + value);

                that.device.call("set_power", [value ? "on" : "off"]).then(result => {
                    that.log.debug("\tactiveCharacteristic set Result: " + result);
                    if (result[0] === "ok") {
                        callback(null);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function (err) {
                    that.log.error("\ttactiveCharacteristic set Error: " + err);
                    callback(err);
                });
            }.bind(this));


        currentHumidifierDehumidifierStateCharacteristic // humidifiing or inactive
            .on('get', function (callback) {
                that.log.debug("currentHumidifierDehumidifierStateCharacteristic get");

                that.device.call("get_prop", ["power"]).then(result => {
                    that.log.debug("\tcurrentHumidifierDehumidifierStateCharacteristic get Result: " + result);
                    callback(null, result[0] === "on" ? Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE);
                }).catch(function (err) {
                    that.log.debug("\tcurrentHumidifierDehumidifierStateCharacteristic get Error: " + err);
                    callback(err);
                });
            }.bind(this));


        targetHumidifierDehumidifierStateCharacteristic.setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);


        currentHumidityCharacteristic // humidity
            .on('get', function (callback) {
                that.log.debug("currentHumidityCharacteristic get");

                that.device.call("get_prop", ["humidity"]).then(result => {
                    that.log.debug("\tcurrentHumidityCharacteristic get Result: " + result);
                    callback(null, result[0]);
                }).catch(function (err) {
                    that.log.debug("\tcurrentHumidityCharacteristic get Error: " + err);
                    callback(err);
                });
            }.bind(this));


        waterLevelCharacteristic // water level
            .on('get', function (callback) {
                that.log.debug("waterLevelCharacteristic get");

                that.device.call("get_prop", ["depth"]).then(result => {
                    that.log.debug("\twaterLevelCharacteristic waterLevelCharacteristic get Result: " + result);
                    callback(null, result[0]);
                }).catch(function (err) {
                    that.log.debug("\twaterLevelCharacteristic waterLevelCharacteristic get Error: " + err);
                    callback(err);
                });
            }.bind(this));


        lockPhysicalControlsCharacteristic // lock physical controls
            .on('get', function (callback) {
                that.log.debug("lockPhysicalControlsCharacteristic get");

                that.device.call("get_prop", ["child_lock"]).then(result => {
                    that.log.debug("\tlockPhysicalControlsCharacteristic get Result: " + result);
                    callback(null, result[0] === "on" ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
                }).catch(function (err) {
                    that.log.debug("\tlockPhysicalControlsCharacteristic get Error: " + err);
                    callback(err);
                });
            }.bind(this))
            .on('set', function (value, callback) {
                that.log.debug("lockPhysicalControlsCharacteristic set: " + value);

                that.device.call("set_child_lock", [value ? "on" : "off"]).then(result => {
                    if (result[0] === "ok") {
                        callback(null);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function (err) {
                    that.log.debug("\tlockPhysicalControlsCharacteristic set Error: " + err);
                    callback(err);
                });
            }.bind(this));


        rotationSpeedCharacteristic // fan speed or mode
            .on('get', function (callback) {
                that.log.debug("rotationSpeedCharacteristic get");

                that.device.call('get_prop', ['mode']).then(result => {
                    that.log.debug("\trotationSpeedCharacteristic get Result: " + result);
                    if (result[0] === "auto") {
                        callback(null, 25);
                    } else if (result[0] === "silent") {
                        callback(null, 50);
                    } else if (result[0] === "medium") {
                        callback(null, 75);
                    } else if (result[0] === "high") {
                        callback(null, 100);
                    } else {
                        callback(null, 0);
                    }
                }).catch(function (err) {
                    that.log.debug("\trotationSpeedCharacteristic get Error: " + err);
                    callback(err);
                });
            }.bind(this))
            .on('set', function (value, callback) {
                that.log.debug("rotationSpeedCharacteristic set: " + value);

                that.log.debug("\trotationSpeedCharacteristic set Value: " + value);
                if (value == 25) {
                    that.device.call("set_mode", ["auto"]).then(result => {
                        if (result[0] === "ok") {
                            callback(null);
                        } else {
                            callback(new Error(result[0]));
                        }
                    }).catch(function (err) {
                        that.log.debug("\trotationSpeedCharacteristic set Error: " + err);
                        callback(err);
                    });
                } else if (value == 50) {
                    that.device.call("set_mode", ["silent"]).then(result => {
                        if (result[0] === "ok") {
                            callback(null);
                        } else {
                            callback(new Error(result[0]));
                        }
                    }).catch(function (err) {
                        that.log.debug("\trotationSpeedCharacteristic set Error: " + err);
                        callback(err);
                    });
                } else if (value == 75) {
                    that.device.call("set_mode", ["medium"]).then(result => {
                        if (result[0] === "ok") {
                            callback(null);
                        } else {
                            callback(new Error(result[0]));
                        }
                    }).catch(function (err) {
                        that.log.debug("\trotationSpeedCharacteristic set Error: " + err);
                        callback(err);
                    });
                } else if (value == 100) {
                    that.device.call("set_mode", ["high"]).then(result => {
                        if (result[0] === "ok") {
                            callback(null);
                        } else {
                            callback(new Error(result[0]));
                        }
                    }).catch(function (err) {
                        that.log.debug("\trotationSpeedCharacteristic set Error: " + err);
                        callback(err);
                    });
                } else if (value == 0) {
                    that.device.call("set_power", ["off"]).then(result => {
                        if (result[0] === "ok") {
                            callback(null);
                        } else {
                            callback(new Error(result[0]));
                        }
                    }).catch(function (err) {
                        that.log.debug("\trotationSpeedCharacteristic set Error: " + err);
                        callback(err);
                    });
                }
            }.bind(this));


        relativeHumidityHumidifierThresholdCharacteristic // TODO how to invoke this func
            .on('get', function (callback) {
                that.log.debug("relativeHumidityHumidifierThresholdCharacteristic get");

                that.device.call("get_prop", ["limit_hum"]).then(result => {
                    that.log.debug("\trelativeHumidityHumidifierThresholdCharacteristic get Result: " + result);
                    callback(null, result[0]);
                }).catch(function (err) {
                    that.log.debug("getHumidity Error: " + err);
                    callback(err);
                });
            }.bind(this))
            .on('set', function (value, callback) {
                that.log.debug("\trelativeHumidityHumidifierThresholdCharacteristic set Value: " + value + " ***!!!***");

                if (value > 0 && value <= 40) {
                    value = 40;
                } else if (value > 80 && value <= 100) {
                    value = 80;
                }
                that.log.debug("trelativeHumidityHumidifierThresholdCharacteristic value: " + value);
                that.device.call("set_limit_hum", [value]).then(result => {
                    that.log.debug("\t\trelativeHumidityHumidifierThresholdCharacteristic set_limit_hum Result: " + result);
                    if (result[0] === "ok") {
                        that.log.debug("\t\t\tresult[0] === 'ok'");
                        // power on if set humidifier threshold > current humidity
                        // if (value > currentHumidityCharacteristic.value) {
                        //     that.log.debug("\t\t\t\tvalue > currentHumidityCharacteristic.value");
                        //     that.device.call("set_power", ["on"]).then(result => {
                        //         if (result[0] === "ok") {
                        //             that.log.debug("\t\t\t\trelativeHumidityHumidifierThresholdCharacteristic set_power ok");
                        //             callback(null);
                        //         } else {
                        //             that.log.debug("\t\t\t\trelativeHumidityHumidifierThresholdCharacteristic set_power Error: " + result[0]);
                        //             callback(new Error(result[0]));
                        //         }
                        //     }).catch(function (err) {
                        //         that.log.debug("\trelativeHumidityHumidifierThresholdCharacteristic set Error: " + err);
                        //         callback(err);
                        //     });
                        // }
                        callback(null);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function (err) {
                    callback(err);
                });
            }.bind(this));

        
        services.push(humidifierService);
        
        return services;
    }

}