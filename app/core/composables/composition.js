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

            //ok all loaded, now we can analyze graph and check for compatibility
            self.analyzeLinkGraph();
            resolve();
        })
        .catch(function (error) {
            sweva.ErrorManager.error(
                       new ExecutionError('Could not load all modules: ' + error,
                       self.context, self.modules));
            //reject(sweva.ErrorManager.getLastError());
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

//Tarjan's strongly connected components algorithm
//https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
Composition.prototype.hasCycles = function (startingNodeArray) {
    var nodes = {};
    var edges = {}

    for (var key in this.modules) {
        if (this.modules.hasOwnProperty(key)) {
            nodes[key] = {}
        }
    }

    for (var key in this.links) {
        if (this.links.hasOwnProperty(key)) {
            edges[key] = [];
            for (var i = 0; i < this.links[key].length; i++) {
                edges[key].push(this.links[key][i].to);
            }
        }
    }

    /*nodes = {
        '1': {},
        '2': {},
        '3': {},
        '4': {},
        '5': {},
        '6': {},
        '7': {}
    }

    edges = {
        '1': ['4'],
        '2': ['4', '5'],
        '3': ['5'],
        '4': ['6'],
        '5': ['6'],
        '6': ['7']
    }*/
    //Kahn's algorithm
    //https://en.wikipedia.org/wiki/Topological_sorting
    var L = [];
    var S = startingNodeArray.slice();
    var uniqueL = true;
    while (S.length > 0) {
        var n = S.pop();

        //sorting only works, if all elements are unique!
        if (L.indexOf(n) >= 0) {
            uniqueL = false;
            break;
        }
        L.push(n);
        if (edges.hasOwnProperty(n)) {
            for (var i = 0; i < edges[n].length; i++) {
                var m = edges[n][i];
                edges[n].splice(i, 1);

                i--;

                var hasIncoming = false;
                for (var key in edges) {
                    if (edges.hasOwnProperty(key)) {
                        for (var k = 0; k < edges[key].length; k++) {
                            if (edges[key][k] == m) {
                                hasIncoming = true;
                                break;
                            }
                        }
                    }
                    if (hasIncoming) {
                        break;
                    }
                }
                if (!hasIncoming) {
                    S.push(m);
                }
                if (edges[n].length == 0) {
                    delete edges[n];
                    break;
                }
            }
        }
    }

    //if edges exist, or L has non unique elements: there is a cycle
    if (Object.keys(edges).length > 0 || !uniqueL) {
        return true;
    }
    return false;
}

Composition.prototype.checkSchemaCompatibility = function (obj1Name, obj2Name, obj1Schema, obj2Schema, mappingFrom, mappingTo) {
    if (obj1Schema == null || obj2Schema == null) { //schemas optional (null), so give the benefit of the doubt
        return true;
    }
    var error = null;
    function metaLevel(level, from, to) {
        for (var key in to) {
            if (!from.hasOwnProperty(key)) {
                error = {
                    level: level,
                    message: 'missing property "' + key + '"'
                }
                return false;
            }

            if (key === 'items') {
                if (!metaLevel(level + '.' + key, from[key], to[key])) {
                    return false;
                }
            }
            else if (key === 'properties') {
                if (!propertyLevel(level + '.' + key, from[key], to[key])) {
                    return false;
                }
            }
            else if (key === 'required') {
                //special: required array order should be ignored
                from[key].sort();
                to[key].sort();

                if (from[key].length != to[key].length) {
                    error = {
                        level: level,
                        message: 'array length different for "' + key + '" ' + from[key].toString() + ' != ' + to[key].toString()
                    }
                    return false;
                }

                for (var i = 0; i < from[key].length; i++) {
                    if (from[key][i] !== to[key][i]) {
                        error = {
                            level: level,
                            message: 'array element difference for "' + key + '" ( ' + from[key][i] + ' != ' + to[key][i]
                                + ' ) ' + from[key].toString() + ' != ' + to[key].toString()
                        }

                        return false;
                    }
                }
            }
            else {
                if (from[key] !== to[key]) {
                    error = {
                        level: level,
                        message: 'inequal property value "' + key + '" ( ' + from[key] + ' != ' + to[key] + ' )'
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function propertyLevel(level, from, to) {
        for (var key in to) {
            if (!from.hasOwnProperty(key)) {
                error = {
                    level: level,
                    message: 'missing property "' + key + '"'
                }
                return false;
            }
            if (!metaLevel(level + '.' + key, from[key], to[key])) {
                return false;
            }
        }
        return true;
    }

    var result = true;

    function scopeOnMapping(schema, mapping) {
        var hasSchema = true;

        if (schema.hasOwnProperty('properties')) {
            if (schema.properties.hasOwnProperty(mapping)) {
                return schema.properties[mapping];
            }
            else {
                return null;
            }
        } else {
            return null;
        }

        return schema;
    }
    var OriginalObj1Schema = obj1Schema; //for error output
    var OriginalObj2Schema =obj2Schema;
    if (typeof mappingTo === 'string') {
        var temp = scopeOnMapping(obj2Schema, mappingTo);
        if (temp) {
            obj2Schema = temp;
        }
        else {
            error = {
                level: '',
                message: 'Module "' + obj2Name + '" has no schema for property "' + mappingTo + '" provided by module "' + obj1Name + '"'
            }
        }
    }

    if (typeof mappingFrom === 'string') {
        var temp = scopeOnMapping(obj1Schema, mappingFrom);
        if (temp) {
            obj1Schema = temp;
        }
        else {
            error = {
                level: '',
                message: 'Module "' + obj1Name + '" has no schema for property "' + mappingFrom + '" required by module "' + obj2Name + '"'
            }
        }
    }

    if (!error) {
        result = metaLevel('', obj1Schema, obj2Schema);
    }

    if (error) {
        var relevantMapping = '';
        if (typeof mappingFrom === 'string' && typeof mappingTo === 'string') {
            relevantMapping = ' for the mapping "' + mappingFrom + '" -> "' + mappingTo + '"';
        } else if (typeof mappingTo === 'string') {
            relevantMapping = ' for the mapping "' + mappingTo + '"';
        }
        sweva.ErrorManager.error(
                      new DefinitionError('Schemas of "' + obj1Name + '" and "' + obj2Name + '" incompatible' + relevantMapping + ': '
            + error.level + ': ' + error.message,
                      this.context, { [obj1Name]: OriginalObj1Schema, [obj2Name]: OriginalObj2Schema }));
    }
    return result;
}

Composition.prototype.analyzeLinkGraph = function () {
    this.invalidLinkGraph = false;
    this.startingModules = Object.keys(this.modules);
    this.endingModules = {};
    for (var key in this.modules) {
        if (this.modules.hasOwnProperty(key)) {
            this.endingModules[key] = true;
        }
    }

    //find startingModules that have no ingoing edges
    //find endingModules that have no outgoing edges
    for (var key in this.links) {
        if (this.links.hasOwnProperty(key)) {
            for (var i = 0; i < this.links[key].length; i++) {
                var prop = this.links[key][i].to;
                var mapping = this.links[key][i].mapping;
                
                //check if linking to existing module!
                if (!this.modules.hasOwnProperty(prop)) {
                    sweva.ErrorManager.error(
                      new DefinitionError('Module "' + key + '" links to undefined module "' + prop + '"!',
                      this.context, Object.keys(this.modules)));
                    this.invalidLinkGraph = true;
                }
                else {
                    if (typeof mapping === 'undefined') { //no mapping => dataOutA -> dataInB
                        //check for schema compatibility

                        var compatibleSchemas = this.checkSchemaCompatibility(key, prop, this.modules[key].dataOutSchema, this.modules[prop].dataInSchema);
                        if (!compatibleSchemas) {
                            this.invalidLinkGraph = true;
                        }
                    }
                    else if (typeof mapping === 'string') {
                        var toModule = this.modules[prop];

                        if (toModule.dataInNames.indexOf(mapping) < 0) {
                            sweva.ErrorManager.error(
                                 new DefinitionError('Module "' + key + '" links to undefined dataIn "' + mapping + '" of module "' + prop + '"!',
                                 this.context, toModule.dataInNames));
                            this.invalidLinkGraph = true;
                        }
                        else if (this.modules[key].dataOutSchema && this.modules[prop].dataInSchema != null) {//schemas are optional, so only check if available
                            var compatibleSchemas = this.checkSchemaCompatibility(key, prop, this.modules[key].dataOutSchema, this.modules[prop].dataInSchema, null, mapping);
                            if (!compatibleSchemas) {
                                this.invalidLinkGraph = true;
                            }
                        }
                    }
                    else { //object
                        for (var mapKey in mapping) {
                            if (mapping.hasOwnProperty(mapKey)) {
                                if (this.modules[key].dataOutNames.indexOf(mapKey) < 0) { //module has no such dataOut it tries to map to another module
                                    sweva.ErrorManager.error(
                                         new DefinitionError('Module "' + key + '" maps undefined dataIn "' + mapKey + '" to module "' + prop + '"!',
                                         this.context, this.modules[key].dataOutNames));
                                    this.invalidLinkGraph = true;
                                    break;
                                }

                                if (this.modules[prop].dataInNames.indexOf(mapping[mapKey]) < 0) { //module has no such dataIn
                                    sweva.ErrorManager.error(
                                         new DefinitionError('Module "' + key + '" links to undefined dataIn "' + mapping + '" of module "' + prop + '"!',
                                         this.context, this.modules[prop].dataInNames));
                                    this.invalidLinkGraph = true;
                                    break;
                                }

                                if (this.modules[key].dataOutSchema && this.modules[prop].dataInSchema != null) {//schemas are optional, so only check if available
                                    var compatibleSchemas = this.checkSchemaCompatibility(key, prop, this.modules[key].dataOutSchema, this.modules[prop].dataInSchema, mapKey, mapping[mapKey]);
                                    if (!compatibleSchemas) {
                                        this.invalidLinkGraph = true;
                                        break;
                                    }
                                }

                            }
                        }
                    }
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

    //check for cycles
    var hasCycles = this.hasCycles(this.startingModules);
    if (hasCycles) {
        sweva.ErrorManager.error(
                       new DefinitionError('There are cycles in the linkage of modules!',
                       this.context, this.links));
        this.invalidLinkGraph = true;
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

            this.modules[moduleName].execute(data, input, this.context, moduleName)
                .then(func(moduleName, i))
                .catch(function (error) {
                    //error is logged earlier, but how to handle?
                });
        }

        //debug stuff
        /*var st = "";
        for (var  k= 0; k < this.unlcearedModules.length; k++) {
            st += this.unlcearedModules[k].module +':'+ this.unlcearedModules[k].cleared+'  ';
        }
        console.log(st);*/
    }
}
Composition.prototype.execute = function (data, input, context, alias) {
    var self = this;
    this.data = data;
    this.input = input;
    this.updateContext(context, alias);
    this.reset();

    return new Promise(function (resolve, reject) {
        if (!self.invalidLinkGraph && self.validateTypes('dataIn', data) && self.validateTypes('input', input)) {
            //each starting module has an own data block (array element)
            for (var i = 0; i < self.startingModules.length; i++) {
                var moduleName = self.startingModules[i];
                self.parameters[moduleName] = self.mapDataIn(self.data, moduleName, self.modules);
            }
            for (var key in self.data) {
                if (self.data.hasOwnProperty(key)) {
                    self.parameters[key] = self.data[key]; //copy data directly
                }
            }

            self.executeFinishedCallback = function (error) {
                if (error) {
                    sweva.ErrorManager.error(
                       new ExecutionError('Something unexpected happened: ' + error,
                       this.context, error));
                    reject(sweva.ErrorManager.getLastError());
                }
                else {
                    var result = self.mapDataOut(self.output)
                    if (self.validateTypes('dataOut', result)) {
                        resolve(result);
                    }
                    else {
                        reject(sweva.ErrorManager.getLastError());
                    }
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
        }
        else {
            reject(sweva.ErrorManager.getLastError());
        }
    });
}

module.exports = Composition;