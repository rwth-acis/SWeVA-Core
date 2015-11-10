'use strict';

var Composable = require('./composable.js');
var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');

function Module(initializationObject) {
    this.initialize(initializationObject);

    this.initializeFunction(initializationObject, 'request', 3,
        function (data, input, libs) {
            return new Promise(function (resolve, reject) {
                resolve(0);
            });
        });
    this.initializeFunction(initializationObject, 'requestError', 3, null);

    this.initializeFunction(initializationObject, 'response', 3,
        function (response, input, libs) { return response.data });

    this.initializeFunction(initializationObject, 'compute', 3, null);
}
Module.prototype = Object.create(Composable.prototype);
Module.prototype.constructor = Module;

Module.prototype.callService = function (request, input) {
    var self = this;
   
    return new Promise(function (resolve, reject) {
        
        request
        .then(function (response) {
            resolve(self.response(response, input, sweva.libs));
        })
        .catch(function (response) {
            //if we have a function to deal with errors from service directly...
            if (typeof self.requestError === 'function') {
                resolve(self.requestError(response, input, sweva.libs));
            }
            else {
                reject(response);
            }
        });
    });
}

Module.prototype.execute = function (data, input, context, alias, progress) {
    var self = this;
    
    context = this.getNewContext(context, alias);
   
    //validateInput
    
    return new Promise(function (resolve, reject) {
        if (self.validateTypes('dataIn', data) && self.validateTypes('input', input)) {
            
            if (typeof self.compute === 'function') {
                var result = self.compute(data, input, sweva.libs);
                if (self.validateTypes('dataOut', result)) {
                    //report progress
                    if (typeof progress !== 'undefined') {
                        progress(alias, self.name, context);
                    }
                    resolve(result);
                }
                else {
                    reject(sweva.ErrorManager.getLastError());
                }
            }
            else {
                
                self.callService(self.request(data, input, sweva.libs), input).then(function (output) {
                    
                    if (self.validateTypes('dataOut', output)) {
                        //report progress
                        if (typeof progress !== 'undefined') {
                            
                            progress(alias, self.name, context);
                        }
                        resolve(output);
                    }
                    else {
                        reject(sweva.ErrorManager.getLastError());
                    }
                }).catch(function (error) {
                    sweva.ErrorManager.error(
                       new ExecutionError('Something unexpected happened: ' + error,
                       context, error));
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