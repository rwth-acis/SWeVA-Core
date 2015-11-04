'use strict';

var Composable = require('./composable.js');
var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');

function Composition(initializationObject) {
    this.initializeProperty(initializationObject, 'modules', {});
    this.initializeProperty(initializationObject, 'links', {});

    this.initializeFunction(initializationObject, 'mapInput', 3, function (input, moduleName, modules) {
        if (input.hasOwnProperty(moduleName)) {
            return input[moduleName];
        }
    });

    this.initializeFunction(initializationObject, 'mapDataIn', 3, function (data, moduleName, modules) {
        if (data.hasOwnProperty(moduleName)) {
            return data[moduleName];
        }
    });

    this.initializeFunction(initializationObject, 'mapDataOut', 1, function (output) {
        return output;
    });

    this.initialize(initializationObject);
    this.isReady = false;
    //this.loadModules();
    this.analyzeLinkGraph();
}
Composition.prototype = Object.create(Composable.prototype);

Composition.prototype.loadModules = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        var promises = [];
        for (var key in self.modules) {
            if (self.modules.hasOwnProperty(key)) {
                promises.push(sweva.ComposableLoader.load(self.modules[key], self.modules, key));
            }
        }

        Promise.all(promises).then(function () {
            self.isReady = true;
            
            if (self.wantsToExecute) {
                self.wantsToExecute = false;
                self.executeStarterCallback();
            }
            resolve();
        });
    });
}
Composition.prototype.hasParameters = function (module) {
    //how many parameters do we need?
    var parametersNeeded = this.modules[module].dataIn;

    //we do not need any
    if (parametersNeeded == 0) {
        return true;
    }

    //we need at least one
    if (this.parameters.hasOwnProperty(module)) {
        //if we only need one, it's ok (we have some value defined, if the key is present)
        if (parametersNeeded == 1) {
            return true;
        }
        //compare available parameter count with needed
        return Object.keys(this.parameters[module]).length == parametersNeeded;
    }
    return false;
}

Composition.prototype.addParameter = function (module, property, value) {
    //if no key vor module present, create one
    if (!this.parameters.hasOwnProperty(module)) {
        this.parameters[module] = {
        };
    }

    this.parameters[module][property] = value;
}
Composition.prototype.reset = function () {
    this.parameters = {};
    this.unlcearedModules = [];
    this.output = {};
    for (var key in this.modules) {
        if (this.modules.hasOwnProperty(key)) {
            this.unlcearedModules.push({
                module: key,
                cleared: false
            });
        }
    }
}
Composition.prototype.analyzeLinkGraph = function () {
    this.startingModules = Object.keys(this.modules);
    this.endingModules = {};
    for (var key in this.modules) {
        if (this.modules.hasOwnProperty(key)) {
            this.endingModules[key] = true;
        }
    }

    //remove inverseLinks later, if actually not needed
    this.inverseLinks = {};

    for (var key in this.links) {
        if (this.links.hasOwnProperty(key)) {
            for (var i = 0; i < this.links[key].length; i++) {
                //build inverse graph
                var prop = this.links[key][i].to;
                if (!this.inverseLinks.hasOwnProperty(prop)) {
                    this.inverseLinks[prop] = [key];
                }
                else {
                    this.inverseLinks[prop].push(key);
                }
                //if one module A points to module B, then B cannot be startingModule
                var propIndex = this.startingModules.indexOf(prop);
                if (propIndex >= 0) {
                    this.startingModules.splice(propIndex, 1);
                }
                //if one module A points to module B, then A cannot be endingModule

                if (this.endingModules.hasOwnProperty(key)) {
                    delete this.endingModules[key]
                }
            }
        }
    }

    //implicit imformation
    this.dataIn = this.startingModules.length;
    this.dataOut = Object.keys(this.endingModules).length;

    this.dataInNames = [];
    this.dataOutNames = [];

    for (var i = 0; i < this.startingModules.length; i++) {
        this.dataInNames.push(this.startingModules[i]);
    }
    for (var key in this.endingModules) {
        if (this.endingModules.hasOwnProperty(key)) {
            this.dataOutNames.push(key);
        }
    }
    for (var key in this.endingModules) {
        if (this.endingModules.hasOwnProperty(key)) {
            this.dataOutNames.push(key);
        }
    }
}

Composition.prototype.moduleQueueExecution = function () {
    for (var i = 0; i < this.unlcearedModules.length; i++) {
        if (this.unlcearedModules[i].cleared) {
            continue;
        }

        var moduleName = this.unlcearedModules[i].module;
        var data = 0;
        var input = 0;

        //fill data and input for next module call
        if (this.hasParameters(moduleName)) {
            data = this.parameters[moduleName];

            input = this.mapInput(this.input, moduleName, this.modules);
        }
        else {
            continue;
        }
        

        //not continued = modulName can be executed
        var self = this;
        var func = function (moduleName, i) {
            return function (output) {
                //console.log(moduleName + " " + output)

                if (self.endingModules.hasOwnProperty(moduleName)) {
                    var allCleared = true;
                    //if we have only one output module, we do not need a named property
                    if (Object.keys(self.endingModules).length > 1) {
                        self.output[moduleName] = output;
                    }
                    else {
                        self.output = output;
                    }

                    //check if this was the last module
                    for (var k = 0; k < self.unlcearedModules.length; k++) {
                        if (!self.unlcearedModules[k].cleared) {
                            allCleared = false;
                        }
                    }
                    //if this was the last endingModule, finish
                    if (allCleared) {
                        self.executeFinishedCallback();
                    }
                }
                else {
                    for (var k = 0; k < self.links[moduleName].length; k++) {
                        var mapping = self.links[moduleName][k].mapping;

                        if (typeof mapping === 'undefined') { //no mapping
                            self.parameters[self.links[moduleName][k].to] = output;
                        }
                        else if (typeof mapping === 'string') { //map whole output (i.e. no sub-parts of output present)
                            if (mapping.trim().length == 0) {//empty string = no mapping
                                self.parameters[self.links[moduleName][k].to] = output;
                            }
                            else {
                                self.addParameter(self.links[moduleName][k].to, mapping, output);
                            }
                        }
                        else if (typeof mapping === 'object') { //output is an object, so map properties
                            //for each mapping
                            for (var key in mapping) {
                                if (mapping.hasOwnProperty(key)) {
                                    //map the value of the output to the corresponding key
                                    if (mapping[key].trim().length == 0) {//empty mapping target
                                        self.parameters[self.links[moduleName][k].to] = output[key];
                                    }
                                    else {
                                        self.addParameter(self.links[moduleName][k].to, mapping[key], output[key]);
                                    }
                                }
                            }
                        }
                        else {
                            //error, no idea what to do with output
                        }
                    }
                }

                self.moduleQueueExecution.apply(self);
            }
        };
        if (!this.unlcearedModules[i].cleared) {
            this.unlcearedModules[i].cleared = true;

            this.modules[moduleName].execute(data, input).then(func(moduleName, i));
        }

        //debug stuff
        /*var st = "";
        for (var  k= 0; k < this.unlcearedModules.length; k++) {
            st += this.unlcearedModules[k].module +':'+ this.unlcearedModules[k].cleared+'  ';
        }
        console.log(st);*/
    }
}
Composition.prototype.execute = function (data, input) {
    var self = this;
    this.data = data;
    this.input = input;

    this.reset();

    return new Promise(function (resolve, reject) {
        //each starting module has an own data block (array element)
        for (var i = 0; i < self.startingModules.length; i++) {
            var moduleName=self.startingModules[i];
            self.parameters[moduleName] = self.mapDataIn(self.data, moduleName, self.modules);
        }
        for (var key in self.data) {
            if (self.data.hasOwnProperty(key)) {
                self.parameters[key] = self.data[key]; //copy data directly
            }
        }

        self.executeFinishedCallback = function (error) {
            if (error) {
                reject(error);
            }
            else {
                resolve(self.mapDataOut(self.output));
            }
        }

        if (self.isReady) {//all modules are loaded
            self.moduleQueueExecution.apply(self);
        }
        else {
            self.wantsToExecute = true;//we want to execute, but cannot: tell so the initialization/loading part
            self.executeStarterCallback = function () { //execute via callback, as soon as loading finished
                self.moduleQueueExecution.apply(self);
            }
        }
    });
}

module.exports = Composition;