(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var globalObject = window;
globalObject.sweva = {};

globalObject.sweva.axios = require('../../bower_components/axios/dist/axios.min.js');

var ComposableLoader = require('./execution/composableLoader.js');
globalObject.sweva.ComposableLoader = new ComposableLoader('http://localhost:5001/examplesJSON/');

globalObject.sweva.ExecutionManager = require('./execution/executionManager.js');


var ErrorManager = require('./errors/errorManager.js');
globalObject.sweva.ErrorManager = new ErrorManager();

},{"../../bower_components/axios/dist/axios.min.js":11,"./errors/errorManager.js":6,"./execution/composableLoader.js":9,"./execution/executionManager.js":10}],2:[function(require,module,exports){
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
},{"../errors/definitionError.js":5}],3:[function(require,module,exports){
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
},{"../errors/definitionError.js":5,"../errors/executionError.js":7,"./composable.js":2}],4:[function(require,module,exports){
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
},{"../errors/definitionError.js":5,"../errors/executionError.js":7,"./composable.js":2}],5:[function(require,module,exports){
'use strict';

var SwevaError = require('./swevaError.js');
function DefinitionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'DefinitionError';
}
DefinitionError.prototype = Object.create(SwevaError.prototype);

module.exports = DefinitionError;
},{"./swevaError.js":8}],6:[function(require,module,exports){
'use strict';

function ErrorManager() {
    this.queue = [];
}
ErrorManager.prototype.clear = function () {
    this.queue = [];
}
ErrorManager.prototype.error = function (error) {
    this.queue.push(error);
    console.log(error.toString());
    console.log(error);
    return error;
}

ErrorManager.prototype.getLog = function () {
    var result = '';
    for (var i = 0; i < this.queue.length; i++) {
        result += this.queue[i].toString() +'\n';
    }
    return result;
}

module.exports = ErrorManager;
},{}],7:[function(require,module,exports){
'use strict';

var SwevaError = require('./swevaError.js');

function ExecutionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'ExecutionError';
}
ExecutionError.prototype = Object.create(SwevaError.prototype);

module.exports = ExecutionError
},{"./swevaError.js":8}],8:[function(require,module,exports){
'use strict';

function SwevaError(message, context, faultyObject) {
    
    this.name = 'SwevaError';
    this.message = message || 'Default Message';
    this.stack = (new Error()).stack;
    this.context = context;

    if (faultyObject !== 'undefined') {

        //shallow copy: should provide enough information and save RAM
        //copy is needed, as we need the object ecactly at the time the error occurred
        this.faultyObject = faultyObject;
       
        if (typeof faultyObject === 'function') {
            //slow, but works for now
            this.faultyObject = eval('(' + faultyObject.toString() + ')');
        }
        else if (typeof faultyObject === 'object') {
            for (var key in faultyObject) {
                if (faultyObject.hasOwnProperty(key)) {
                    this.faultyObject[key] = faultyObject[key];
                }
            }
        }
        console.log(this.faultyObject);        
    }
    else {
        this.faultyObject = null;
    }
    
    this.time = Date.now();
}


SwevaError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: this.constructor,
        writable: true,
        configurable: true
    }
});

SwevaError.prototype.getTime = function () {
    return new Date().toLocaleTimeString();
}

SwevaError.prototype.toString = function () {
    var faultyObject = '';
    if(typeof this.faultyObject === 'object') {
        faultyObject= JSON.stringify(this.faultyObject, null, 4);
    } 
    else {
        faultyObject = this.faultyObject.toString();
    }
    
    return '[' + this.getTime() + '] ' + this.name + ' in ' + this.context + ' : ' + this.message + '\n'
        + faultyObject;
}
module.exports = SwevaError;
},{}],9:[function(require,module,exports){
'use strict';

var axios = require('../../../bower_components/axios/dist/axios.min.js');

var Module = require('../composables/module.js');
var Composition = require('../composables/composition.js');

//https://stackoverflow.com/posts/26917938/revisions
if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var match = funcReg.exec(this.replace(/\n/g, ' '));

        if (match) {
            return new Function(match[1].split(','), match[2]);
        }
        return null;
    };
}

function ComposableLoader(basePath, suffix) {
    this.basePath = basePath || '';
    this.suffix = suffix || '.json';
    this.composables = {};
    this.waitingList = {};
}
ComposableLoader.prototype.convertToObject = function (json) {
    var result = json;
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            //reconstruct functions from string
            if (typeof json[key][0] == 'string') {
                var str = new String(json[key][0]);

                if (str.trim().indexOf('function') == 0) {
                    json[key] = json[key].join('').parseFunction();
                }
            }
        }
    }

    return result;
}

ComposableLoader.prototype.assignLoadedComposables = function (name, composable, assignToObject, property) {
    this.composables[name] = composable;

    if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
        assignToObject[property] = composable;
        //deal with waitinglist: as the caller has to wait for 'then' we, can set the required values now with some delay

        if (this.waitingList.hasOwnProperty(name)) {
            for (var i = 0; i < this.waitingList[name].length; i++) {
                var assignTo = this.waitingList[name][i].assignTo;
                var prop = this.waitingList[name][i].prop;

                assignTo[prop] = composable;
            }
            delete this.waitingList[name];
        }
    }
}
ComposableLoader.prototype.load = function (name, assignToObject, property) {
    var self = this;

    return new Promise(function (resolve, reject) {
        if (self.composables.hasOwnProperty(name)) {
            if (self.composables[name] === true) {//we have only our placeholder, no real value yet
                //put in waitinglist, which is checked after each load
                if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
                    if (!self.waitingList.hasOwnProperty(name)) {
                        self.waitingList[name] = [];
                    }
                    self.waitingList[name].push({
                        assignTo: assignToObject,
                        prop: property
                    });
                }

                resolve(self.composables[name]);
            }
            else {
                if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
                    assignToObject[property] = self.composables[name];
                }
                resolve(self.composables[name]);
            }
        }
        else {
            self.composables[name] = true; //set key and prevent unnecessary loads, while loading is already in progress
            var request = axios.get(self.basePath + name + self.suffix)
            .then(function (response) {
                var composable = self.convertToObject(response.data);
                console.log('loaded ' + composable.name);

                if (composable.type == 'module') {
                    composable = new Module(composable);

                    self.assignLoadedComposables(name, composable, assignToObject, property);

                    resolve(composable);
                }
                else {
                    composable = new Composition(composable);
                    
                    self.assignLoadedComposables(name, composable, assignToObject, property);
                    
                    composable.loadModules().then(function () {
                        resolve(composable);
                    });
                }
            })
            .catch(function (response) {
                reject(self.basePath + name + self.suffix); //could not load
            });
        }
    });
}
ComposableLoader.prototype.clear = function () {
    this.composables = {};
    this.waitingList = {};
}
module.exports = ComposableLoader;
},{"../../../bower_components/axios/dist/axios.min.js":11,"../composables/composition.js":3,"../composables/module.js":4}],10:[function(require,module,exports){
'use strict';

function ExecutionManager() {
}
ExecutionManager.prototype.setup = function (executionArray) {
    var needsLoading = [];
    this.composables = {};
    this.isReady = false;
    this.wantsToExecute = false;
    //if it is not an array, make it one
    if (!Array.isArray(executionArray)) {
        executionArray = [executionArray];
    }

    for (var i = 0; i < executionArray.length; i++) {
        var composable = executionArray[i];
        if (typeof composable === 'string') {
            needsLoading.push(sweva.ComposableLoader.load(composable, this.composables, composable));
        }
        else {
            if (composable.type == 'module') {
                this.composables[composable.name] = new Module(composable);
            }
            else {
                this.composables[composable.name] = new Composition(composable);
                needsLoading.push(this.composables[composable.name].loadModules());
            }
        }
    }
    var self = this;
    Promise.all(needsLoading).then(function () {
        //composables should now contain everything
        self.isReady = true;
        if (self.wantsToExecute) {
            self.wantsToExecute = false;
            self.executeCallback();
        }
    });
}

ExecutionManager.prototype.execute = function (data, input) {
    var executions = [];
    var self = this;

    return new Promise(function (resolve, reject) {
        var func = function (composables, executions, resolve, reject) {
            return function () {
                var onlyOneConsumable = false;

                if (Object.keys(composables).length == 1) {
                    onlyOneConsumable = true;
                }
                for (var key in composables) {
                    if (composables.hasOwnProperty(key)) {
                        if (onlyOneConsumable) {
                            executions.push(composables[key].execute(data, input));
                        }
                        else {
                            executions.push(composables[key].execute(data[key], input[key]));
                        }
                    }
                }

                Promise.all(executions).then(function (results) {
                    if (onlyOneConsumable) {
                        return resolve(results[0]);
                    }
                    resolve(results);
                })
                .catch(function (results) {
                    if (onlyOneConsumable) {
                        return resolve(results[0]);
                    }
                    reject(results);
                });
            }
        }

        if (self.isReady) {
            func(self.composables, executions, resolve, reject)();
        }
        else {
            self.wantsToExecute = true;
            self.executeCallback = func(self.composables, executions, resolve, reject);
        }
    });
}

ExecutionManager.prototype.run = ExecutionManager.prototype.execute;
module.exports = ExecutionManager
},{}],11:[function(require,module,exports){
/* axios v0.7.0 | (c) 2015 by Matt Zabriskie */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.axios=t():e.axios=t()}(this,function(){return function(e){function t(r){if(n[r])return n[r].exports;var o=n[r]={exports:{},id:r,loaded:!1};return e[r].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}var n={};return t.m=e,t.c=n,t.p="",t(0)}([function(e,t,n){e.exports=n(1)},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(4),s=n(12),u=e.exports=function(e){"string"==typeof e&&(e=o.merge({url:arguments[0]},arguments[1])),e=o.merge({method:"get",headers:{},timeout:r.timeout,transformRequest:r.transformRequest,transformResponse:r.transformResponse},e),e.withCredentials=e.withCredentials||r.withCredentials;var t=[i,void 0],n=Promise.resolve(e);for(u.interceptors.request.forEach(function(e){t.unshift(e.fulfilled,e.rejected)}),u.interceptors.response.forEach(function(e){t.push(e.fulfilled,e.rejected)});t.length;)n=n.then(t.shift(),t.shift());return n};u.defaults=r,u.all=function(e){return Promise.all(e)},u.spread=n(13),u.interceptors={request:new s,response:new s},function(){function e(){o.forEach(arguments,function(e){u[e]=function(t,n){return u(o.merge(n||{},{method:e,url:t}))}})}function t(){o.forEach(arguments,function(e){u[e]=function(t,n,r){return u(o.merge(r||{},{method:e,url:t,data:n}))}})}e("delete","get","head"),t("post","put","patch")}()},function(e,t,n){"use strict";var r=n(3),o=/^\)\]\}',?\n/,i={"Content-Type":"application/x-www-form-urlencoded"};e.exports={transformRequest:[function(e,t){return r.isFormData(e)?e:r.isArrayBuffer(e)?e:r.isArrayBufferView(e)?e.buffer:!r.isObject(e)||r.isFile(e)||r.isBlob(e)?e:(r.isUndefined(t)||(r.forEach(t,function(e,n){"content-type"===n.toLowerCase()&&(t["Content-Type"]=e)}),r.isUndefined(t["Content-Type"])&&(t["Content-Type"]="application/json;charset=utf-8")),JSON.stringify(e))}],transformResponse:[function(e){if("string"==typeof e){e=e.replace(o,"");try{e=JSON.parse(e)}catch(t){}}return e}],headers:{common:{Accept:"application/json, text/plain, */*"},patch:r.merge(i),post:r.merge(i),put:r.merge(i)},timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN"}},function(e,t){"use strict";function n(e){return"[object Array]"===v.call(e)}function r(e){return"[object ArrayBuffer]"===v.call(e)}function o(e){return"[object FormData]"===v.call(e)}function i(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer}function s(e){return"string"==typeof e}function u(e){return"number"==typeof e}function a(e){return"undefined"==typeof e}function f(e){return null!==e&&"object"==typeof e}function c(e){return"[object Date]"===v.call(e)}function p(e){return"[object File]"===v.call(e)}function l(e){return"[object Blob]"===v.call(e)}function d(e){return e.replace(/^\s*/,"").replace(/\s*$/,"")}function h(e){return"[object Arguments]"===v.call(e)}function m(){return"undefined"!=typeof window&&"undefined"!=typeof document&&"function"==typeof document.createElement}function y(e,t){if(null!==e&&"undefined"!=typeof e){var r=n(e)||h(e);if("object"==typeof e||r||(e=[e]),r)for(var o=0,i=e.length;i>o;o++)t.call(null,e[o],o,e);else for(var s in e)e.hasOwnProperty(s)&&t.call(null,e[s],s,e)}}function g(){var e={};return y(arguments,function(t){y(t,function(t,n){e[n]=t})}),e}var v=Object.prototype.toString;e.exports={isArray:n,isArrayBuffer:r,isFormData:o,isArrayBufferView:i,isString:s,isNumber:u,isObject:f,isUndefined:a,isDate:c,isFile:p,isBlob:l,isStandardBrowserEnv:m,forEach:y,merge:g,trim:d}},function(e,t,n){(function(t){"use strict";e.exports=function(e){return new Promise(function(r,o){try{"undefined"!=typeof XMLHttpRequest||"undefined"!=typeof ActiveXObject?n(6)(r,o,e):"undefined"!=typeof t&&n(6)(r,o,e)}catch(i){o(i)}})}}).call(t,n(5))},function(e,t){function n(){f=!1,s.length?a=s.concat(a):c=-1,a.length&&r()}function r(){if(!f){var e=setTimeout(n);f=!0;for(var t=a.length;t;){for(s=a,a=[];++c<t;)s&&s[c].run();c=-1,t=a.length}s=null,f=!1,clearTimeout(e)}}function o(e,t){this.fun=e,this.array=t}function i(){}var s,u=e.exports={},a=[],f=!1,c=-1;u.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];a.push(new o(e,t)),1!==a.length||f||setTimeout(r,0)},o.prototype.run=function(){this.fun.apply(null,this.array)},u.title="browser",u.browser=!0,u.env={},u.argv=[],u.version="",u.versions={},u.on=i,u.addListener=i,u.once=i,u.off=i,u.removeListener=i,u.removeAllListeners=i,u.emit=i,u.binding=function(e){throw new Error("process.binding is not supported")},u.cwd=function(){return"/"},u.chdir=function(e){throw new Error("process.chdir is not supported")},u.umask=function(){return 0}},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(7),s=n(8),u=n(9);e.exports=function(e,t,a){var f=u(a.data,a.headers,a.transformRequest),c=o.merge(r.headers.common,r.headers[a.method]||{},a.headers||{});o.isFormData(f)&&delete c["Content-Type"];var p=new(XMLHttpRequest||ActiveXObject)("Microsoft.XMLHTTP");if(p.open(a.method.toUpperCase(),i(a.url,a.params),!0),p.timeout=a.timeout,p.onreadystatechange=function(){if(p&&4===p.readyState){var n=s(p.getAllResponseHeaders()),r=-1!==["text",""].indexOf(a.responseType||"")?p.responseText:p.response,o={data:u(r,n,a.transformResponse),status:p.status,statusText:p.statusText,headers:n,config:a};(p.status>=200&&p.status<300?e:t)(o),p=null}},o.isStandardBrowserEnv()){var l=n(10),d=n(11),h=d(a.url)?l.read(a.xsrfCookieName||r.xsrfCookieName):void 0;h&&(c[a.xsrfHeaderName||r.xsrfHeaderName]=h)}if(o.forEach(c,function(e,t){f||"content-type"!==t.toLowerCase()?p.setRequestHeader(t,e):delete c[t]}),a.withCredentials&&(p.withCredentials=!0),a.responseType)try{p.responseType=a.responseType}catch(m){if("json"!==p.responseType)throw m}o.isArrayBuffer(f)&&(f=new DataView(f)),p.send(f)}},function(e,t,n){"use strict";function r(e){return encodeURIComponent(e).replace(/%40/gi,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}var o=n(3);e.exports=function(e,t){if(!t)return e;var n=[];return o.forEach(t,function(e,t){null!==e&&"undefined"!=typeof e&&(o.isArray(e)&&(t+="[]"),o.isArray(e)||(e=[e]),o.forEach(e,function(e){o.isDate(e)?e=e.toISOString():o.isObject(e)&&(e=JSON.stringify(e)),n.push(r(t)+"="+r(e))}))}),n.length>0&&(e+=(-1===e.indexOf("?")?"?":"&")+n.join("&")),e}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e){var t,n,o,i={};return e?(r.forEach(e.split("\n"),function(e){o=e.indexOf(":"),t=r.trim(e.substr(0,o)).toLowerCase(),n=r.trim(e.substr(o+1)),t&&(i[t]=i[t]?i[t]+", "+n:n)}),i):i}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e,t,n){return r.forEach(n,function(n){e=n(e,t)}),e}},function(e,t,n){"use strict";var r=n(3);e.exports={write:function(e,t,n,o,i,s){var u=[];u.push(e+"="+encodeURIComponent(t)),r.isNumber(n)&&u.push("expires="+new Date(n).toGMTString()),r.isString(o)&&u.push("path="+o),r.isString(i)&&u.push("domain="+i),s===!0&&u.push("secure"),document.cookie=u.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}},function(e,t,n){"use strict";function r(e){var t=e;return s&&(u.setAttribute("href",t),t=u.href),u.setAttribute("href",t),{href:u.href,protocol:u.protocol?u.protocol.replace(/:$/,""):"",host:u.host,search:u.search?u.search.replace(/^\?/,""):"",hash:u.hash?u.hash.replace(/^#/,""):"",hostname:u.hostname,port:u.port,pathname:"/"===u.pathname.charAt(0)?u.pathname:"/"+u.pathname}}var o,i=n(3),s=/(msie|trident)/i.test(navigator.userAgent),u=document.createElement("a");o=r(window.location.href),e.exports=function(e){var t=i.isString(e)?r(e):e;return t.protocol===o.protocol&&t.host===o.host}},function(e,t,n){"use strict";function r(){this.handlers=[]}var o=n(3);r.prototype.use=function(e,t){return this.handlers.push({fulfilled:e,rejected:t}),this.handlers.length-1},r.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},r.prototype.forEach=function(e){o.forEach(this.handlers,function(t){null!==t&&e(t)})},e.exports=r},function(e,t){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}}])});
//# sourceMappingURL=axios.min.map
},{}]},{},[1]);
