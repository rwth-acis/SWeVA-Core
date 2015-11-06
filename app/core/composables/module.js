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

Module.prototype.execute = function (data, input, context, alias) {
    var self = this;
    this.updateContext(context, alias);
    //validateInput

    return new Promise(function (resolve, reject) {
        if (self.validateTypes('dataIn', data) && self.validateTypes('input', input)) {
            if (self.compute !== null) {
                var result = self.compute(data, input);
                if (self.validateTypes('dataOut', result)) {
                    resolve(result);
                }
                else {
                    reject(sweva.ErrorManager.getLastError());
                }
            }
            else {
                self.callService(self.request(data, input), input).then(function (output) {
                    if (self.validateTypes('dataOut', output)) {
                        resolve(output);
                    }
                    else {
                        reject(sweva.ErrorManager.getLastError());
                    }
                }).catch(function (error) {
                    sweva.ErrorManager.error(
                       new ExecutionError('Something unexpected happened: ' + error,
                       this.context, error));
                    reject(sweva.ErrorManager.getLastError());
                });
            }
        }
        else {
            reject(sweva.ErrorManager.getLastError());
        }
    });
}
module.exports = Module;