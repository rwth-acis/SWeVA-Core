'use strict';

var Composable = require('./composable.js');

function Composition(initializationObject) {

    if (initializationObject.hasOwnProperty('modules')) {
        this.modules = initializationObject.modules;
    } else {
        this.modules = {};
    }

    if (initializationObject.hasOwnProperty('links')) {
        this.links = initializationObject.links;
    } else {
        this.links = {};
    }

    this.initialize(initializationObject);
    this.analyzeLinkGraph();
}
Composition.prototype = Object.create(Composable.prototype);

Composition.prototype.hasParameters = function (module) {
    //how many parameters do we need?
    var parametersNeeded = this.modules[module].dataBlocksIn;

    //we do not need any
    if (parametersNeeded == 0) {
        return true;
    }

    //we need at least one
    if (this.parameters.hasOwnProperty(module)) {
        //compare available parameter count with needed
        return this.parameters[module].count == parametersNeeded;
    }
    return false;
}

Composition.prototype.addParameter = function (module, position, value) {
    //if no key vor module present, create one
    if (!this.parameters.hasOwnProperty(module)) {
        this.parameters[module] = {
            count: 0
        };
    }
    //for paramaeters (datablocks) are expected in a certain order
    if (!this.parameters[module].hasOwnProperty(position)) {
        this.parameters[module].count += 1;
    }

    //check if position is in bounds
    if (this.modules[module].dataBlocksIn <= position || position < 0) {
        //throw some error
    }

    this.parameters[module][position] = value;
}
Composition.prototype.reset = function () {
    this.parameters = {};
    this.unlcearedModules = [];
    this.outputArray = [];
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
    this.dataBlocksIn = this.startingModules.length;
    this.dataBlocksOut = Object.keys(this.endingModules).length;
    this.inputBlocks = Object.keys(this.modules).length;
    /*console.log(this.name);
    console.log(this.dataBlocksIn);
    console.log(this.dataBlocksOut);
    console.log(this.inputBlocks);*/

    /*console.log(this.startingModules);
    console.log(this.endingModules);
    console.log(this.inverseLinks);*/
}

Composition.prototype.moduleQueueExecution = function () {
    for (var i = 0; i < this.unlcearedModules.length; i++) {
        if (this.unlcearedModules[i].cleared) {
            continue;
        }

        var moduleName = this.unlcearedModules[i].module;
        var data = [];
        var input = [];

        //fill data and input for next module call
        if (this.hasParameters(moduleName)) {
            for (var k = 0; k < this.parameters[moduleName].count; k++) {
                data.push(this.parameters[moduleName][k]);
            }

            input = this.inputArray[i];
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
                    self.outputArray.push(output);
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
                    for (var k = 0; k < output.length; k++) {
                        self.addParameter(self.links[moduleName][k].to, self.links[moduleName][k].parameter || 0, output[k]);
                    }
                }

                //console.log(self.parameters);

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
Composition.prototype.execute = function (dataArray, inputArray) {
    var self = this;
    this.dataArray = dataArray;
    this.inputArray = inputArray;

    this.reset();
   
    return new Promise(function (resolve, reject) {
        if (self.dataArray.length < self.dataBlocksIn) {
            //throw error
            reject('Composition ' + '\"' + self.name + '\" has only ' + self.dataArray.length
                + ' elements as data, but requires '+self.dataBlocksIn+'!');
            return;
        }

        /*if (self.inputArray.length < self.inputBlocks) {
            //throw error
            reject('Composition ' + '\"' + self.name + '\" has only ' + self.inputArray.length
                + ' elements as input, but requires ' + self.inputBlocks + '!');
            return;
        }*/


        //each starting module has an own data block (array eslement)
        for (var i = 0; i < self.startingModules.length; i++) {
            var moduleNeedsDataBlocks = self.modules[self.startingModules[i]].dataBlocksIn;
            for (var k = 0; k < moduleNeedsDataBlocks; k++) {
                self.addParameter(self.startingModules[i], k, self.dataArray[i][k]);
            }
        }
        
        self.executeFinishedCallback = function (error) {
            if (error) {
                reject(error);
            }
            else {
               
                resolve(self.outputArray);
            }            
        }
        self.moduleQueueExecution.apply(self);
    });
}

module.exports = Composition;