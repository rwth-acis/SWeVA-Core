'use strict';

var Composable = require('./composable.js');

function Module(initializationObject){//name, createRequest, transformResponse) {
    
    if (initializationObject.hasOwnProperty('request')) {
        this.createRequestFunction = initializationObject.request;
    } else {
        this.createRequestFunction = function (dataArray, inputArray) {
            return new Promise(function (resolve, reject) {
                resolve(0);
            });
        };
    }
    if (initializationObject.hasOwnProperty('response')) {
        this.transformResponseFunction = initializationObject.response;
    } else {
        this.transformResponseFunction = function (response) { return [response.data] };
    }

    this.initialize(initializationObject);
}
Module.prototype = Object.create(Composable.prototype);



Module.prototype.createRequest = function (dataArray, inputArray) {
    return this.createRequestFunction(dataArray, inputArray);
}
Module.prototype.callService = function (request, inputArray) {
    var self = this;
    return new Promise(function (resolve, reject) {
        
        request
        .then(function (response) {
            resolve(self.transformResponse(response, inputArray));
        })
        .catch(function (response) {
            reject(response);
        });        
    });
}
Module.prototype.transformResponse = function (response) {
    return this.transformResponseFunction(response);
}
Module.prototype.execute = function (dataArray, inputArray) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var request = self.createRequest(dataArray, inputArray);
        self.callService(request, inputArray).then(function (output) {
            resolve(output);
        }).catch(function (err) {
            console.error(err);
        });
    });
}
module.exports = Module;