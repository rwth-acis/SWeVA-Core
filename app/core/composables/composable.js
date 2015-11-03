'use strict';

var DefinitionError = require('../errors/definitionError.js');

function Composable() {
}

Composable.prototype.name = 'someModule';


Composable.prototype.initialize = function (initializationObject) {
    this.initializeProperty(initializationObject, 'name', 'someModule');


    this.initializeProperty(initializationObject, 'dataInNames', ['data']);
    this.initializeProperty(initializationObject, 'dataOutNames', ['result']);
    this.initializeProperty(initializationObject, 'inputNames', []);

    this.dataIn = this.dataInNames.length;
    this.dataOut = this.dataOutNames.length;
    this.inputIn = this.inputNames.length;

}
Composable.prototype.initializeProperty = function (initializationObject,
    property, defaultValue) {
    if (initializationObject.hasOwnProperty(property)) {
        this[property] = initializationObject[property];
    } else {
        this[property] = defaultValue;
    }
   
}

Composable.prototype.initializeFunction = function (initializationObject,
    property, expectedArgumentsCount, defaultValue) {
    if (initializationObject.hasOwnProperty(property)) {
        if (typeof initializationObject[property] === 'function') {
            if (initializationObject[property].length >= expectedArgumentsCount) {
                this[property] = initializationObject[property];
            }
            else {
                
                sweva.ErrorManager.error(
                    new DefinitionError('function "' + property + '" requires at least ' +
                    expectedArgumentsCount + ' arguments, but provides only ' +
                    initializationObject[property].length,
                    this.constructor.name+'.'+this.name, initializationObject[property]));   
            }
        }
        else {
            
            sweva.ErrorManager.error(
                   new DefinitionError('"'+property + '" is reserved for functions, but not defined as one',
                   this.constructor.name + '.' + this.name, initializationObject[property]));
        }
    }
    else {
        this[property] = defaultValue;
    }
}
Composable.prototype.execute = function (data, input) {
    return new Promise(function (resolve, reject) {
        resolve(0);
    });
}
module.exports = Composable;