'use strict';

var globalObject = window;
globalObject.sweva = {};

globalObject.sweva.axios = require('../../bower_components/axios/dist/axios.min.js');

var ComposableLoader = require('./execution/composableLoader.js');
globalObject.sweva.ComposableLoader = new ComposableLoader('http://localhost:5001/examplesJSON/');

globalObject.sweva.ExecutionManager = require('./execution/executionManager.js');


var ErrorManager = require('./errors/errorManager.js');
globalObject.sweva.ErrorManager = new ErrorManager();
