'use strict';

var Composable = require('./composable.js');
var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');

function Module(initializationObject) {

    this.initialize(initializationObject);

    this.initializeFunction(initializationObject, 'request', 2,
        function (data, input) {
            return new Promise(function (resolve, reject) {
                resolve(0);
            });
        });
    this.initializeFunction(initializationObject, 'requestError', 2, null);

    this.initializeFunction(initializationObject, 'response', 2,
        function (response, input) { return response.data });

    this.initializeFunction(initializationObject, 'compute', 2, null);
  
   
    
}
Module.prototype = Object.create(Composable.prototype);
Module.prototype.constructor = Module;

Module.prototype.callService = function (request, input) {
    var self = this;
    return new Promise(function (resolve, reject) {
        request
        .then(function (response) {
            resolve(self.response(response, input));
        })
        .catch(function (response) {
            //if we have a function to deal with errors from service directly...
            if (self.requestError !== null) {
                resolve(self.requestError(response, input));
            }
            else {
                reject(response);
            }
            
        });
    });
}

Module.prototype.execute = function (data, input) {
    var self = this;

    return new Promise(function (resolve, reject) {
    
        if (self.compute !== null) {
            resolve(self.compute(data, input));
        }
        else {
            self.callService(self.request(data, input), input).then(function (output) {
                resolve(output);
            }).catch(function (err) {
                sweva.ErrorManager.error(
                   new ExecutionError('something happened unexpected happened' + err,
                   'Module.' + this.name, err));
                console.error(err);
            });
        }       
    });
}
module.exports = Module;