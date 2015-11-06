'use strict';

var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');
function Composable() {
}

Composable.prototype.name = 'someModule';

Composable.prototype.initialize = function (initializationObject) {
    this.initializeProperty(initializationObject, 'name', 'someModule');
    this.initializeProperty(initializationObject, 'dataInSchema', null);
    this.initializeProperty(initializationObject, 'dataOutSchema', null);
    this.initializeProperty(initializationObject, 'inputSchema', null);

    this.initializeProperty(initializationObject, 'dataInNames', ['data']);
    this.initializeProperty(initializationObject, 'dataOutNames', ['result']);
    this.initializeProperty(initializationObject, 'inputNames', []);

    this.dataIn = this.dataInNames.length;
    this.dataOut = this.dataOutNames.length;
    this.inputIn = this.inputNames.length;

    this.context = this.constructor.name + '[' + this.name + ']';
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
                    this.context, initializationObject[property]));
            }
        }
        else {
            sweva.ErrorManager.error(
                   new DefinitionError('"' + property + '" is reserved for functions, but not defined as one',
                   this.context, initializationObject[property]));
        }
    }
    else {
        this[property] = defaultValue;
    }
}
Composable.prototype.updateContext = function (context, alias) {
    if (typeof context === 'string') {
        if (typeof alias !== 'string') {
            alias = '';
        }
        else {
            alias = ': ' + alias;
        }
        this.context = context + '.' + this.constructor.name + '[' + this.name + alias + ']';
    }
}
Composable.prototype.validateTypes = function (type, obj) {
    var missingProperties = [];
    var typeNames = this[type + 'Names'];
    var typeSchema = this[type + 'Schema'];

    if (typeNames.length > 1) {// when only one name specified, the whole data object is taken
        for (var i = 0; i < typeNames.length; i++) {
            if (!obj.hasOwnProperty(typeNames[i])) {
                missingProperties.push(typeNames[i]);
            }
        }
    }

    if (missingProperties.length > 0) {
        sweva.ErrorManager.error(new ExecutionError('Some required properties specified in ' + (type + 'Names') + ' are missing from the object: ' + missingProperties.toString(),
                       this.context, obj));
        return false;
    } else {
        if (typeSchema !== null) {
            var valid = sweva.Ajv.validate(typeSchema, obj);
            if (!valid) {
                sweva.ErrorManager.error(new ExecutionError('Object does not match the given ' + type + 'Schema: ' + sweva.Ajv.errorsText(sweva.Ajv.errors),
                       this.context, obj));
                return false;
            }
        }
    }

    return true;
}
Composable.prototype.execute = function (data, input) {
    return new Promise(function (resolve, reject) {
        resolve(0);
    });
}
module.exports = Composable;