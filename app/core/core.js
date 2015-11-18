﻿//global object initialization
var globalObject = null;


try {
    if (window) {
        globalObject = window;
    }
}
catch (e) {
    globalObject = global;
}

globalObject.sweva = {};

globalObject.sweva.axios = require('../../bower_components/axios/dist/axios.min.js');

var Ajv = require('../../node_modules/ajv/lib/ajv.js');
globalObject.sweva.Ajv = new Ajv();

var ComposableLoader = require('./execution/composableLoader.js');
globalObject.sweva.ComposableLoader = new ComposableLoader('http://localhost:5001/examplesJSON/');

globalObject.sweva.ExecutionManager = require('./execution/executionManager.js');

var ErrorManager = require('./errors/errorManager.js');
globalObject.sweva.ErrorManager = new ErrorManager();

var SwevaScript = require('./swevaScript/swevaScript.js');
globalObject.sweva.SwevaScript = new SwevaScript();

globalObject.sweva.libs = {
    axios: globalObject.sweva.axios,
    get: globalObject.sweva.SwevaScript.get
}

//settings
globalObject.sweva.settings = {
    enableSandboxing: true
}

function asd() {
    return "hi";
}