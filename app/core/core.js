//global object initialization
var globalObject = window;

/*
try {
    if (window) {
        globalObject = window;
    }
}
catch (e) {
    globalObject = global;
}*/

globalObject.sweva = {};

globalObject.sweva.axios = require('../../bower_components/axios/dist/axios.min.js');
globalObject.sweva.mqtt = require('../../node_modules/paho-mqtt/paho-mqtt.js');
globalObject.sweva.asyncmqtt = require('../../node_modules/async-mqtt');

var Ajv = require('../../node_modules/ajv/lib/ajv.js');
globalObject.sweva.Ajv = new Ajv();

var ComposableLoader = require('../../app/core/execution/composableLoader.js');
globalObject.sweva.ComposableLoader = new ComposableLoader('');

globalObject.sweva.ExecutionManager = require('../../app/core/execution/executionManager.js');

var ErrorManager = require('../../app/core/errors/errorManager.js');
globalObject.sweva.ErrorManager = new ErrorManager();

var SwevaScript = require('../../app/core/swevaScript/swevaScript.js');
globalObject.sweva.SwevaScript = new SwevaScript();

globalObject.sweva.libs = {
    axios: globalObject.sweva.axios,
    mqtt: globalObject.sweva.mqtt.Client("broker.mqttdashboard.com", Number(8000), "myclientid_" + parseInt(Math.random() * 100, 10)),
    get: globalObject.sweva.SwevaScript.get,
    set: globalObject.sweva.SwevaScript.set,
    mqttclient: globalObject.sweva.SwevaScript.client,
    mqttsubscribe: globalObject.sweva.SwevaScript.subscribe
}


//settings
globalObject.sweva.settings = {
    enableSandboxing: true
}


//global functions


