(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//global object initialization
var globalObject = window;

/*
try {
    if (window) {
        globalObject = window;
    }
}
catch (e) {
    globalObject = global;
}*/

globalObject.sweva = {};

globalObject.sweva.axios = require('../../bower_components/axios/dist/axios.min.js');

var Ajv = require('../../node_modules/ajv/lib/ajv.js');
globalObject.sweva.Ajv = new Ajv();

var ComposableLoader = require('./execution/composableLoader.js');
globalObject.sweva.ComposableLoader = new ComposableLoader('');

globalObject.sweva.ExecutionManager = require('./execution/executionManager.js');

var ErrorManager = require('./errors/errorManager.js');
globalObject.sweva.ErrorManager = new ErrorManager();

var SwevaScript = require('./swevaScript/swevaScript.js');
globalObject.sweva.SwevaScript = new SwevaScript();

globalObject.sweva.libs = {
    axios: globalObject.sweva.axios,
    get: globalObject.sweva.SwevaScript.get,
    set: globalObject.sweva.SwevaScript.set
}

//settings
globalObject.sweva.settings = {
    enableSandboxing: true
}


},{"../../bower_components/axios/dist/axios.min.js":12,"../../node_modules/ajv/lib/ajv.js":13,"./errors/errorManager.js":6,"./execution/composableLoader.js":9,"./execution/executionManager.js":10,"./swevaScript/swevaScript.js":11}],2:[function(require,module,exports){
'use strict';

var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');
var Clone = require('../../../node_modules/clone/clone.js');

/**
 * Composables process data. They can be linked into networks.
 * @abstract
 * @constructor
 */
function Composable() {
}
/**
 * A definition of a JSON object.
 * @see {@link http://json-schema.org/documentation.html}
 * @typedef {Object} JSONSchema
 */

/**
 * The initalization object with optional properties to initialize composables.
 * @typedef {Object} composableInitalizer
 * @property {string} [name=someComposable] - The name of the composable.
 * @property {string} [type=module] - The type of the composable: 'module' or 'composition'.
 * @property {JSONSchema} [dataInSchema=null] - The schema of the expected data object received from other composables.
 * @property {JSONSchema} [dataOutSchema=null] - The schema of the data object passed on to later composables.
 * @property {JSONSchema} [inputSchema=null] - The schema of the input object received at the beginning of exection.
 * @property {Array.<string>} [dataInNames=['data']] - The names of the expected properties of the received data object.
 * If there is only one element, the array is ignored and the whole data object is taken (no property names needed).
 * Multiple properties are needed, if you want to receive data from multiple other composables.
 *
 * @property {Array.<string>} [dataOutNames=['result']] - The names of the expected properties of the produced data object.
 * If there is only one element, the array is ignored and the whole data object is taken (no property names needed).
 * Multiple properties are needed, if you want to send data to multiple other composables.
 *
 * @property {Array.<string>} [inputNames=[]] - The names of the expected properties of the input object.
 * If there is only one element, the array is ignored and the whole input object is taken (no property names needed).
 */

/** Initializes the object with a property object.
  * Not defined Properties will get a default value.
 *  @protected
 *  @param {composableInitalizer} initializationObject - The object with optional properties for the composable.
 */
Composable.prototype.initialize = function (initializationObject) {
    this.initializeProperty(initializationObject, 'name', 'someComposable');
    this.initializeProperty(initializationObject, 'type', 'module');
    this.initializeProperty(initializationObject, 'dataInSchema', null);
    this.initializeProperty(initializationObject, 'dataOutSchema', null);
    this.initializeProperty(initializationObject, 'inputSchema', null);

    this.initializeProperty(initializationObject, 'dataInNames', []);
    this.initializeProperty(initializationObject, 'dataOutNames', []);
    this.initializeProperty(initializationObject, 'inputNames', []);

    /**
     * Amount of expected properties for the received data object.
     * @name Composable#dataIn
     * @type {number}
     */
    this.dataIn = this.dataInNames.length;

    /**
    * Amount of expected properties for the produced data object.
    * @name Composable#dataOut
    * @type {number}
    */
    this.dataOut = this.dataOutNames.length;

    /**
    * Amount of expected properties for the received input object
    * @name Composable#inputIn
    * @type {number}
    */
    this.inputIn = this.inputNames.length;

    /**
    * The context of the composable used for error messages.
    * @name Composable#context
    * @type {number}
    */
    this.context = this.constructor.name + '[' + this.name + ']';
}

/**
 * Helper function to initialize internal variables. Sets also default values.
 * @protected
 * @param {composableInitalizer} initializationObject - The object with optional properties for the composable.
 * @param {string} property - The property value to set. The name must be the same both for 'this' and initializationObject.
 * @param {string} defaultValue - A default value is set, if initializationObject does not contain such a property key.
 */
Composable.prototype.initializeProperty = function (initializationObject,
    property, defaultValue) {
    if (initializationObject.hasOwnProperty(property)) {
        var obj = initializationObject[property];
        if (typeof obj === 'object') {
            if (Array.isArray(obj)) {
                if (obj.length == 0) {
                    this[property] = defaultValue;
                    return;
                }
            }
            else if (Object.keys(obj).length == 0){
                this[property] = defaultValue;
                return;
            }
        }
        this[property] = initializationObject[property];
    } else {
        this[property] = defaultValue;
    }
}

/**
 * Helper function to initialize internal functions. Sets also default values.
 * @protected
 * @param {composableInitalizer} initializationObject - The object with optional properties for the composable.
 * @param {string} property - The property value to set. The name must be the same both for 'this' and initializationObject.
 * @param {number} expectedArgumentsCount - The amount of arguments the expected function needs to have. On mismatch an error is thrown.
 * @param {function} defaultValue - A default value is set, if initializationObject does not contain such a property key.
 */
Composable.prototype.initializeFunction = function (initializationObject,
    property, expectedArgumentsCount, defaultValue) {
    if (initializationObject.hasOwnProperty(property)) {
        //check if it is really a function
        if (typeof initializationObject[property] === 'function') {
            //the expected functions (which can be defined by the composable creators) have a fixed signature (arguments),
            //so check here for validation.
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
        else if (initializationObject[property] == null) {
            // for now ignore, as some functions are optional
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
/**
 * Clones the current composable and overwrites/adds all the properties specified in an extender object.
 * This allows some sort of composable inheritance.
 * @this Composable
 * @param {Composable} extender - The partial composable from which to take the new values.
 * @returns {Composable} The cloned and extended composable object.
 */
Composable.prototype.extendWith = function (extender) {
    var cloned = Clone(this);
    for (var key in extender) {
        //we don't want to clone 'extends' as it is an indicator, that a composable wants to extend another. I.e. What we are doing here :)
        if (extender.hasOwnProperty(key) && key != 'extends') {
            cloned[key] = extender[key];
        }
    }
    return cloned;
}
/**
 * Updates the context during the execution. It uses the parent's context and the alias, the parent has given this composable.
 * looks like: Composition[composition1].Module[module1]
 * @protected
 * @param {string} context - The context of the parent.
 * @param {string} alias - The alias (name) used in the parent for this composable.
 * @returns {string} Updated context.
 */
Composable.prototype.getNewContext = function (context, alias) {
    if (typeof context === 'string') {
        //alias is optional, so check if it is defined
        if (typeof alias !== 'string') {
            alias = '';
        }
        else {
            alias = ': ' + alias;
        }
        return context + '.' + this.constructor.name + '[' + this.name + alias + ']';
    }
    return this.context;
}
/**
 * Validates, if a given object has the expected structure (typecheck) compatible to this composable.
 * If available, it uses the provided JSON schema, otherwise (noch schmema available) it only checks, if the object has all required property keys. Defined by the *Names arrays (see {@link composableInitalizer}).
 * 
 * @param {string} type - Type of object, needed to select the correct type definition. Use 'dataIn', 'dataOut' , 'input' respectively.
 * @param {Object} obj - Object, that should be validated.
 * @returns {boolean} - True, if the object is compatible to this composable regarding the given type.
 */
Composable.prototype.validateTypes = function (type, obj) {
    var typeNames = this[type + 'Names'];
    var typeSchema = this[type + 'Schema'];
    
    //if properties are all present and a schema is provided, we can perform a more detailed check
    if (typeSchema !== null) {
        //use the validator library on the object
        var valid = sweva.Ajv.validate(typeSchema, obj);
        if (!valid) {
            sweva.ErrorManager.error(new ExecutionError('Object does not match the given ' + type + 'Schema: ' + sweva.Ajv.errorsText(sweva.Ajv.errors),
                    this.context, obj));
            return false;
        }
    }

    return true;
}
/**
 * Function to start the data processing. Here only a dummy is defined.
 * @param {Object} data - Tha data object received.
 * @param {Object} input - The input object received.
 * @return {Promise<number>} - The processed data.
 */
Composable.prototype.execute = function (data, input) {
    return new Promise(function (resolve, reject) {
        resolve(0);
    });
}
module.exports = Composable;
},{"../../../node_modules/clone/clone.js":60,"../errors/definitionError.js":5,"../errors/executionError.js":7}],3:[function(require,module,exports){
'use strict';

var Composable = require('./composable.js');
var Module = require('./module.js');
var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');

/**
 * Represents how a composable is linked to another
 * @typedef {Object} linkType
 * @property {string} to - The alias/name of the target composable (i.e. under which key it is defined in the composables dictionary of the composition)
 * @property {string|Object.<string,string>} mapping - How dataOut and dataIn of two composables are mapped to each other.
 * If no mapping is specified, the whole dataOut object is taken as the dataIn object.
 * If a string is specified as a value, it is mapped to the appropriate dataIn property.
 * If a dictionary is specified, the key represents the dataOut property and thevalue the dataIn property it is mapped to.
 * All string values must be using the given values of the dataInNames and dataOutNames arrays defined in the composable.
 */

/**
 * A user defineable function to map the input object of the composition to the input object of individual composables.
 * Basically the function is called for each composable and the return value is then used as its input object.
 * For example you can use an input object, where you specify in detail for every composable the value, then you could simply
 * return input[composableName];
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Composition~mapInputFunction
 * @param {Object} input - The input object given to the composition.
 * @param {string} composableName - The name of the composable requesting an input object.
 * @param {Object.<string,string>} composables - A dictionary of the composables used by the composition.
 * @param {Object} libs - A library object provides access to libs from within the function.
 * @returns {Object} A value to use for the requesting composable as the input object.
 */

/**
 * A user defineable function to map the data object of the composition to the data object of individual composables.
 * Basically the function is called for each composable and the return value is then used as its data object.
 * For example you can use a data object, where you specify in detail for every composable the value, then you could simply
 * return data[composableName];
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Composition~mapDataInFunction
 * @param {Object} data - The data object given to the composition.
 * @param {string} composableName - The name of the composable requesting a data object.
 * @param {Object.<string,string>} composables - A dictionary of the composables used by the composition.
 * @param {Object} libs - A library object provides access to libs from within the function.
 * @returns {Object} A value to use for the requesting composable as the data object.
 */

/**
 * A user defineable function to transform the resulting data object of the data processing pipeline.
 * You could for example add additional properties or remove some, convert values etc.
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Composition~mapDataOutFunction
 * @param {Object} output - The data object produced by the composables without outgoing links (end of data processing).
 * @returns {Object} A value the composition returns as the dataprocessing result.
 */


/**
 * The initalization object with optional properties to initialize composables.
 * @typedef {composableInitalizer} compositionInitalizer
 * @property {Object.<string,string>} [composables={}] - A dictionary of all composables used by the composition. 
 * The key represents the internal alias, the value represents 
 * the composable name, which is used to load the composable information.
 * 
 * @property {Object.<string, Array.<linkType>>} [links={}] - A dictionary describing an edge list of how the composables are linked.
 * The key describes the origin composable, the value describes an array of target composables with mapping information of the data properties.
 * @property {Composition~mapInputFunction} [mapInput] - A function to map the input object of the composition to the input object of individual composables.
 * The default requires an input object, where each property corresponds to a composable alias/name and maps the value of the property to this composable input.
 * @property {Composition~mapDataInFunction} [mapDataIn] - A function to map the data object of the composition to the data object of individual composables.
 * The default requires a data object, where each property corresponds to a composable alias/name and maps the value of the property to this composable data.
 * @property {Composition~mapDataOutFunction} [mapDataOut] - A function to transform the resulting data object of the composition, before making it available.
 * The default does not change the output object.
 */

/**
 * A composition can consist of multiple other compositions or composables.
 * It orchistrates the execution of the composables.
 * @constructor
 * @extends Composable
 * @param {compositionInitalizer} initializationObject - The object with optional properties for the composition.
 * 
 */
function Composition(initializationObject) {
    this.initializeProperty(initializationObject, 'composables', {});
    this.initializeProperty(initializationObject, 'links', {});

    this.initializeFunction(initializationObject, 'mapInput', 4, function (input, composableName, composables, libs) {
        if (input.hasOwnProperty(composableName)) {
            return input[composableName];
        }
        return null;
    });

    this.initializeFunction(initializationObject, 'mapDataIn', 4, function (data, composableName, composables, libs) {
        if (data.hasOwnProperty(composableName)) {
            return data[composableName];
        }
        return null;
    });

    this.initializeFunction(initializationObject, 'mapDataOut', 2, function (output, libs) {
        return output;
    });
    //call to the parent class initalization function
    this.initialize(initializationObject);

    /**
    * Indicates, if the composition is ready to use. This is important, as required composables might need to be loaded first.
    * @protected
    * @name Composition#isReady
    * @type {boolean}
    */
    this.isReady = false;
}
//inherit properties
Composition.prototype = Object.create(Composable.prototype);

/**
 * This function starts to recursively load composables required by this composition.
 * See {@link ComposableLoader} for more details on he loading process.
 * When finished all required composables are in memory and can be used.
 * As loading is async it returns a promise. 
 * @returns {Promise<void>} An empty promise, signaling that everything was loaded.
 */
Composition.prototype.loadComposables = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        //collects an array of loading promises, which is then filled
        var promises = [];
        for (var key in self.composables) {
            if (self.composables.hasOwnProperty(key)) {
                //for each required composable the composable is loaded using the specified name of it
                //the name itself acts as a part of a URL
                //a reference to the composables dictionary of the composition is passed, so the
                //string values (names) of the required compositions are later replaced with the comosition objects,
                //which can then be used
                if (typeof self.composables[key] === 'string') {
                    promises.push(sweva.ComposableLoader.load(self.composables[key], self.composables, key));
                }
                else { //otherwise create from given object directly
                    var type = self.composables[key].type;
                    if(type=='module'){
                        self.composables[key] = new Module(self.composables[key]);
                    }
                    else {
                        self.composables[key] = new Composition(self.composables[key]);
                    }
                    
                }
                
            }
        }
        //invoke all promises and wait for them to finish
        Promise.all(promises).then(function () {
            //when all promises are finished, all components are loaded, so the composition is ready to be used
            self.isReady = true;

            //important: as we are dealing here with async operations, one might try to execute the composition, before
            //it is ready to be used. In this case the execution is delayed and indicated (wantsToExecute=true)
            //now if the loading is finished, it can directly start the execution directly itself, using the provided callback
            //no polling needed :)
            if (self.wantsToExecute) {
                self.wantsToExecute = false;
                self.executeStarterCallback();
            }
            
           
            //ok all loaded, now we can analyze graph and check for compatibility
            self.analyzeLinkGraph();
           
            //indicate to the outside, that we are done with everything and the composition can be used
            resolve();
        })
        .catch(function (error) {
            sweva.ErrorManager.error(
                       new ExecutionError('Could not load all composables: ' + error,
                       self.context, self.composables));
            
        });
    });
}
/**
 * Checks, if all the data a composable requires is already available.
 * As composables are executed in a graph, some composables depend on the calculations of others and have to wait for the data.
 * 
 * For this purpose, the {@link Composable#dataIn} property is used as a count, that has to be reached
 * by the amount of properties stored for this composable in {@links Composition#parameters}.
 * @protected
 * @param {string} composableName - The alias of the composable object, for which the check should be performed.
 * @returns {boolean} true, if all data required for the composable is available.
 */
Composition.prototype.hasParameters = function (composableName) {
    //how many parameters does the composable need?
    
    var parametersNeeded = [];
    if(typeof this.composables[composableName].dataInConnected !== 'undefined') {
        parametersNeeded = Object.keys(this.composables[composableName].dataInConnected);
    }
    
    
    //if it does not need any, we are good here
    if (parametersNeeded.length == 0) {
        return true;
    }
    
    //if we are still here, it needs at least one
    if (this.parameters.hasOwnProperty(composableName)) {
       
        
        //not enough
        for (var i = 0; i < parametersNeeded.length; i++) {
            var parameter = parametersNeeded[i];
            
            if (typeof this.parameters[composableName][parameter] === 'undefined') {
                return false;
            }
        }
        return true;
        
    }
    return false;
}

/**
 * Adds new data to the available pool other composables use.
 * This allows dependant composables to fetch the data and start execution.
 * It saves the data as a subkey of a subkey of {@links Composition#parameters}:
 * this.parameters[composable][property] = value
 * @protected
 * @param {string} composableName - The alias of the composable object for which the data is intended.
 * @param {string} property - The property name to save the data as, the value must correspond to a value defined
 * in {@links Composable#dataInNames} (we need correct mapping).
 * @param {Object|boolean|string|number} value - The value of the data to add.
 */
Composition.prototype.addParameter = function (composableName, property, value) {
    //if no key for composable present, create one
    if (!this.parameters.hasOwnProperty(composableName)) {
        this.parameters[composableName] = {};
    }

    this.parameters[composableName][property] = value;
}

/**
 * Resets the composition, so it can be executed again.
 * @protected
 */
Composition.prototype.reset = function () {
    this.parameters = {};    
    this.output = {};
    this.unlcearedComposables = [];
    for (var key in this.composables) {
        if (this.composables.hasOwnProperty(key)) {
            this.unlcearedComposables.push({
                composable: key,
                cleared: false
            });
        }
    }
    
}

/**
 * Checks, if the composable graph of the composition contains cycles (end therefore is not a DAG).
 * @protected
 * @param {Array.<string>} startingNodeArray - An array with the aliases of all composables, that do not have an incoming edge/link.
 * They are considered as the first nodes, that get executed.
 * @returns {boolean} True, if the graph contains cycles.
 */
Composition.prototype.hasCycles = function (startingNodeArray) {
    var nodes = {};
    var edges = {};

    //first create a copy of the composables in the composition (nodes)
    for (var key in this.composables) {
        if (this.composables.hasOwnProperty(key)) {
            nodes[key] = {}
        }
    }
    //create a copy of the links without mapping information (edges)
    for (var fromNode in this.links) {
        if (this.links.hasOwnProperty(fromNode)) {
            edges[fromNode] = [];

            for (var fromEndpoint in this.links[fromNode]) {
                if (this.links[fromNode].hasOwnProperty(fromEndpoint)) {
                    
                    for (var toNode in this.links[fromNode][fromEndpoint]) {
                        if (this.links[fromNode][fromEndpoint].hasOwnProperty(toNode)) {

                            edges[fromNode].push(toNode);

                        }
                    }

                }
            }
            /*for (var i = 0; i < this.links[key].length; i++) {
                edges[key].push(this.links[key][i].to);
            }*/
        }
    }

    
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
/**
 * Checks, if the schemas of two objects are compatible.
 * Two objects are compatible, if one of them has no schema definition, or if the first schema is identical to the second one in a recursive comparison.
 * @protected
 * @param {string} obj1Name - The name of the first object (from). Only used for error output.
 * @param {string} obj2Name - The name of the second object (to). Only used for error output.
 * @param {JSONSchema} obj1Schema - The schema ofthe first object.
 * @param {JSONSchema} obj2Schema - The schema ofthe second object.
 * @param {string} [mappingFrom] - The relevant property name of the first object (source/from).
 * @param {string} [mappingTo] - The relevant property name of the second object (target/to).
 * @returns {boolean} True, if the object with obj1Schema can be used, where obj2Schema is required. 
 */
Composition.prototype.checkSchemaCompatibility = function (obj1Name, obj2Name, obj1Schema, obj2Schema, mappingFrom, mappingTo) {
    //schemas are optional (null), so give the benefit of the doubt
    if (obj1Schema == null || obj2Schema == null) { 
        return true;
    }
    //use to store error messages
    var error = null;

    //function for recursion, deals with the meta information level (type, properties, required, etc) of the JSONSchema
    //level indicates the poperty chain and is used for error messages
    function metaLevel(level, from, to) {
        //iterate over the target keys (obj2Schema)
        for (var key in to) {
            //the source (obj1Schema) must have all keys the target has
            if (key !== 'items' && key !== 'required' && !from.hasOwnProperty(key)) {
                error = {
                    level: level,
                    message: 'missing property "' + key + '"'
                }
                return false;
            }
            //if we are dealing with an array, proceed to the meta-level
            if (key === 'items' && from.hasOwnProperty(key)) {
                if (!metaLevel(level + '.' + key, from[key], to[key])) {
                    return false;
                }
            }
            //if properties are defined, proceed with the recursion using the propertyLevel
            else if (key === 'properties' && from.hasOwnProperty(key)) {
                if (!propertyLevel(level + '.' + key, from[key], to[key])) {
                    return false;
                }
            }
            //if we get to the required array...
            else if (key === 'required' && from.hasOwnProperty(key)) {
                //special: required array order should be ignored
                from[key].sort();
                to[key].sort();

                //first check if the length is the same
                if (from[key].length != to[key].length) {
                    error = {
                        level: level,
                        message: 'array length different for "' + key + '" ' + from[key].toString() + ' != ' + to[key].toString()
                    }
                    return false;
                }
                //otherwise we need to compare each element
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
            //if we get something else, we compare the values
            //this should be all primitive types, but I'm not sure if I didn't miss any possible non-primitive
            //in the above if-else
            else if (from.hasOwnProperty(key)){
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

    //function for recursion, dealing with the enumeration of property keys of a schema
    function propertyLevel(level, from, to) {
        for (var key in to) {
            //from must have at least all keys to has
            if (!from.hasOwnProperty(key)) {
                error = {
                    level: level,
                    message: 'missing property "' + key + '"'
                }
                return false;
            }
            //continue, by checking the meta-level of each property
            if (!metaLevel(level + '.' + key, from[key], to[key])) {
                return false;
            }
        }
        return true;
    }

    var result = true;
    //helper function, that helps to narrow the scope, if a mappingTo/mappingFrom is given
    //it basically traverses the schema to the desired mapping property and returns it as the new schema
    function scopeOnMapping(schema, mapping) {
        var hasSchema = true;

        if (schema.hasOwnProperty('properties')) {
            if (schema.properties.hasOwnProperty(mapping)) {
                return schema.properties[mapping];
            }
            else {
                return null;
            }
        }

        return schema;
    }

    //copy the original schemas for error output (we might modify our reference later to narrow the scope, but 
    //we still want to show the full schema for the error message
    var OriginalObj1Schema = obj1Schema; 
    var OriginalObj2Schema = obj2Schema;

    //mappings are optional, so scheck if they are defined and narrow the scopes
    if (typeof mappingTo === 'string') {
        var temp = scopeOnMapping(obj2Schema, mappingTo);
        if (temp) {
            obj2Schema = temp;
        }
        else {
            error = {
                level: '',
                message: 'Composable "' + obj2Name + '" has no schema for property "' + mappingTo + '" provided by composable "' + obj1Name + '"'
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
                message: 'Composable "' + obj1Name + '" has no schema for property "' + mappingFrom + '" required by composable "' + obj2Name + '"'
            }
        }
    }

    //if we didn't have an error yet, we can start the recursion
    
    if (!error) {
        result = metaLevel('', obj1Schema, obj2Schema);
    }

    //output an error message
    if (error) {
        var relevantMapping = '';
        if (typeof mappingFrom === 'string' && typeof mappingTo === 'string') {
            relevantMapping = ' for the mapping "' + mappingFrom + '" -> "' + mappingTo + '"';
        } else if (typeof mappingTo === 'string') {
            relevantMapping = ' for the mapping "' + mappingTo + '"';
        }

        var faultyObject = {};
        faultyObject[obj1Name] = OriginalObj1Schema;
        faultyObject[obj2Name] = OriginalObj2Schema;
        

        sweva.ErrorManager.error(
                      new DefinitionError('Schemas of "' + obj1Name + '" and "' + obj2Name + '" incompatible' + relevantMapping + ': '
            + error.level + ': ' + error.message,
                      this.context, faultyObject));
    }
    return result;
}
/**
 * Statically analyzes the graph before execution.
 * Checks for compatability of composables, absence of cycles in the linkage definition etc.
 * @protected
 */
Composition.prototype.analyzeLinkGraph = function () {
    /**
     * False, if no errors in the link graph definition were detected.
     * @protected
     * @name Composition#invalidLinkGraph
     * @type {boolean}
     */
    this.invalidLinkGraph = false;
    /**
     * Array of all the aliases of the composables, that have no ingoing link, i.e. the 'start'
     * @protected
     * @name Composition#startingComposables
     * @type {Array.<string>}
     */
    this.startingComposables = Object.keys(this.composables);
    /**
    * Dictionary of all the aliases of the composables, that have no outgoing link, i.e. the 'end'
    * Dictionary, because there will be some lookups of the key values later on.
    * @protected
    * @name Composition#startingComposables
    * @type {Object.<string,string>}
    */
    this.endingComposables = {};
    for (var key in this.composables) {
        if (this.composables.hasOwnProperty(key)) {
            this.endingComposables[key] = true;
        }
    }

    //find startingComposables that have no ingoing edges
    //find endingComposables that have no outgoing edges
   

    for (var fromNode in this.links) {
        if (this.links.hasOwnProperty(fromNode)) {
           

            for (var fromEndpoint in this.links[fromNode]) {
                if (this.links[fromNode].hasOwnProperty(fromEndpoint)) {

                    for (var toNode in this.links[fromNode][fromEndpoint]) {
                        if (this.links[fromNode][fromEndpoint].hasOwnProperty(toNode)) {
                            var toEndpoint = this.links[fromNode][fromEndpoint][toNode];
                            //check if linking to existing composable!
                            if (!this.composables.hasOwnProperty(toNode)) {
                                sweva.ErrorManager.error(
                                  new DefinitionError('Composable "' + fromNode + '" links to undefined composable "' + toNode + '"!',
                                  this.context, Object.keys(this.composables)));
                                this.invalidLinkGraph = true;
                            }
                            else {    
                                //composable has no such dataOut, it tries to map to another composable
                                if (this.composables[fromNode].dataOutNames.indexOf(fromEndpoint) < 0) {
                                    sweva.ErrorManager.error(
                                         new DefinitionError('Composable "' + fromNode + '" maps undefined dataOut "' + fromEndpoint + '" to composable "' + toNode + '"!',
                                         this.context, this.composables[fromNode].dataOutNames));
                                    this.invalidLinkGraph = true;
                                    break;
                                }

                                //composable has no such dataIn
                                if (this.composables[toNode].dataInNames.indexOf(toEndpoint) < 0) {
                                    sweva.ErrorManager.error(
                                         new DefinitionError('Composable "' + fromNode + '" links to undefined dataIn "' + toEndpoint + '" of composable "' + toNode + '"!',
                                         this.context, this.composables[toNode].dataInNames));
                                    this.invalidLinkGraph = true;
                                    break;
                                }
                                //additionally check for schema compatibility (optional)
                                if (this.composables[fromNode].dataOutSchema && this.composables[toNode].dataInSchema != null) {//schemas are optional, so only check if available
                                    var compatibleSchemas = this.checkSchemaCompatibility(fromNode, toNode, this.composables[fromNode].dataOutSchema, this.composables[toNode].dataInSchema,fromEndpoint, toEndpoint);
                                    if (!compatibleSchemas) {
                                        this.invalidLinkGraph = true;
                                        break;
                                    }
                                }
                                if (typeof this.composables[toNode].dataInConnected === 'undefined') {
                                    this.composables[toNode].dataInConnected = {};
                                }
                                this.composables[toNode].dataInConnected[toEndpoint] = true;

                            }
                            //if one composable A points to composable B, then B cannot be startingComposable
                            var propIndex = this.startingComposables.indexOf(toNode);
                            if (propIndex >= 0) {
                                this.startingComposables.splice(propIndex, 1);
                            }
                            //if one composable A points to composable B, then A cannot be endingComposable
                            
                            if (this.endingComposables.hasOwnProperty(fromNode)) {
                                delete this.endingComposables[fromNode]
                            }

                        }
                    }
                }
            }           
        }
    }


    

    //check for cycles
    var hasCycles = this.hasCycles(this.startingComposables);
    if (hasCycles) {
        sweva.ErrorManager.error(
                       new DefinitionError('There are cycles in the linkage of composables!',
                       this.context, this.links));
        this.invalidLinkGraph = true;
    }

    //extract implicit information
    this.dataIn = this.startingComposables.length;
    this.dataOut = Object.keys(this.endingComposables).length;

    this.dataInNames = [];
    this.dataOutNames = [];

    for (var i = 0; i < this.startingComposables.length; i++) {
       
        if (this.composables[this.startingComposables[i]].dataInNames.length>0) {
            this.dataInNames.push(this.startingComposables[i]);
        }        
    }
    for (var key in this.endingComposables) {
        if (this.endingComposables.hasOwnProperty(key)) {
            this.dataOutNames.push(key);
        }
    }
    
}
/**
 * Recursive function that executes all composables, as soon as they can be executed (have all required data available)
 * @param {string} context - Information about the execution context, see {@link Composable#context}
 * @protected
 */
Composition.prototype.composableQueueExecution = function (context) {
    
    //keep an array of all composables
    //executed composables get marked
    for (var i = 0; i < this.unlcearedComposables.length; i++) {

        //skip already executed composables
        if (this.unlcearedComposables[i].cleared) {
            continue;
        }
        
        var composableName = this.unlcearedComposables[i].composable;

        
       
        var data = null;
        var input = null;
        
        //check if composable has all data it depends on available
        
        if (this.hasParameters(composableName)) {
            
            //fill data and input for next composable call
            data = this.parameters[composableName];
           
            input = this.mapInput(this.input, composableName, this.composables, sweva.libs);
          
        }
        else {
            continue;
        }

        //not continued = composableName can be executed (has data vailable)
        var self = this;
       
        //closure function, to get the current composable for each function
        var func = function (composableName) {
            return function (output) {
                
                //check if composable does not provide data to other composables (end of execution chain)
                if (self.endingComposables.hasOwnProperty(composableName)) {
                    
                    var allCleared = true;
                    //if we have only one output composable, we do not need a named property,
                    //otherwise create a property using the ending-composable alias
                    if (Object.keys(self.endingComposables).length > 1) {
                        self.output[composableName] = output;
                    }
                    else {
                        self.output = output;
                    }

                    //check if this was the last composable (all have been executed)
                    for (var k = 0; k < self.unlcearedComposables.length; k++) {
                        if (!self.unlcearedComposables[k].cleared) {
                            allCleared = false;
                        }
                    }
                    //if this was the last endingComposable, finish
                    if (allCleared) {
                        self.executeFinishedCallback();
                    }                    
                }
                //if composable provides data to other composables 
                else {
                   
                    
                    if (self.links[composableName]) {

                        for (var fromEndpoint in self.links[composableName]) {
                            if (self.links[composableName].hasOwnProperty(fromEndpoint)) {

                                for (var toNode in self.links[composableName][fromEndpoint]) {
                                    if (self.links[composableName][fromEndpoint].hasOwnProperty(toNode)) {
                                        var toEndpoint = self.links[composableName][fromEndpoint][toNode];
                                            self.addParameter(toNode, toEndpoint, output[fromEndpoint]);                                            
                                    }
                                }
                            }
                        }                            
                    }
                    
                    
                    
                }
                //recursive execution of the next composables, as this one just finished and probably resolved some data dependencies
                //console.log(self.parameters)
                self.composableQueueExecution.apply(self, [context]);
            }
        };
        //mark composable as cleared
        if (!this.unlcearedComposables[i].cleared) {
            this.unlcearedComposables[i].cleared = true;
           
            //execute composable
            this.composables[composableName].execute(data, input, context, composableName, this.progress)
                .then(
                func(composableName))
                .catch(function (error) {
                    //error is logged earlier, but how to handle?
                });
        }

       
    }
}
/**
 * Starts execution of the composable, initializes required data. Use this function if you want to execute a composable!
 * @param {Object} data - The data relevant to the processing.
 * @param {Object} input - Input information on how to process the data.
 * @param {string} context - Execution context. See {@link Composable#context}.
 * @param {string} [alias] - Name, under which the composable is known to its parent.
 * @param {function} [progress] - Callback for progress tracking, gets called every time a module finishes execution.
 */
Composition.prototype.execute = function (data, input, context, alias, progress) {
    
    var self = this;
    this.data = data;
    this.input = input;
    context = this.getNewContext(context, alias);
    this.reset();
    
    this.progress = progress;
    
    //return a promise, since execution is async
    return new Promise(function (resolve, reject) {
        //do not bother executing, if link graph definition is invalid, or the provided data or input object do not match the provided schema definitions
        if (!self.invalidLinkGraph && self.validateTypes('dataIn', data) && self.validateTypes('input', input)) {
            //each starting composable has an own data part
            //use user-definable {@link Composition~mapDataInFunction} to map the data to the starting composables
            for (var i = 0; i < self.startingComposables.length; i++) {
                var composableName = self.startingComposables[i];               
                self.parameters[composableName] = self.mapDataIn(self.data, composableName, self.composables, sweva.libs);
            }
            
            //define callback for when execution is finished
            self.executeFinishedCallback = function (error) {
                if (error) {
                    sweva.ErrorManager.error(
                       new ExecutionError('Something unexpected happened: ' + error,
                       context, error));
                    reject(sweva.ErrorManager.getLastError());
                }
                //if there is no error
                else {
                    //use user-definable {@link Composition~mapDataOutFunction} to create the final output object
                    var result = self.mapDataOut(self.output, sweva.libs);
                    //validate output using provided schema
                    if (self.validateTypes('dataOut', result)) {
                        resolve(result);
                    }
                    else {
                        reject(sweva.ErrorManager.getLastError());
                    }
                }
            }
            //all composables are loaded, so execution can start directly
            if (self.isReady) {
                self.composableQueueExecution.apply(self, [context]);
            }
                //delay execution to {@link Composition#loadComposables}
            else {
                //we want to execute, but cannot: tell so the initialization/loading part
                self.wantsToExecute = true;
                //execute via callback, as soon as loading finished
                self.executeStarterCallback = function () { 
                    self.composableQueueExecution.apply(self, [context]);
                }
            }
        }
        else {
            reject(sweva.ErrorManager.getLastError());
        }
    });
}

module.exports = Composition;
},{"../errors/definitionError.js":5,"../errors/executionError.js":7,"./composable.js":2,"./module.js":4}],4:[function(require,module,exports){
'use strict';

var Composable = require('./composable.js');
var DefinitionError = require('../errors/definitionError.js');
var ExecutionError = require('../errors/executionError.js');

/**
 * A user defineable function to create a HTTP request as a promise. It is used to call a remote service using its API.
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Module~requestFunction
 * @param {Object} data - The data object given to the module.
 * @param {Object} input - The input object given to the module.
 * @param {Object} libs - An object allowing access to libraries inside the function.
 */

/**
 * A user defineable function to handle errors from failed service calls.
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Module~requestErrorFunction
 * @param {Object} response - The response object from the service call.
 * @param {Object} input - The input object given to the module.
 * @param {Object} libs - An object allowing access to libraries inside the function.
 */


/**
 * A user defineable function to transform the response of the service.
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Module~requestErrorFunction
 * @param {Object} response - The response object from the service call.
 * @param {Object} input - The input object given to the module.
 * @param {Object} libs - An object allowing access to libraries inside the function.
 */

/**
 * A user defineable function to do all computation locally, no service is called.
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Module~computeFunction
 * @param {Object} data - The data object given to the module.
 * @param {Object} input - The input object given to the module.
 * @param {Object} libs - An object allowing access to libraries inside the function.
 */



/**
 * The initalization object with optional properties to initialize modules.
 * @typedef {composableInitalizer} moduleInitalizer
 * @property {Module~requestFunction} [request] - Creates a HTTP request to call the appropriate service.
 * @property {Module~requestErrorFunction} [request] - If this function is provided, it is used to handle errors, if the service call was unsuccessful.
 * @property {Module~responseFunction} [request] - Function to transform the the service response to be used later on.
 * @property {Module~computeFunction} [request] - If provided, no service is called, but all computation is performed locally in this function.
 * 
 */

/**
 * A module is the smallest unit of execution. 
 * It serves as an envelope to a service call and can optionally do all computations locally wihtout a remote service.
 * @constructor
 * @extends Composable
 * @param {moduleInitalizer} initializationObject - The object with optional properties for the composition.
 * 
 */
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
        function (response, input, libs) {           
            var obj = {};
            obj[this.dataOutNames[0]] = response.data;
            return obj;
        });

    this.initializeFunction(initializationObject, 'compute', 3, null);
}
//inherit properties
Module.prototype = Object.create(Composable.prototype);
Module.prototype.constructor = Module;

/**
 * Calls the service using the created HTTP request received from {@link Module~requestFunction}.
 * 
 * @protected
 * @param {Promise} request - The async service call.
 * @param {Object} input - The data input object given to the module.
 * @returns {Promise} - A promise with the response object.
 */
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
/**
 * Executes the module, i.e. performs the computation either by calling a service or locally.
 * @param {Object} data - The data relevant to the processing.
 * @param {Object} input - Input information on how to process the data.
 * @param {string} context - Execution context. See {@link Composable#context}.
 * @param {string} [alias] - Name, under which the composable is known to its parent.
 * @param {function} [progress] - Callback for progress tracking, gets called every time a module finishes execution.
 */
Module.prototype.execute = function (data, input, context, alias, progress) {
    var self = this;
    context = this.getNewContext(context, alias);

    if (input == null) {
        input = {};
    }
    return new Promise(function (resolve, reject) {
       
        //only execute, if data and input objects are valid according to the optional schamas
        if (self.validateTypes('dataIn', data) && self.validateTypes('input', input)) {
            
            //if a computation function is defined, then skip service calls and compute locally
            if (typeof self.compute === 'function') {
                var result = self.compute(data, input, sweva.libs);
                if (self.validateTypes('dataOut', result)) {
                    //report progress, if callback is defined
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
                //call service using the HTTP request
                self.callService(self.request(data, input, sweva.libs), input).then(function (output) {

                    //validate output
                    if (self.validateTypes('dataOut', output)) {
                        //report progress, if callback is defined
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
},{"../errors/definitionError.js":5,"../errors/executionError.js":7,"./composable.js":2}],5:[function(require,module,exports){
'use strict';

var SwevaError = require('./swevaError.js');
/**
 * A definition error should be used, if  the error occured because of incompatible definitions of composables, i.e. before actual execution.
 * @constructor
 * @extends SwevaError
 */
function DefinitionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'DefinitionError';
}
DefinitionError.prototype = Object.create(SwevaError.prototype);

module.exports = DefinitionError;
},{"./swevaError.js":8}],6:[function(require,module,exports){
'use strict';
/**
 * Aggregates {@link SwevaError} messages.
 * @constructor
 */
function ErrorManager() {
    /**
    * An array storing the error messages.
    * @name ErrorManager#queue
    * @type {Array.<Error>}
    */
    this.queue = [];
}
/**
 * Resets the ErrorManager.
 */
ErrorManager.prototype.clear = function () {
    this.queue = [];
}
/**
 * Appends errors to the internal queue, logs them and returns the error object
 * @param {Error} error - The error object.
 * @returns {Error} - The error object.
 */
ErrorManager.prototype.error = function (error) {
    this.queue.push(error);
    console.log(error.toString());
    console.log(error);
    return error;
}
/**
 * Gets a string representation of all stored errors.
 * @returns {string} - All stored errors separated by a linebreak.
 */
ErrorManager.prototype.getLog = function () {
    var result = '';
    for (var i = 0; i < this.queue.length; i++) {
        result += this.queue[i].toString() + '\n';
    }
    return result;
}
/**
 * @returns {Error} - The last error that was recorded.
 */
ErrorManager.prototype.getLastError = function () {
    if (this.queue.length > 0) {
        return this.queue[this.queue.length - 1];
    }
    return null;
}

module.exports = ErrorManager;
},{}],7:[function(require,module,exports){
'use strict';

var SwevaError = require('./swevaError.js');
/**
 * An execution error should be used, if the error occured during execution.
 * @constructor
 * @extends SwevaError
 */
function ExecutionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'ExecutionError';
}
ExecutionError.prototype = Object.create(SwevaError.prototype);

module.exports = ExecutionError
},{"./swevaError.js":8}],8:[function(require,module,exports){
'use strict';

/**
 * An error object with some additional information.
 * @constructor
 * @extends Error
 * @param {string} message - The error message: What went wrong?
 * @param {string} context - The execution context, in what composable did the error occur?
 * @param {Object} [faultyObject] - Additional information about the error cause.
 */
function SwevaError(message, context, faultyObject) {
    /**
    * The name of the error object.
    * @name SwevaError#name
    * @type {string}
    */
    this.name = 'SwevaError';

    /**
    * The error message.
    * @name SwevaError#message
    * @type {string}
    */
    this.message = message || 'Default Message';

    /**
    * The callstack of the error.
    * @name SwevaError#stack
    * @type {Object}
    */
    this.stack = (new Error()).stack;

    /**
    * The execution context of the error (in which composable it occured).
    * @name SwevaError#context
    * @type {string}
    */
    this.context = context;

   
    if (faultyObject !== 'undefined') {
        //shallow copy: should provide enough information and save RAM
        //copy is needed, as we need the object exactly at the time the error occurred
        this.faultyObject = faultyObject;

        if (typeof faultyObject === 'function') {
            //make functions to strings            
            this.faultyObject = faultyObject.toString();
        }
        else if (typeof faultyObject === 'object') {
            for (var key in faultyObject) {
                if (faultyObject.hasOwnProperty(key)) {
                    this.faultyObject[key] = faultyObject[key];
                }
            }
        }
    }
    else {
        this.faultyObject = null;
    }
    /**
    * The timestamp of the error.
    * @name SwevaError#time
    * @type {number}
    */
    this.time = Date.now();
}
//inherit properties
SwevaError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: this.constructor,
        writable: true,
        configurable: true
    }
});
/**
 * @returns {string} - A string representation of the error timestamp.
 */
SwevaError.prototype.getTime = function () {
    return new Date(this.time).toLocaleTimeString();
}

/**
 * Converts error object to string including relevant information (timestamp, name, context, message, additional information).
 * @returns {string} - String representation of the error.
 */
SwevaError.prototype.toString = function () {
    var faultyObject = '';
    if (typeof this.faultyObject === 'object') {
        //transform object to pretty printed string (with identation).
        faultyObject = JSON.stringify(this.faultyObject, null, 4);
    }
    else {
        faultyObject = this.faultyObject.toString();
    }
    //construct string
    return '[' + this.getTime() + '] SwevaError ' + this.name + ' in ' + this.context + ': ' + this.message + '\n'
        + faultyObject;
}
module.exports = SwevaError;
},{}],9:[function(require,module,exports){
'use strict';
//var axios = require('../../../bower_components/axios/dist/axios.min.js');

var Module = require('../composables/module.js');
var Composition = require('../composables/composition.js');
var DefinitionError = require('../errors/definitionError.js');

/**
 * Responsible for dynamically loading composables from a web address.
 * Loaded composables are stored in an internal dictionary, so they only need to be downloaded once.
 * @constructor
 * @param {string} [basePath=''] - The base address from which to download the composable. Gets prepended to the composable name.
 * @param {string} [suffix=.json] - The suffix that gets appended to the composable name.
 */
function ComposableLoader(basePath, suffix) {
    /**
    * The base address from which to download the composable. Gets prepended to the composable name.
    * @name ComposableLoader#basePath
    * @type {string}
    */
    this.basePath = basePath || '';
    /**
    * The suffix that gets appended to the composable name.
    * @name ComposableLoader#suffix
    * @type {string}
    */
    this.suffix = suffix || '';
    /**
    * Dictionary of the composable names and the corresponding composable objects.
    * @name ComposableLoader#composables
    * @type {Object.<string, Composable>}
    */
    this.composables = {};
    /**
    * Dictionary of a waiting list, where loaded composables can be assigned to external objects
    * @name ComposableLoader#waitingList
    * @type {Object.<string, Object>}
    */
    this.waitingList = {};
}

/**
 * @returns {number} - The number of stored composables.
 */
ComposableLoader.prototype.size = function () {
    return Object.keys(this.composables).length;
}
/**
 * @param {string} name - The name of the composable to return.
 * @returns {Composable} - The composable object.
 */
ComposableLoader.prototype.get = function (name) {
    return this.composables[name];
}
/**
 * Composable objects can be directly added, without having to download them.
 * This can be used e.g. for rapid prototyping.
 * @param {string} name - The name of the composable to add.
 * @paranm {Composable} composable - The composable to add.
 */
ComposableLoader.prototype.add = function (name, composable) {
    this.composables[name] = composable;
}
/**
 * Converts a JSON representation of a composable into a full composable object.
 * Since composables can have custom functions defined, and JSON does not support functions, we cannot use JSON.parse.
 * Instead functions are encoded as string arrays in JSON and then assembled.
 * {@link SwevaScript} is used to sanitize the functions.
 *
 * @protected
 * @param {Object} json - The JSON object of the composable.
 * @param {string} context - The context of execution (for error messages).
 * @returns {composableInitalizer} - Composable initalization object.
 */
ComposableLoader.prototype.convertToObject = function (json, context) {
    var result = json;
    var self = this;
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            //reconstruct functions from string
            if (typeof json[key][0] === 'string') {
                var str = new String(json[key][0]);
                //check if string array starts with 'function' -> assemble function into object
                if (str.trim().indexOf('function') == 0) {
                    //first sanitize the script to prevent malicious code execution
                    
                    json[key] = sweva.SwevaScript.sanitize(json[key].join('\n'),
                        function (error) {
                            sweva.ErrorManager.error(
                              new DefinitionError('Could not sanitize function "' + key + '" when loading "' + context + '": ' + error,
                              context, self.convertJsonToCode(json)));
                        });
                }
            }

            if (typeof json[key] === 'object') {
                json[key] = this.convertToObject(json[key], context);
            }
        }
    }

    return result;
}
ComposableLoader.prototype.getDefaultModule = function () {
    return "{\n    type: \'module\',\n    name: \'module1\',\n    description: \'A simple module template.\',\n    dataInNames: ['in'],\n    dataInSchema: {},\n    dataOutNames:[\'result\'],\n    dataOutSchema: {},\n    inputNames: ['input'],\n    inputSchema: {},\n    request: function (data, input, libs) {\n        return libs.axios.get(\'http:\/\/localhost:8080\/example\/calc\/add\/\');\n    },\n    response: function (response, input, libs) {\n        return { result:response.data }\n    }    \n}";
}
ComposableLoader.prototype.getDefaultComposition = function () {
    return "{\n    type: \'composition\',\n    name: \'composition1\',\n    dataInNames: [],\n    dataInSchema: {},\n    dataOutNames:[\'result\'],\n    dataOutSchema: {},\n    inputNames: [],\n    inputSchema: {},\n    mapDataIn: function (data, composableName, composables, libs) {\n        if (data.hasOwnProperty(composableName)) {\n            return libs.get(data, composableName);\n        }\n        return null;\n    },\n    mapDataOut: function (output, libs) {\n        return output;\n    },\n    mapInput: function (input, moduleName, modules, libs) {\n        if (input.hasOwnProperty(moduleName)) {\n            return libs.get(input, moduleName);\n        }\n        return null;\n    }\n}";
}
ComposableLoader.prototype.convertCodeToJson = function (string) {
    
    var result = ''
    var lines = string.split(/\r?\n/);
   
    var regexFunction = new RegExp(/^\s*(\w)+\s*:\s*function/);
    var regexProperty = new RegExp(/^\s*(\w)+\s*/);

    var funcLines = false;
    var funcLinesFirst = false;
    var braceCount = 0;
    var funcLinesJustFinished= false;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();        
        if (!funcLines) {
            if (funcLinesJustFinished && line.indexOf(':') >= 0) {
                funcLinesJustFinished = false;
                result += ',\n';
            }
            if (regexFunction.test(line)) {
                funcLines = true;

                var index = line.indexOf('function');

                var linePart = line.slice(0, index);
                var match = regexProperty.exec(linePart);
                if (match != null) {
                    linePart = linePart.slice(0, match.index) + '"' + linePart.slice(match.index, match.index + match[0].length) + '"' + linePart.slice(match.index + match[0].length);
                }
                linePart = linePart.replace(/'/g, '"');

                result += linePart;

                result += '["' + line.slice(index) + '",\n';
                funcLinesFirst = true;
            }
            else {
                var match = regexProperty.exec(line);
                if (match != null) {
                    line = line.slice(0, match.index) + '"' + line.slice(match.index, match.index + match[0].length) + '"' + line.slice(match.index + match[0].length);
                }
                line = line.replace(/'/g, '"');                
                result += line + '\n';
            }
        }
        if (funcLines) {
            var inQuotes = false;
            var inSingleQuotes = false;
            for (var k = 0; k < line.length; k++) {
                var c = line[k];

                if (c == '"' && !inSingleQuotes) {
                    inQuotes = !inQuotes;
                    line = line.slice(0, k) + '\\' + line.slice(k);
                    k++;
                }
                else if (c == '\'' && !inQuotes) {
                    inQuotes = !inSingleQuotes;
                }
                else if (c == '{' && !inQuotes && !inSingleQuotes) {
                    braceCount++;
                }
                else if (c == '}' && !inQuotes && !inSingleQuotes) {
                    braceCount--;
                }
            }
            if (funcLinesFirst) {
                funcLinesFirst = false;
            }
            else {
                line = line.replace('\\n', '\\\\n');
                if (braceCount == 0) {
                    if (line.length > 0 && line.indexOf(',') >= line.length - 1) {
                        line = line.slice(0, line.length - 1);
                    }
                    result += '"' + line + '"' + '\n';
                }
                else {
                    result += '"' + line + '"' + ',' + '\n';
                }
            }

            if (braceCount == 0) {
                funcLines = false;
                funcLinesFirst = false;
                result += ']\n';
                funcLinesJustFinished=true;
               
            }
        }
    }

    if (result.indexOf('{') !== 0) {
        return '{' + result + '}';
    }

    return result;
}
ComposableLoader.prototype.convertJsonToCode = function (obj) {
    function getSpaces(spaces) {
        var result = '';
        for (var i = 0; i < spaces; i++) {
            result += ' ';
        }
        return result;
    }
    function stringify(object, level, spaces) {
        var result = '';

        var ident = getSpaces(level * spaces);

        var keys = Object.keys(object);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var keyString = (key.indexOf(' ') >= 0) ? ('\'' + key + '\'') : key;
            result += ident + keyString + ': ';
            if (typeof object[key] === 'string') {
                result += '\'' + object[key] + '\'';
            }
            else if (typeof object[key] === 'object') {
                if (Array.isArray(object[key])) {
                    var arrayContent = '';

                    if (object[key].length > 0 && typeof object[key][0] === 'string' && object[key][0].trim().indexOf('function') == 0) {
                        //decode function
                        var internalLevel = 0;
                        for (var k = 0; k < object[key].length; k++) {
                            var line = object[key][k].trim();
                            if (line.indexOf('}') == 0) {
                                internalLevel--;
                                if (internalLevel < 0) {
                                    internalLevel = 0;
                                }
                            }
                            arrayContent += (k == 0 ? '' : ident) + getSpaces(spaces * internalLevel) + line + (k >= object[key].length - 1 ? '' : '\n');
                            if (line.length > 0 && line.indexOf('{') == line.length - 1) {
                                internalLevel++;
                            }
                        }
                        result += arrayContent + ident;
                    }
                    else {
                        for (var k = 0; k < object[key].length; k++) {
                            var element = object[key][k];
                            arrayContent += ident + getSpaces(spaces);
                            if (typeof element === 'string') {
                                arrayContent += '\'' + element + '\'';
                            }
                            else if (typeof element === 'object') {
                                arrayContent += '{\n' + stringify(object[key], level + 1, spaces) + ident + '}';
                            }
                            else {
                                arrayContent += element;
                            }
                            if (k < object[key].length - 1) {
                                arrayContent += ',';
                            }
                            arrayContent += '\n';
                        }
                        result += '[\n' + arrayContent + ident + ']';
                    }
                }
                else {
                    result += '{\n' + stringify(object[key], level + 1, spaces) + ident + '}';
                }
            }

            else {
                result += '\'' + object[key] + '\'';
            }

            if (i < keys.length - 1) {
                result += ',';
            }
            result += '\n';
        }
        return result;
    }
    return '{\n'+stringify(obj, 1, 4)+'}';
}

/**
 * Helper function, that assigns the composables to the internal dictionary and optionally to external objects with a specified property.
 * This can be used to directly fill another external dictionary of composables, like the {@link Composition} composable dictionary.
 * @protected
 * @param {string} name - The name of the composable.
 * @param {Composable} composable - The composable object.
 * @param {Object} [assignToObject] - The external object to wich the composable should be assigned to.
 * @param {string} [property] - The porperty of the external object to wich the composable should be assigned to.
 */
ComposableLoader.prototype.assignLoadedComposables = function (name, composable, assignToObject, property) {
    this.composables[name] = composable;

    //check if the optional assignToObject is given
    if (typeof assignToObject !== 'undefined' && assignToObject !== null && typeof property === 'string') {
        assignToObject[property] = composable;
    }

    //deal with waitinglist: as the caller has to wait for 'then' we, can set the required values now with some delay
    if (this.waitingList.hasOwnProperty(name)) {
        //for each object, that waits for the composable to be assigned to
        for (var i = 0; i < this.waitingList[name].length; i++) {
            var assignTo = this.waitingList[name][i].assignTo;
            var prop = this.waitingList[name][i].prop;

            assignTo[prop] = composable;
        }
        //remove element from the waitingList
        delete this.waitingList[name];
    }
}
/**
 * Loads a composable by the given name from a web resource.
 * If no basePath was given in the constructor, use the full web address as the name.
 * @param {string} name - The name of the composable.
 * @param {Object} [assignToObject] - The external object to wich the composable should be assigned to.
 * @param {string} [property] - The porperty of the external object to wich the composable should be assigned to.
 * @returns {Promise<Composable>} - The loaded composable object.
 */
ComposableLoader.prototype.load = function (name, assignToObject, property) {
    var self = this;

    //return a promise, since loading is ansynchronuous
    return new Promise(function (resolve, reject) {
        //check if the name was already loaded or is currently being loaded
        if (self.composables.hasOwnProperty(name)) {
            //we have only our placeholder, no real value yet
            //this means the composable is currently requested, but not loaded
            if (self.composables[name] === true) {
                //put in waitinglist, which is checked after each load
                //but only, if it needs to be assigned externally
                if (typeof assignToObject !== 'undefined' && assignToObject !== null && typeof property === 'string') {
                    if (!self.waitingList.hasOwnProperty(name)) {
                        self.waitingList[name] = [];
                    }
                    self.waitingList[name].push({
                        assignTo: assignToObject,
                        prop: property
                    });
                }
                //load from dictionary
                resolve(self.composables[name]);
            }
            else {
                if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
                    assignToObject[property] = self.composables[name];
                }
                resolve(self.composables[name]);
            }
        }
            //not already in dictionary, needs to be loaded
        else {
            //set key and prevent unnecessary loads, while loading is already in progress
            self.composables[name] = true;
            //construct url
            var url = self.basePath + name + self.suffix;

            sweva.axios.get(url)
            .then(function (response) {
                //convert the response JSON to an actual composable
                var composable = self.convertToObject(response.data, url);
                //closue function, dummy
                var func = function (comp) {
                    return function (res, rej) {
                        res(comp);
                    }
                }
                var internalPromise = new Promise(func(composable));

                //check if composable just extends existing one
                if (composable.hasOwnProperty('extends')) {
                    var baseComposableName = composable.extends;
                    //create a closure to load the base composable
                    var func2 = function (baseComposableName, composable) {
                        return function (res, rej) {
                            self.load(baseComposableName).then(function (comp) {
                                //extend loaded composable with extension
                                res(comp.extendWith(composable));
                            });
                        }
                    };
                    //adjust internal promise to load the base composable first, before extending it.
                    internalPromise = new Promise(func2(baseComposableName, composable));
                }

                internalPromise.then(function (composable) {
                    //log as loaded
                    console.log('loaded ' + composable.name);
                    //if the loaded composable is a module
                    if (composable.type == 'module') {
                        //construct Module
                        composable = new Module(composable);

                        self.assignLoadedComposables(name, composable, assignToObject, property);

                        resolve(composable);
                    }
                        //if the loaded composable is a composition
                    else {
                        //construct Composition
                        composable = new Composition(composable);

                        self.assignLoadedComposables(name, composable, assignToObject, property);
                        //load composables required for the composition
                        composable.loadComposables().then(function () {
                            resolve(composable);
                        });
                    }
                });
            })
            .catch(function (response) {
                reject(self.basePath + name + self.suffix); //could not load
            });
        }
    });
}
/**
 * Clears the internal dictionaries.
 */
ComposableLoader.prototype.clear = function () {
    this.composables = {};
    this.waitingList = {};
}
module.exports = ComposableLoader;
},{"../composables/composition.js":3,"../composables/module.js":4,"../errors/definitionError.js":5}],10:[function(require,module,exports){
'use strict';

var ExecutionError = require('../errors/executionError.js');
var Module = require('../composables/module.js');
var Composition = require('../composables/composition.js');
/**
 * An ExecutionManager is responsible for managing the execution process of compositions and modules.
 * It has two phases: A setup phase, were all dependencies are loaded and initialized and an execution phase,
 * that executes the composables by providing data and input objects to them.
 *
 * The setup needs to be done only once, while the execution can be repeated on different data.
 * @constructor
 * @param {string} [name] - Name of the execution manager.
 */
function ExecutionManager(name) {
    if (typeof name === 'string') {
        this.name = name;
    }
    else {
        this.name = 'ExecutionManager';
    }
    /**
    * Amount of how many modules are used currently.
    * @name ExecutionManager#modulesTotal
    * @type {number}
    */
    this.modulesTotal = 1;
    /**
    * Amount of how many modules have finished execution.
    * @name ExecutionManager#modulesDone
    * @type {number}
    */
    this.modulesDone = 0;
    /**
    * Callback to track progress, gets called everytime a module finishes.
    * @name ExecutionManager#progressCallback
    * @type {function}
    */
    this.progressCallback = null;
}
/**
 * Registers the callback function to track progress.
 * @param {function} - Callback function for progress tracking. Has a number parameter with a value 0-100.
 */
ExecutionManager.prototype.onProgress = function (callback) {
    this.progressCallback = callback;
}
/**
 * Initializes all required composables, loads dependencies, validates.
 * @param {Array.<string|Composable>} executionArray - Array of composables that will be executed.
 * @param {boolean} [isPureObject=false] - Set this to true, if passing pure JavaScript Objects and not just JSON.
 */
ExecutionManager.prototype.setup = function (executionArray, isPureObject) {
   
    //internal recursive function to count how many modules are currently used
    function countModules(composable) {
        if (typeof composable.composables === 'undefined') {
            return 1;
        }
        else {
            var count = 0;

            for (var key in composable.composables) {
                if (composable.composables.hasOwnProperty(key)) {
                    count += countModules(composable.composables[key]);
                }
            }
            return count;
        }
    }
   
    var needsLoading = [];
    this.composables = {};
    this.isReady = false;

    this.wantsToExecute = false;
    //if it is not an array, make it one
    if (!Array.isArray(executionArray)) {
        executionArray = [executionArray];
    }
    var names = [];
    //for each composable, that will be executed
    for (var i = 0; i < executionArray.length; i++) {
        var composable = executionArray[i];
        //if composable is provided as string, i.e. name it needs to be loaded
        if (typeof composable === 'string') {
            names.push(composable);
            needsLoading.push(sweva.ComposableLoader.load(composable, this.composables, composable));
        }
            //otherwise a composable object is given
        else {
            if (typeof isPureObject === 'undefined' || !isPureObject) {
                composable = sweva.ComposableLoader.convertToObject(composable, 'JSON');
            }
            
            if (composable.type == 'module') {
                this.composables[composable.name] = new Module(composable);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
            }
            else {
                this.composables[composable.name] = new Composition(composable);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
                //composables of a composition need also to be loaded
                needsLoading.push(this.composables[composable.name].loadComposables());
            }
            names.push(composable.name);
        }
    }
    var self = this;
    
    //now wait for everything to load
    Promise.all(needsLoading).then(function () {
        //console.log(sweva.ComposableLoader.composables);
        //let's check, how many modules are used in total to have a rough estimate for progress tracking
        var moduleCount = 0;
        for (var i = 0; i < executionArray.length; i++) {
            moduleCount += countModules(sweva.ComposableLoader.get(names[i]));
        }
        self.modulesTotal = moduleCount;
        self.modulesDone = 0;
       
        //composables should now contain everything
        self.isReady = true;
        console.log('all loaded');
        //if we want to execute, before setup is ready, it is delayed and continued from here
        if (self.wantsToExecute) {
            self.wantsToExecute = false;
            self.executeCallback();
        }
    })
    .catch(function (error) {
        sweva.ErrorManager.error(
                      new ExecutionError('Could not load all modules: ' + error,
                      self.name, error));
    });
}
/**
 * Calculates the current progress state and calls the optionally registered progressCallback.
 * It countsthe percentage of the modules that have finished execution.
 * @param {string} alias - The alias of the module, under which it is known to the parent composition.
 * @param {string} name - The name of the module.
 * @param {string} context - The context under which the module is executed (its parents).
 */
ExecutionManager.prototype.progressUpdate = function (alias, name, context) {
    if (this.progressCallback !== null) {
        this.modulesDone++;

        var progress = this.modulesDone / +this.modulesTotal;
        
        //make a value 0-100 and cut off decimal places
        this.progressCallback((progress * 100).toFixed(0));
    }
}
/**
 * Executes the composables that were initalized during {@link ExecutionManager#setup}.
 * @param {Object} data - The data to use for the execution. If multiple composables will be executed,
 * the data property names must correspond to the composable names for a correct mapping of the data.
 * @param {Object} input - The input object for the execution. If multiple composables will be executed,
 * the input property names must correspond to the composable names for a correct mapping of the input.
 */
ExecutionManager.prototype.execute = function (data, input) {
    var executions = [];
    var self = this;
   
    return new Promise(function (resolve, reject) {
        //closure function
        var func = function (composables, executions, resolve, reject) {
            return function () {
                
                var onlyOneComposable = false;
                //check if only one composable will be executed
                if (Object.keys(composables).length == 1) {
                    onlyOneComposable = true;
                }

                for (var key in composables) {
                    
                    if (composables.hasOwnProperty(key)) {
                        if (onlyOneComposable) {
                            executions.push(composables[key].execute(data, input, '', key, self.progressUpdate.bind(self)));
                        }
                        else {
                            executions.push(composables[key].execute(data[key], input[key] || {}, '', key, self.progressUpdate.bind(self)));
                        }
                    }
                }
                
                Promise.all(executions).then(function (results) {                    
                    if (onlyOneComposable) {                        
                        return resolve(results[0]);
                    }
                    resolve(results);
                })
                .catch(function (results) {
                    if (onlyOneComposable) {
                        return resolve(results);
                    }
                    sweva.ErrorManager.error(
                      new ExecutionError('Something unexpected happened: ' + results,
                      this.name, results));
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
//alias
ExecutionManager.prototype.run = ExecutionManager.prototype.execute;
module.exports = ExecutionManager
},{"../composables/composition.js":3,"../composables/module.js":4,"../errors/executionError.js":7}],11:[function(require,module,exports){
'use strict';
var JsTokens = require('../../../node_modules/js-tokens/index.js');
/**
 * Responsible to verify if a string complies to a safe  JavaScript subset.
 * A blacklist used to ensure no harmful operation can be performed by user defined scripts.
 * Currently the following tokens are forbidden:
 * arguments, callee, caller, constructor, eval, prototype, stack, unwatch, valueOf, watch, __proto__, __parent__, 'this', window, document, '[', ']', Function, 'with', uneval, toSource, setTimeout, setInterval
 * Use {@link SwevaScript#get} as a replacement for [].
 * 
 * Additionally global variables are masked.
 * @constructor 
 */
function SwevaScript() {
    /**
    * List of forbidden tokens, that are not allowed in this JavaScript subset.
    * @name SwevaScript#forbiddenList
    * @type {Object.<string, boolean>}
    */
    this.forbiddenList = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true,

        __proto__: true,
        __parent__: true,
        'this': true,
        window: true,
        document: true,
        '[': true,
        ']': true,
        Function: true,
        'with': true,
        uneval: true,
        toSource: true,
        setTimeout: true,
        setInterval: true
    }
    /**
    * List of allowed global variables, that should not be masked.
    * This is currently: Math, console 
    * @name SwevaScript#allowedGlobals
    * @type {Object.<string, boolean>}
    */
    this.allowedGlobals = {
        Math: true,
        console: true,
        'true': true,
        'false': true
    }
}

/**
 * Verifies if a JavaScript code complies to the safer JavaScript subset.
 * Does not rewrite or change the code, therefor you should DENY anything, that is considered harmful by this function.
 * 
 * @param {string} code - The JavaScript code to verify for safety.
 * @returns {boolean} True, if the code does not contain forbidden tokens.
 */
SwevaScript.prototype.verify = function (code) {
    try {
        //get an array of tokens using the tokenizer (external library)
        var tokens = code.match(JsTokens);
    } catch (e) {
        return {
            valid: false,
            error: e.message
        }
    }
   
    //check for each token
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i].trim();
        if (token.length > 0) {
            //if token non empty: is it in the blacklist?
            if (this.forbiddenList.hasOwnProperty(token)) {
                return {
                    valid: false,
                    error: 'Invalid usage of ' + token
                };
            }
        }

        
    }

    //if no return reached before, we can assume there was no forbidden token present
    return {
        valid: true,
        error: ''
    }
}

/**
 * Replaces the forbidden [] accessor, by checking the property name during runtime.
 * If a forbidden property (see {@link SwevaScript}) is used, the property is not accessed.
 * 
 * @param {Object} object - The object from which the property value is required.
 * @param {string|number} property - The name of the property to retrieve the value from.
 * returns {Object|boolean|string|number} - The value of the property, if an illegal property name is used null.
 */
SwevaScript.prototype.get = function (object, property) {
    var forbiddenList = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true,

        __proto__: true,
        __parent__: true,
        'this': true,
        window: true,
        document: true,
        '[': true,
        ']': true,
        Function: true,
        'with': true,
        uneval: true,
        toSource: true,
        setTimeout: true,
        setInterval: true
    }
    //if a string is provided, check for being in the blacklist
    if (typeof property === 'string') {
        if (!object.window && !forbiddenList.hasOwnProperty(property)) {
            return object[property];
        }
    }
    //numbers are not checked for being in the blacklist
    else if (typeof property === 'number') {
        return object[property];
    }

    console.error('Illegal property name: ' + property);
    return null;
}

SwevaScript.prototype.set = function (object, property, value) {
    var forbiddenList = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true,

        __proto__: true,
        __parent__: true,
        'this': true,
        window: true,
        document: true,
        '[': true,
        ']': true,
        Function: true,
        'with': true,
        uneval: true,
        toSource: true,
        setTimeout: true,
        setInterval: true
    }
    //if a string is provided, check for being in the blacklist
    if (typeof property === 'string') {
        if (!object.window && !forbiddenList.hasOwnProperty(property)) {
            object[property] = value;
        }
        else {
            console.error('Illegal property name: ' + property);
        }
    }
    //numbers are not checked for being in the blacklist
    else if (typeof property === 'number') {
        object[property] = value;
    }
}


/**
 * Sanitizes given Javascript code by verifying if it is a safer subset of JavaScript and masking global variables.
 * {@link SwevaScript#verify} is performed internally, so you do not need to verify explicitly beforehand.
 * @param {string} code - The JavaScript function to sanitize.
 * @param {function} errorCallback - A callback called, when an error occurs, has a string as a parameter with the error message.
 * @returns{function} - A function, that can be executed
 */
SwevaScript.prototype.sanitize = function (code, errorCallback) {
    //all in one line
    //code = code.replace(/(\r\n|\n|\r)/gm, ""); 
   
    var error = '';
    //first make sure it is valid SwevaScript
    var validation = this.verify(code);    
    if (validation.valid) {        
        var allowedGlobals = this.allowedGlobals;
        //get all global variables except the exceptions we defined in {@link SwevaScript#allowedGlobals}
        var globals = Object.keys(window).filter(function (obj) {
            return !allowedGlobals.hasOwnProperty(obj)
        }).join(',');
        //we want to shadow all global variables except the ones we allow, by declaring them as local variables
        //https://stackoverflow.com/posts/26917938/revisions
        //var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var funcReg = /function\s*\(([^()]*)\)\s\{((.|\n)*)\}/gmi;
        var match = funcReg.exec(code);
       
        //we extract funtion header (decrlaration with parameters) and body
        if (match) {
            
            //enforce strict behavior, shadow globals, append verified code
            var fn_text = '"use strict"; var ' + globals + ';' + match[2] + ';';
            
            var fn = new Function(match[1].split(','), fn_text);//generate sanitized function

            return fn;
        }
        else {
            error = 'Not a valid JS function';
        }
    }
    else {
        error = validation.error;
    }
    if (typeof errorCallback === 'function') {
        errorCallback(error);
    }
    
    return null;
}

module.exports = SwevaScript;
},{"../../../node_modules/js-tokens/index.js":61}],12:[function(require,module,exports){
/* axios v0.7.0 | (c) 2015 by Matt Zabriskie */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.axios=t():e.axios=t()}(this,function(){return function(e){function t(r){if(n[r])return n[r].exports;var o=n[r]={exports:{},id:r,loaded:!1};return e[r].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}var n={};return t.m=e,t.c=n,t.p="",t(0)}([function(e,t,n){e.exports=n(1)},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(4),s=n(12),u=e.exports=function(e){"string"==typeof e&&(e=o.merge({url:arguments[0]},arguments[1])),e=o.merge({method:"get",headers:{},timeout:r.timeout,transformRequest:r.transformRequest,transformResponse:r.transformResponse},e),e.withCredentials=e.withCredentials||r.withCredentials;var t=[i,void 0],n=Promise.resolve(e);for(u.interceptors.request.forEach(function(e){t.unshift(e.fulfilled,e.rejected)}),u.interceptors.response.forEach(function(e){t.push(e.fulfilled,e.rejected)});t.length;)n=n.then(t.shift(),t.shift());return n};u.defaults=r,u.all=function(e){return Promise.all(e)},u.spread=n(13),u.interceptors={request:new s,response:new s},function(){function e(){o.forEach(arguments,function(e){u[e]=function(t,n){return u(o.merge(n||{},{method:e,url:t}))}})}function t(){o.forEach(arguments,function(e){u[e]=function(t,n,r){return u(o.merge(r||{},{method:e,url:t,data:n}))}})}e("delete","get","head"),t("post","put","patch")}()},function(e,t,n){"use strict";var r=n(3),o=/^\)\]\}',?\n/,i={"Content-Type":"application/x-www-form-urlencoded"};e.exports={transformRequest:[function(e,t){return r.isFormData(e)?e:r.isArrayBuffer(e)?e:r.isArrayBufferView(e)?e.buffer:!r.isObject(e)||r.isFile(e)||r.isBlob(e)?e:(r.isUndefined(t)||(r.forEach(t,function(e,n){"content-type"===n.toLowerCase()&&(t["Content-Type"]=e)}),r.isUndefined(t["Content-Type"])&&(t["Content-Type"]="application/json;charset=utf-8")),JSON.stringify(e))}],transformResponse:[function(e){if("string"==typeof e){e=e.replace(o,"");try{e=JSON.parse(e)}catch(t){}}return e}],headers:{common:{Accept:"application/json, text/plain, */*"},patch:r.merge(i),post:r.merge(i),put:r.merge(i)},timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN"}},function(e,t){"use strict";function n(e){return"[object Array]"===v.call(e)}function r(e){return"[object ArrayBuffer]"===v.call(e)}function o(e){return"[object FormData]"===v.call(e)}function i(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer}function s(e){return"string"==typeof e}function u(e){return"number"==typeof e}function a(e){return"undefined"==typeof e}function f(e){return null!==e&&"object"==typeof e}function c(e){return"[object Date]"===v.call(e)}function p(e){return"[object File]"===v.call(e)}function l(e){return"[object Blob]"===v.call(e)}function d(e){return e.replace(/^\s*/,"").replace(/\s*$/,"")}function h(e){return"[object Arguments]"===v.call(e)}function m(){return"undefined"!=typeof window&&"undefined"!=typeof document&&"function"==typeof document.createElement}function y(e,t){if(null!==e&&"undefined"!=typeof e){var r=n(e)||h(e);if("object"==typeof e||r||(e=[e]),r)for(var o=0,i=e.length;i>o;o++)t.call(null,e[o],o,e);else for(var s in e)e.hasOwnProperty(s)&&t.call(null,e[s],s,e)}}function g(){var e={};return y(arguments,function(t){y(t,function(t,n){e[n]=t})}),e}var v=Object.prototype.toString;e.exports={isArray:n,isArrayBuffer:r,isFormData:o,isArrayBufferView:i,isString:s,isNumber:u,isObject:f,isUndefined:a,isDate:c,isFile:p,isBlob:l,isStandardBrowserEnv:m,forEach:y,merge:g,trim:d}},function(e,t,n){(function(t){"use strict";e.exports=function(e){return new Promise(function(r,o){try{"undefined"!=typeof XMLHttpRequest||"undefined"!=typeof ActiveXObject?n(6)(r,o,e):"undefined"!=typeof t&&n(6)(r,o,e)}catch(i){o(i)}})}}).call(t,n(5))},function(e,t){function n(){f=!1,s.length?a=s.concat(a):c=-1,a.length&&r()}function r(){if(!f){var e=setTimeout(n);f=!0;for(var t=a.length;t;){for(s=a,a=[];++c<t;)s&&s[c].run();c=-1,t=a.length}s=null,f=!1,clearTimeout(e)}}function o(e,t){this.fun=e,this.array=t}function i(){}var s,u=e.exports={},a=[],f=!1,c=-1;u.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];a.push(new o(e,t)),1!==a.length||f||setTimeout(r,0)},o.prototype.run=function(){this.fun.apply(null,this.array)},u.title="browser",u.browser=!0,u.env={},u.argv=[],u.version="",u.versions={},u.on=i,u.addListener=i,u.once=i,u.off=i,u.removeListener=i,u.removeAllListeners=i,u.emit=i,u.binding=function(e){throw new Error("process.binding is not supported")},u.cwd=function(){return"/"},u.chdir=function(e){throw new Error("process.chdir is not supported")},u.umask=function(){return 0}},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(7),s=n(8),u=n(9);e.exports=function(e,t,a){var f=u(a.data,a.headers,a.transformRequest),c=o.merge(r.headers.common,r.headers[a.method]||{},a.headers||{});o.isFormData(f)&&delete c["Content-Type"];var p=new(XMLHttpRequest||ActiveXObject)("Microsoft.XMLHTTP");if(p.open(a.method.toUpperCase(),i(a.url,a.params),!0),p.timeout=a.timeout,p.onreadystatechange=function(){if(p&&4===p.readyState){var n=s(p.getAllResponseHeaders()),r=-1!==["text",""].indexOf(a.responseType||"")?p.responseText:p.response,o={data:u(r,n,a.transformResponse),status:p.status,statusText:p.statusText,headers:n,config:a};(p.status>=200&&p.status<300?e:t)(o),p=null}},o.isStandardBrowserEnv()){var l=n(10),d=n(11),h=d(a.url)?l.read(a.xsrfCookieName||r.xsrfCookieName):void 0;h&&(c[a.xsrfHeaderName||r.xsrfHeaderName]=h)}if(o.forEach(c,function(e,t){f||"content-type"!==t.toLowerCase()?p.setRequestHeader(t,e):delete c[t]}),a.withCredentials&&(p.withCredentials=!0),a.responseType)try{p.responseType=a.responseType}catch(m){if("json"!==p.responseType)throw m}o.isArrayBuffer(f)&&(f=new DataView(f)),p.send(f)}},function(e,t,n){"use strict";function r(e){return encodeURIComponent(e).replace(/%40/gi,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}var o=n(3);e.exports=function(e,t){if(!t)return e;var n=[];return o.forEach(t,function(e,t){null!==e&&"undefined"!=typeof e&&(o.isArray(e)&&(t+="[]"),o.isArray(e)||(e=[e]),o.forEach(e,function(e){o.isDate(e)?e=e.toISOString():o.isObject(e)&&(e=JSON.stringify(e)),n.push(r(t)+"="+r(e))}))}),n.length>0&&(e+=(-1===e.indexOf("?")?"?":"&")+n.join("&")),e}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e){var t,n,o,i={};return e?(r.forEach(e.split("\n"),function(e){o=e.indexOf(":"),t=r.trim(e.substr(0,o)).toLowerCase(),n=r.trim(e.substr(o+1)),t&&(i[t]=i[t]?i[t]+", "+n:n)}),i):i}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e,t,n){return r.forEach(n,function(n){e=n(e,t)}),e}},function(e,t,n){"use strict";var r=n(3);e.exports={write:function(e,t,n,o,i,s){var u=[];u.push(e+"="+encodeURIComponent(t)),r.isNumber(n)&&u.push("expires="+new Date(n).toGMTString()),r.isString(o)&&u.push("path="+o),r.isString(i)&&u.push("domain="+i),s===!0&&u.push("secure"),document.cookie=u.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}},function(e,t,n){"use strict";function r(e){var t=e;return s&&(u.setAttribute("href",t),t=u.href),u.setAttribute("href",t),{href:u.href,protocol:u.protocol?u.protocol.replace(/:$/,""):"",host:u.host,search:u.search?u.search.replace(/^\?/,""):"",hash:u.hash?u.hash.replace(/^#/,""):"",hostname:u.hostname,port:u.port,pathname:"/"===u.pathname.charAt(0)?u.pathname:"/"+u.pathname}}var o,i=n(3),s=/(msie|trident)/i.test(navigator.userAgent),u=document.createElement("a");o=r(window.location.href),e.exports=function(e){var t=i.isString(e)?r(e):e;return t.protocol===o.protocol&&t.host===o.host}},function(e,t,n){"use strict";function r(){this.handlers=[]}var o=n(3);r.prototype.use=function(e,t){return this.handlers.push({fulfilled:e,rejected:t}),this.handlers.length-1},r.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},r.prototype.forEach=function(e){o.forEach(this.handlers,function(t){null!==t&&e(t)})},e.exports=r},function(e,t){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}}])});
//# sourceMappingURL=axios.min.map
},{}],13:[function(require,module,exports){
'use strict';

var compileSchema = require('./compile')
    , resolve = require('./compile/resolve')
    , Cache = require('./cache')
    , SchemaObject = require('./compile/schema_obj')
    , stableStringify = require('json-stable-stringify')
    , formats = require('./compile/formats');

module.exports = Ajv;

var META_SCHEMA_ID = 'http://json-schema.org/draft-04/schema';
var SCHEMA_URI_FORMAT = /^(?:(?:[a-z][a-z0-9+-.]*:)?\/\/)?[^\s]*$/i;
function SCHEMA_URI_FORMAT_FUNC(str) {
    return SCHEMA_URI_FORMAT.test(str);
}

/**
 * Creates validator instance.
 * Usage: `Ajv(opts)`
 * @param {Object} opts optional options
 * @return {Object} ajv instance
 */
function Ajv(opts) {
    if (!(this instanceof Ajv)) return new Ajv(opts);
    var self = this;

    this.opts = opts || {};
    this._schemas = {};
    this._refs = {};
    this._formats = formats(this.opts.format);
    this._cache = this.opts.cache || new Cache;
    this._loadingSchemas = {};

    // this is done on purpose, so that methods are bound to the instance
    // (without using bind) so that they can be used without the instance
    this.validate = validate;
    this.compile = compile;
    this.compileAsync = compileAsync;
    this.addSchema = addSchema;
    this.addMetaSchema = addMetaSchema;
    this.validateSchema = validateSchema;
    this.getSchema = getSchema;
    this.removeSchema = removeSchema;
    this.addFormat = addFormat;
    this.errorsText = errorsText;

    this._compile = _compile;

    addInitialSchemas();
    if (this.opts.formats) addInitialFormats();


    /**
     * Validate data using schema
     * Schema will be compiled and cached (using serialized JSON as key. [json-stable-stringify](https://github.com/substack/json-stable-stringify) is used to serialize.
     * @param  {String|Object} schemaKeyRef key, ref or schema object
     * @param  {Any} data to be validated
     * @return {Boolean} validation result. Errors from the last validation will be available in `ajv.errors` (and also in compiled schema: `schema.errors`).
     */
    function validate(schemaKeyRef, data) {
        var v;
        if (typeof schemaKeyRef == 'string') {
            v = getSchema(schemaKeyRef);
            if (!v) throw new Error('no schema with key or ref "' + schemaKeyRef + '"');
        } else {
            var schemaObj = _addSchema(schemaKeyRef);
            v = schemaObj.validate || _compile(schemaObj);
        }

        var valid = v(data);
        self.errors = v.errors;
        return valid;
    }


    /**
     * Create validating function for passed schema.
     * @param  {String|Object} schema
     * @return {Function} validating function
     */
    function compile(schema) {
        var schemaObj = _addSchema(schema);
        return schemaObj.validate || _compile(schemaObj);
    }


    /**
     * Create validating function for passed schema with asynchronous loading of missing schemas.
     * `loadSchema` option should be a function that accepts schema uri and node-style callback.
     * @param  {String|Object} schema
     * @param  {Function} callback node-style callback, it is always called with 2 parameters: error (or null) and validating function.
     */
    function compileAsync(schema, callback) {
        var schemaObj;
        try {
            schemaObj = _addSchema(schema);
        } catch(e) {
            setTimeout(function() { callback(e); });
            return;
        }
        if (schemaObj.validate)
            setTimeout(function() { callback(null, schemaObj.validate); });
        else {
            if (typeof self.opts.loadSchema != 'function')
                throw new Error('options.loadSchema should be a function');
            _compileAsync(schema, callback, true);
        }
    }


    function _compileAsync(schema, callback, firstCall) {
        var validate;
        try { validate = compile(schema); }
        catch(e) {
            if (e.missingSchema) loadMissingSchema(e);
            else deferCallback(e);
            return;
        }
        deferCallback(null, validate);

        function loadMissingSchema(e) {
            var ref = e.missingSchema;
            if (self._refs[ref] || self._schemas[ref])
                return callback(new Error('Schema ' + ref + ' is loaded but' + e.missingRef + 'cannot be resolved'));
            var _callbacks = self._loadingSchemas[ref];
            if (_callbacks) {
                if (typeof _callbacks == 'function')
                    self._loadingSchemas[ref] = [_callbacks, schemaLoaded];
                else
                    _callbacks[_callbacks.length] = schemaLoaded;
            } else {
                self._loadingSchemas[ref] = schemaLoaded;
                self.opts.loadSchema(ref, function (err, sch) {
                    var _callbacks = self._loadingSchemas[ref];
                    delete self._loadingSchemas[ref];
                    if (typeof _callbacks == 'function')
                        _callbacks(err, sch);
                    else
                        for (var i=0; i<_callbacks.length; i++)
                            _callbacks[i](err, sch);
                });
            }

            function schemaLoaded(err, sch) {
                if (err) callback(err);
                else {
                    if (!(self._refs[ref] || self._schemas[ref])) {
                        try {
                            addSchema(sch, ref);
                        } catch(e) {
                            callback(e);
                            return;
                        }
                    }
                    _compileAsync(schema, callback);
                }
            }
        }

        function deferCallback(err, validate) {
            if (firstCall) setTimeout(function() { callback(err, validate); });
            else callback(err, validate);
        }
    }


    /**
     * Adds schema to the instance.
     * @param {Object|Array} schema schema or array of schemas. If array is passed, `key` will be ignored.
     * @param {String} key Optional schema key. Can be passed to `validate` method instead of schema object or id/ref. One schema per instance can have empty `id` and `key`.
     */
    function addSchema(schema, key, _skipValidation, _meta) {
        if (Array.isArray(schema)){
            for (var i=0; i<schema.length; i++) addSchema(schema[i]);
            return;
        }
        // can key/id have # inside?
        key = resolve.normalizeId(key || schema.id);
        checkUnique(key);
        var schemaObj = self._schemas[key] = _addSchema(schema, _skipValidation);
        schemaObj.meta = _meta;
    }


    /**
     * Add schema that will be used to validate other schemas
     * removeAdditional option is alway set to false
     * @param {Object} schema
     * @param {String} key optional schema key
     */
    function addMetaSchema(schema, key, _skipValidation) {
        addSchema(schema, key, _skipValidation, true);
    }


    /**
     * Validate schema
     * @param  {Object} schema schema to validate
     * @return {Boolean}
     */
    function validateSchema(schema) {
        var $schema = schema.$schema || META_SCHEMA_ID;
        var currentUriFormat = self._formats.uri;
        self._formats.uri = typeof currentUriFormat == 'function'
                            ? SCHEMA_URI_FORMAT_FUNC
                            : SCHEMA_URI_FORMAT;
        var valid = validate($schema, schema);
        self._formats.uri = currentUriFormat;
        return valid;
    }


    /**
     * Get compiled schema from the instance by `key` or `ref`.
     * @param  {String} keyRef `key` that was passed to `addSchema` or full schema reference (`schema.id` or resolved id).
     * @return {Function} schema validating function (with property `schema`).
     */
    function getSchema(keyRef) {
        var schemaObj = _getSchemaObj(keyRef);
        switch (typeof schemaObj) {
            case 'object': return schemaObj.validate || _compile(schemaObj);
            case 'string': return getSchema(schemaObj);
        }
    }


    function _getSchemaObj(keyRef) {
        keyRef = resolve.normalizeId(keyRef);
        return self._schemas[keyRef] || self._refs[keyRef];
    }


    /**
     * Remove cached schema
     * Even if schema is referenced by other schemas it still can be removed as other schemas have local references
     * @param  {String|Object} schemaKeyRef key, ref or schema object
     */
    function removeSchema(schemaKeyRef) {
        switch (typeof schemaKeyRef) {
            case 'string':
                var schemaObj = _getSchemaObj(schemaKeyRef);
                self._cache.del(schemaObj.jsonStr);
                delete self._schemas[schemaKeyRef];
                delete self._refs[schemaKeyRef];
                break;
            case 'object':
                var jsonStr = stableStringify(schemaKeyRef);
                self._cache.del(jsonStr);
                var id = schemaKeyRef.id;
                if (id) {
                    id = resolve.normalizeId(id);
                    delete self._refs[id];
                }
        }
    }


    function _addSchema(schema, skipValidation) {
        if (typeof schema != 'object') throw new Error('schema should be object');
        var jsonStr = stableStringify(schema);
        var cached = self._cache.get(jsonStr);
        if (cached) return cached;

        var id = resolve.normalizeId(schema.id);
        if (id) checkUnique(id);

        var ok = skipValidation || self.opts.validateSchema === false
                 || validateSchema(schema);
        if (!ok) {
            var message = 'schema is invalid:' + errorsText();
            if (self.opts.validateSchema == 'log') console.error(message);
            else throw new Error(message);
        }

        var localRefs = resolve.ids.call(self, schema);

        var schemaObj = new SchemaObject({
            id: id,
            schema: schema,
            localRefs: localRefs,
            jsonStr: jsonStr,
        });

        if (id[0] != '#') self._refs[id] = schemaObj;
        self._cache.put(jsonStr, schemaObj);

        return schemaObj;
    }


    function _compile(schemaObj, root) {
        if (schemaObj.compiling) {
            schemaObj.validate = callValidate;
            callValidate.schema = schemaObj.schema;
            callValidate.errors = null;
            callValidate.root = root ? root : callValidate;
            return callValidate;
        }
        schemaObj.compiling = true;

        var currentRA = self.opts.removeAdditional;
        if (currentRA && schemaObj.meta) self.opts.removeAdditional = false;
        var v;
        try { v = compileSchema.call(self, schemaObj.schema, root, schemaObj.localRefs); }
        finally {
            schemaObj.compiling = false;
            if (currentRA) self.opts.removeAdditional = currentRA;
        }

        schemaObj.validate = v;
        schemaObj.refs = v.refs;
        schemaObj.refVal = v.refVal;
        schemaObj.root = v.root;
        return v;


        function callValidate() {
            var v = schemaObj.validate;
            var result = v.apply(null, arguments);
            callValidate.errors = v.errors;
            return result;
        }
    }


    function errorsText(errors, opts) {
        errors = errors || self.errors;
        if (!errors) return 'No errors';
        opts = opts || {};
        var separator = opts.separator || ', ';
        var dataVar = opts.dataVar || 'data';

        var text = errors.reduce(function(txt, e) {
            return e ? txt + dataVar + e.dataPath + ' ' + e.message + separator : txt;
        }, '');
        return text.slice(0, -separator.length);
    }


    function addFormat(name, format) {
        if (typeof format == 'string') format = new RegExp(format);
        self._formats[name] = format;
    }


    function addInitialSchemas() {
        if (self.opts.meta !== false) {
            var metaSchema = require('./refs/json-schema-draft-04.json');
            addMetaSchema(metaSchema, META_SCHEMA_ID, true);
            self._refs['http://json-schema.org/schema'] = META_SCHEMA_ID;
        }

        var optsSchemas = self.opts.schemas;
        if (!optsSchemas) return;
        if (Array.isArray(optsSchemas)) addSchema(optsSchemas);
        else for (var key in optsSchemas) addSchema(optsSchemas[key], key);
    }


    function addInitialFormats() {
        for (var name in self.opts.formats) {
            var format = self.opts.formats[name];
            addFormat(name, format);
        }
    }


    function checkUnique(id) {
        if (self._schemas[id] || self._refs[id])
            throw new Error('schema with key or id "' + id + '" already exists');
    }
}

},{"./cache":14,"./compile":18,"./compile/formats":17,"./compile/resolve":19,"./compile/schema_obj":21,"./refs/json-schema-draft-04.json":46,"json-stable-stringify":47}],14:[function(require,module,exports){
'use strict';


var Cache = module.exports = function Cache() {
    this._cache = {};
};


Cache.prototype.put = function Cache_put(key, value) {
    this._cache[key] = value;
};


Cache.prototype.get = function Cache_get(key) {
    return this._cache[key];
};


Cache.prototype.del = function Cache_del(key) {
    delete this._cache[key];
};

},{}],15:[function(require,module,exports){
'use strict';

//all requires must be explicit because browserify won't work with dynamic requires
module.exports = {
  '$ref': require('../dotjs/ref'),
  anyOf: require('../dotjs/anyOf'),
  format: require('../dotjs/format'),
  maxLength: require('../dotjs/maxLength'),
  minItems: require('../dotjs/minItems'),
  minimum: require('../dotjs/minimum'),
  oneOf: require('../dotjs/oneOf'),
  required: require('../dotjs/required'),
  dependencies: require('../dotjs/dependencies'),
  items: require('../dotjs/items'),
  maxProperties: require('../dotjs/maxProperties'),
  minLength: require('../dotjs/minLength'),
  multipleOf: require('../dotjs/multipleOf'),
  pattern: require('../dotjs/pattern'),
  uniqueItems: require('../dotjs/uniqueItems'),
  allOf: require('../dotjs/allOf'),
  enum: require('../dotjs/enum'),
  maxItems: require('../dotjs/maxItems'),
  maximum: require('../dotjs/maximum'),
  minProperties: require('../dotjs/minProperties'),
  not: require('../dotjs/not'),
  properties: require('../dotjs/properties'),
  validate: require('../dotjs/validate')
};

},{"../dotjs/allOf":23,"../dotjs/anyOf":24,"../dotjs/dependencies":25,"../dotjs/enum":26,"../dotjs/format":27,"../dotjs/items":28,"../dotjs/maxItems":29,"../dotjs/maxLength":30,"../dotjs/maxProperties":31,"../dotjs/maximum":32,"../dotjs/minItems":33,"../dotjs/minLength":34,"../dotjs/minProperties":35,"../dotjs/minimum":36,"../dotjs/multipleOf":37,"../dotjs/not":38,"../dotjs/oneOf":39,"../dotjs/pattern":40,"../dotjs/properties":41,"../dotjs/ref":42,"../dotjs/required":43,"../dotjs/uniqueItems":44,"../dotjs/validate":45}],16:[function(require,module,exports){
'use strict';

module.exports = function equal(a, b) {
  if (a === b) return true;

  var arrA = Array.isArray(a)
    , arrB = Array.isArray(b)
    , i;

  if (arrA && arrB) {
    if (a.length != b.length) return false;
    for (i = 0; i < a.length; i++)
      if (!equal(a[i], b[i])) return false;
    return true;
  }

  if (arrA != arrB) return false;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    var keys = Object.keys(a);

    if (keys.length !== Object.keys(b).length) return false;

    for (i = 0; i < keys.length; i++)
      if (b[keys[i]] === undefined) return false;

    for (i = 0; i < keys.length; i++)
      if(!equal(a[keys[i]], b[keys[i]])) return false;

    return true;
  }

  return false;
};

},{}],17:[function(require,module,exports){
'use strict';

var util = require('./util');

var DATE = /^\d\d\d\d-(\d\d)-(\d\d)$/;
var DAYS = [0,31,29,31,30,31,30,31,31,30,31,30,31];
var TIME = /^(\d\d):(\d\d):(\d\d)(?:\.\d+)?(?:z|[+-]\d\d:\d\d)$/;
var HOSTNAME = /^[a-z](?:(?:[-0-9a-z]{0,61})?[0-9a-z])?(\.[a-z](?:(?:[-0-9a-z]{0,61})?[0-9a-z])?)*$/i;
var URI = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@\/?]|%[0-9a-f]{2})*)?(?:\#(?:[a-z0-9\-._~!$&'()*+,;=:@\/?]|%[0-9a-f]{2})*)?$/i;


module.exports = formats;

function formats(mode) {
  mode = mode == 'full' ? 'full' : 'fast';
  return util.copy(formats[mode]);
}


formats.fast = {
  // date: http://tools.ietf.org/html/rfc3339#section-5.6
  date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
  // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
  'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?(?:z|[+-]\d\d:\d\d)$/i,
  // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
  uri: /^(?:[a-z][a-z0-9+-.]*)?(?:\:|\/)\/?[^\s]*$/i,
  // email (sources from jsen validator):
  // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
  // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
  email: /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  hostname: HOSTNAME,
  // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex: regex
};


formats.full = {
  date: date,
  'date-time': date_time,
  uri: uri,
  email: /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&''*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
  hostname: hostname,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex: regex
};


function date(str) {
  // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
  var matches = str.match(DATE);
  if (!matches) return false;

  var month = +matches[1];
  var day = +matches[2];
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS[month];
}


function date_time(str) {
  // http://tools.ietf.org/html/rfc3339#section-5.6
  var dateTime = str.toLowerCase().split('t');
  if (!date(dateTime[0])) return false;

  var matches = dateTime[1].match(TIME);
  if (!matches) return false;

  var hour = matches[1];
  var minute = matches[2];
  var second = matches[3];
  return hour <= 23 && minute <= 59 && second <= 59;
}


function hostname(str) {
  // http://tools.ietf.org/html/rfc1034#section-3.5
  return str.length <= 255 && HOSTNAME.test(str);
}


var NOT_URI_FRAGMENT = /\/|\:/;
function uri(str) {
  // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
  return NOT_URI_FRAGMENT.test(str) && URI.test(str);
}


function regex(str) {
  try {
    new RegExp(str);
    return true;
  } catch(e) {
    return false;
  }
}

},{"./util":22}],18:[function(require,module,exports){
'use strict';

var resolve = require('./resolve')
  , util = require('./util')
  , equal = require('./equal');

try { var beautify = require('' + 'js-beautify').js_beautify; } catch(e) {}

var RULES = require('./rules')
  , validateGenerator = require('../dotjs/validate');

module.exports = compile;


function compile(schema, root, localRefs, baseId) {
  /* jshint validthis: true, evil: true */
  var self = this
    , refVal = [ undefined ] 
    , refs = {}
    , patterns = []
    , patternsHash = {};

  root = root || { schema: schema, refVal: refVal, refs: refs };

  var formats = this._formats;

  return localCompile(schema, root, localRefs, baseId);


  function localCompile(_schema, _root, localRefs, baseId) {
    var isRoot = !_root || (_root && _root.schema == _schema);
    if (_root.schema != root.schema)
      return compile.call(self, _schema, _root, localRefs, baseId);

    var validateCode = validateGenerator({
      isTop: true,
      schema: _schema,
      isRoot: isRoot,
      baseId: baseId,
      root: _root,
      schemaPath: '',
      errorPath: '""',
      RULES: RULES,
      validate: validateGenerator,
      util: util,
      resolve: resolve,
      resolveRef: resolveRef,
      usePattern: usePattern,
      opts: self.opts,
      formats: formats
    });

    validateCode = refsCode(refVal) + patternsCode(patterns) + validateCode;

    if (self.opts.beautify) {
      var opts = self.opts.beautify === true ? { indent_size: 2 } : self.opts.beautify;
      if (beautify) validateCode = beautify(validateCode, opts);
      else console.error('"npm install js-beautify" to use beautify option');
    }
    // console.log('\n\n\n *** \n', validateCode);
    var validate;
    // try {
      eval(validateCode);
      refVal[0] = validate;
    // } catch(e) {
    //   console.log('Error compiling schema, function code:', validateCode);
    //   throw e;
    // }

    validate.schema = _schema;
    validate.errors = null;
    validate.refs = refs;
    validate.refVal = refVal;
    validate.root = isRoot ? validate : _root;

    return validate;
  }

  function resolveRef(baseId, ref, isRoot) {
    ref = resolve.url(baseId, ref);
    var refIndex = refs[ref];
    var _refVal, refCode;
    if (refIndex !== undefined) {
      _refVal = refVal[refIndex];
      refCode = 'refVal[' + refIndex + ']';
      return resolvedRef(_refVal, refCode);
    }
    if (!isRoot) {
      var rootRefId = root.refs[ref];
      if (rootRefId !== undefined) {
        _refVal = root.refVal[rootRefId];
        refCode = addLocalRef(ref, _refVal);
        return resolvedRef(_refVal, refCode);
      }
    }

    refCode = addLocalRef(ref);
    var v = resolve.call(self, localCompile, root, ref);
    if (!v) {
      var localSchema = localRefs && localRefs[ref];
      if (localSchema) {
        v = resolve.inlineRef(localSchema, self.opts.inlineRefs)
            ? localSchema
            : compile.call(self, localSchema, root, localRefs, baseId);
      }
    }

    if (v) {
      replaceLocalRef(ref, v);
      return resolvedRef(v, refCode);
    }
  }

  function addLocalRef(ref, v) {
    var refId = refVal.length;
    refVal[refId] = v;
    refs[ref] = refId;
    return 'refVal' + refId;
  }

  function replaceLocalRef(ref, v) {
    var refId = refs[ref];
    refVal[refId] = v;
  }

  function resolvedRef(schema, code) {
    return typeof schema == 'object'
            ? { schema: schema, code: code }
            : code;
  }

  function usePattern(regexStr) {
    var index = patternsHash[regexStr];
    if (index === undefined) {
      index = patternsHash[regexStr] = patterns.length;
      patterns[index] = regexStr;
    }
    return 'pattern' + index;
  }
}


function patternsCode(patterns) {
  return _arrCode(patterns, patternCode);
}


function patternCode(i, patterns) {
  return 'var pattern' + i + ' = new RegExp(' + util.toQuotedString(patterns[i]) + ');';
}


function refsCode(refVal) {
  return _arrCode(refVal, refCode);
}


function refCode(i, refVal) {
  return refVal[i] ? 'var refVal' + i + ' = refVal[' + i + '];' : '';
}


function _arrCode(arr, statement) {
  if (!arr.length) return '';
  var code = '';
  for (var i=0; i<arr.length; i++)
    code += statement(i, arr);
  return code;
}


/**
 * Functions below are used inside compiled validations function
 */

var ucs2length = util.ucs2length;

},{"../dotjs/validate":45,"./equal":16,"./resolve":19,"./rules":20,"./util":22}],19:[function(require,module,exports){
'use strict';

var url = require('url')
  , equal = require('./equal')
  , util = require('./util')
  , SchemaObject = require('./schema_obj');

module.exports = resolve;

resolve.normalizeId = normalizeId;
resolve.fullPath = getFullPath;
resolve.url = resolveUrl;
resolve.ids = resolveIds;
resolve.inlineRef = inlineRef;

function resolve(compile, root, ref) {
  /* jshint validthis: true */
  var refVal = this._refs[ref];
  if (typeof refVal == 'string') {
    if (this._refs[refVal]) refVal = this._refs[refVal];
    else return resolve.call(this, compile, root, refVal);
  }
  
  refVal = refVal || this._schemas[ref];
  if (refVal instanceof SchemaObject)
    return inlineRef(refVal.schema, this.opts.inlineRefs)
            ? refVal.schema
            : refVal.validate || this._compile(refVal);

  var res = _resolve.call(this, root, ref);
  var schema, v, baseId;
  if (res) {
    schema = res.schema;
    root = res.root;
    baseId = res.baseId;
  }

  if (schema instanceof SchemaObject)
    v = schema.validate || compile.call(this, schema.schema, root, undefined, baseId);
  else if (schema)
    v = inlineRef(schema, this.opts.inlineRefs)
        ? schema
        : compile.call(this, schema, root, undefined, baseId);

  return v;
}


function _resolve(root, ref) {
  /* jshint validthis: true */
  var p = url.parse(ref, false, true)
    , refPath = _getFullPath(p)
    , baseId = getFullPath(root.schema.id);
  if (refPath !== baseId) {
    var id = normalizeId(refPath);
    var refVal = this._refs[id];
    if (typeof refVal == 'string') {
      return resolveRecursive.call(this, root, refVal, p);
    } else if (refVal instanceof SchemaObject) {
      if (!refVal.validate) this._compile(refVal);
      root = refVal;
    } else {
      refVal = this._schemas[id];
      if (refVal instanceof SchemaObject) {
        if (!refVal.validate) this._compile(refVal);
        if (id == normalizeId(ref))
          return { schema: refVal, root: root, baseId: baseId };
        root = refVal;
      }
    }
    if (!root.schema) return;
    baseId = getFullPath(root.schema.id);
  }
  return getJsonPointer.call(this, p, baseId, root.schema, root);
}


function resolveRecursive(root, ref, parsedRef) {
  /* jshint validthis: true */
  var res = _resolve.call(this, root, ref);
  if (res) {
    var schema = res.schema;
    var baseId = res.baseId;
    root = res.root;
    if (schema.id) baseId = resolveUrl(baseId, schema.id);
    return getJsonPointer.call(this, parsedRef, baseId, schema, root);
  }
}


var PREVENT_SCOPE_CHANGE = util.toHash(['properties', 'patternProperties', 'enum']);
function getJsonPointer(parsedRef, baseId, schema, root) {
  /* jshint validthis: true */
  parsedRef.hash = parsedRef.hash || '';
  if (parsedRef.hash.slice(0,2) != '#/') return;
  var parts = parsedRef.hash.split('/');

  for (var i = 1; i < parts.length; i++) {
    var part = parts[i];
    if (part) {
      part = unescapeFragment(part);
      schema = schema[part];
      if (!schema) break;
      if (schema.id && !PREVENT_SCOPE_CHANGE[part]) baseId = resolveUrl(baseId, schema.id);
      if (schema.$ref) {
        var $ref = resolveUrl(baseId, schema.$ref);
        var res = _resolve.call(this, root, $ref);
        if (res) {
          schema = res.schema;
          root = res.root;
        }
      }
    }
  }
  if (schema && schema != root.schema)
    return { schema: schema, root: root, baseId: baseId };
}


var SIMPLE_INLINED = util.toHash([
  'type', 'format', 'pattern',
  'maxLength', 'minLength',
  'maxProperties', 'minProperties',
  'maxItems', 'minItems',
  'maximum', 'minimum',
  'uniqueItems', 'multipleOf',
  'required', 'enum' 
]);
function inlineRef(schema, limit) {
  if (limit === undefined) return checkNoRef(schema);
  else if (limit) return countKeys(schema) <= limit;
}


function checkNoRef(schema) {
  var item;
  if (Array.isArray(schema)) {
    for (var i=0; i<schema.length; i++) {
      item = schema[i];
      if (typeof item == 'object' && !checkNoRef(item)) return false;
    }
  } else {
    for (var key in schema) {
      if (key == '$ref') return false;
      else {
        item = schema[key];
        if (typeof item == 'object' && !checkNoRef(item)) return false;
      }
    }
  }
  return true;
}


function countKeys(schema) {
  var count = 0, item;
  if (Array.isArray(schema)) {
    for (var i=0; i<schema.length; i++) {
      item = schema[i];
      if (typeof item == 'object') count += countKeys(item);
      if (count == Infinity) return Infinity;
    }
  } else {
    for (var key in schema) {
      if (key == '$ref') return Infinity;
      if (SIMPLE_INLINED[key]) count++;
      else {
        item = schema[key];
        if (typeof item == 'object') count += countKeys(item) + 1;
        if (count == Infinity) return Infinity;
      }
    }
  }
  return count;
}


function unescapeFragment(str) {
  return decodeURIComponent(str)
          .replace(/~1/g, '/')
          .replace(/~0/g, '~');
}


function escapeFragment(str) {
  str = str.replace(/~/g, '~0').replace(/\//g, '~1');
  return encodeURIComponent(str);
}


function getFullPath(id, normalize) {
  if (normalize !== false) id = normalizeId(id);
  var p = url.parse(id, false, true);
  return _getFullPath(p);
}


function _getFullPath(p) {
  return (p.protocol||'') + (p.protocol?'//':'') + (p.host||'') + (p.path||'')  + '#';
}


var TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id) {
    return id ? id.replace(TRAILING_SLASH_HASH, '') : '';
}


function resolveUrl(baseId, id) {
  id = normalizeId(id);
  return url.resolve(baseId, id);
}


function resolveIds(schema) {
  /* jshint validthis: true */
  var id = normalizeId(schema.id);
  var localRefs = {};
  _resolveIds.call(this, schema, getFullPath(id, false), id);
  return localRefs;

  function _resolveIds(schema, fullPath, baseId) {
    /* jshint validthis: true */
    if (Array.isArray(schema))
      for (var i=0; i<schema.length; i++)
        _resolveIds.call(this, schema[i], fullPath+'/'+i, baseId);
    else if (schema && typeof schema == 'object') {
      if (typeof schema.id == 'string') {
        var id = baseId = baseId
                          ? url.resolve(baseId, schema.id)
                          : normalizeId(schema.id);

        var refVal = this._refs[id];
        if (typeof refVal == 'string') refVal = this._refs[refVal];
        if (refVal && refVal.schema) {
          if (!equal(schema, refVal.schema))
            throw new Error('id "' + id + '" resolves to more than one schema');
        } else if (id != normalizeId(fullPath)) {
          if (id[0] == '#') {
            if (localRefs[id] && !equal(schema, localRefs[id]))
              throw new Error('id "' + id + '" resolves to more than one schema');
            localRefs[id] = schema;
          } else
            this._refs[id] = fullPath;
        }
      }
      for (var key in schema)
        _resolveIds.call(this, schema[key], fullPath+'/'+escapeFragment(key), baseId);
    }
  }
}

},{"./equal":16,"./schema_obj":21,"./util":22,"url":59}],20:[function(require,module,exports){
'use strict';

var ruleModules = require('./_rules')
  , util = require('./util');

var RULES = module.exports = [
  { type: 'number',
    rules: [ 'maximum', 'minimum', 'multipleOf'] },
  { type: 'string',
    rules: [ 'maxLength', 'minLength', 'pattern', 'format' ] },
  { type: 'array',
    rules: [ 'maxItems', 'minItems', 'uniqueItems', 'items' ] },
  { type: 'object',
    rules: [ 'maxProperties', 'minProperties', 'required', 'dependencies', 'properties' ] },
  { rules: [ '$ref', 'enum', 'not', 'anyOf', 'oneOf', 'allOf' ] }
];

RULES.all = [ 'type', 'additionalProperties', 'patternProperties' ];


RULES.forEach(function (group) {
  group.rules = group.rules.map(function (keyword) {
    RULES.all.push(keyword);
    return {
      keyword: keyword,
      code: ruleModules[keyword]
    };
  });
});

RULES.all = util.toHash(RULES.all);

},{"./_rules":15,"./util":22}],21:[function(require,module,exports){
'use strict';

var util = require('./util');

module.exports = SchemaObject;

function SchemaObject(obj) {
    util.copy(obj, this);
}

},{"./util":22}],22:[function(require,module,exports){
'use strict';


module.exports = {
  copy: copy,
  checkDataType: checkDataType,
  checkDataTypes: checkDataTypes,
  toHash: toHash,
  getProperty: getProperty,
  escapeQuotes: escapeQuotes,
  ucs2length: ucs2length,
  varOccurences: varOccurences,
  varReplace: varReplace,
  cleanUpCode: cleanUpCode,
  cleanUpVarErrors: cleanUpVarErrors,
  schemaHasRules: schemaHasRules,
  stableStringify: require('json-stable-stringify'),
  toQuotedString: toQuotedString,
  getPathExpr: getPathExpr,
  getPath: getPath
};


function copy(o, to) {
  to = to || {};
  for (var key in o) to[key] = o[key];
  return to;
}


function checkDataType(dataType, data, negate) {
  var EQUAL = negate ? ' !== ' : ' === '
    , AND = negate ? ' || ' : ' && '
    , OK = negate ? '!' : ''
    , NOT = negate ? '' : '!';
  switch (dataType) {
    case 'null': return data + EQUAL + 'null';
    case 'array': return OK + 'Array.isArray(' + data + ')';
    case 'object': return '(' + OK + data + AND +
                          'typeof ' + data + EQUAL + '"object"' + AND +
                          NOT + 'Array.isArray(' + data + '))';
    case 'integer': return '(typeof ' + data + EQUAL + '"number"' + AND +
                           NOT + '(' + data + ' % 1))';
    default: return 'typeof ' + data + EQUAL + '"' + dataType + '"';
  }
}


function checkDataTypes(dataTypes, data) {
  switch (dataTypes.length) {
    case 1: return checkDataType(dataTypes[0], data, true);
    default:
      var code = '';
      var types = toHash(dataTypes);
      if (types.array && types.object) {
        code = types.null ? '(': '(!' + data + ' || ';
        code += 'typeof ' + data + ' !== "object")';
        delete types.null;
        delete types.array;
        delete types.object;
      }
      if (types.number) delete types.integer;
      for (var t in types)
        code += (code ? ' && ' : '' ) + checkDataType(t, data, true);

      return code;
  }
}


function toHash(arr) {
  var hash = {};
  for (var i=0; i<arr.length; i++) hash[arr[i]] = true;
  return hash;
}


var IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
var SINGLE_QUOTE = /'|\\/g;
function getProperty(key) {
  return IDENTIFIER.test(key)
          ? '.' + key
          : "['" + key.replace(SINGLE_QUOTE, '\\$&') + "']";
}


function escapeQuotes(str) {
  return str.replace(SINGLE_QUOTE, '\\$&');
}


// https://mathiasbynens.be/notes/javascript-encoding
// https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
function ucs2length(str) {
  var length = 0
    , len = str.length
    , pos = 0
    , value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 0xD800 && value <= 0xDBFF && pos < len) {
      // high surrogate, and there is a next character
      value = str.charCodeAt(pos);
      if ((value & 0xFC00) == 0xDC00) pos++; // low surrogate
    }
  }
  return length;
}


function varOccurences(str, dataVar) {
  dataVar += '[^0-9]';
  var matches = str.match(new RegExp(dataVar, 'g'));
  return matches ? matches.length : 0;
}


function varReplace(str, dataVar, expr) {
  dataVar += '([^0-9])';
  return str.replace(new RegExp(dataVar, 'g'), expr + '$1');
}


var EMPTY_ELSE = /else\s*{\s*}/g
  , EMPTY_IF_NO_ELSE = /if\s*\([^)]+\)\s*\{\s*\}(?!\s*else)/g
  , EMPTY_IF_WITH_ELSE = /if\s*\(([^)]+)\)\s*\{\s*\}\s*else(?!\s*if)/g;
function cleanUpCode(out) {
  return out.replace(EMPTY_ELSE, '')
            .replace(EMPTY_IF_NO_ELSE, '')
            .replace(EMPTY_IF_WITH_ELSE, 'if (!($1))');
}


var ERRORS_REGEXP = /[^v\.]errors/g
  , REMOVE_ERRORS = /var errors = 0;|var vErrors = null;|validate.errors = vErrors;/g
  , RETURN_VALID = 'return errors === 0;'
  , RETURN_TRUE = 'validate.errors = null; return true;';

function cleanUpVarErrors(out) {
  var matches = out.match(ERRORS_REGEXP);
  if (matches && matches.length === 2)
    return out.replace(REMOVE_ERRORS, '')
              .replace(RETURN_VALID, RETURN_TRUE);
  else
    return out;
}


function schemaHasRules(schema, rules) {
  for (var key in schema) if (rules[key]) return true;
}


function toQuotedString (str) {
  return '\'' + escapeQuotes(str) + '\'';
}


function getPathExpr (currentPath, expr, jsonPointers, isNumber) {
  var path = jsonPointers
              ? '\'/\' + ' + expr + (isNumber ? '' : '.replace(/~/g, \'~0\').replace(/\\//g, \'~1\')')
              : (isNumber ? '\'[\' + ' + expr + ' + \']\'' : '\'[\\\'\' + ' + expr + ' + \'\\\']\'');
  return joinPaths(currentPath, path);
}


function getPath (currentPath, prop, jsonPointers) {
  var path = jsonPointers
              ? toQuotedString('/' + prop.replace(/~/g, '~0').replace(/\//g, '~1'))
              : toQuotedString(getProperty(prop));
  return joinPaths(currentPath, path);
}


function joinPaths (a, b) {
  if (a == '""') return b;
  return (a + ' + ' + b).replace(/' \+ '/g, '');
}

},{"json-stable-stringify":47}],23:[function(require,module,exports){
'use strict';
module.exports = function generate_allOf(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['allOf'],
    $schemaPath = it.schemaPath + '.' + 'allOf',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  var arr1 = $schema;
  if (arr1) {
    var $sch, $i = -1,
      l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if (it.util.schemaHasRules($sch, it.RULES.all)) {
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        out += ' ' + (it.validate($it)) + ' ';
        if ($breakOnError) {
          out += ' if (valid' + ($it.level) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces.slice(0, -1));
  }
  out = it.util.cleanUpCode(out);
  return out;
}

},{}],24:[function(require,module,exports){
'use strict';
module.exports = function generate_anyOf(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['anyOf'],
    $schemaPath = it.schemaPath + '.' + 'anyOf',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  var $noEmptySchema = $schema.every(function($sch) {
    return it.util.schemaHasRules($sch, it.RULES.all);
  });
  if ($noEmptySchema) {
    out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = false;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        out += ' ' + (it.validate($it)) + ' ' + ($valid) + ' = ' + ($valid) + ' || valid' + ($it.level) + '; if (!' + ($valid) + ') { ';
        $closingBraces += '}';
      }
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($closingBraces) + ' if (!' + ($valid) + ') {  var err =   { keyword: \'' + ('anyOf') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match some schema in anyOf\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } else { errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    if (it.opts.allErrors) {
      out += ' } ';
    }
    out = it.util.cleanUpCode(out);
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}

},{}],25:[function(require,module,exports){
'use strict';
module.exports = function generate_dependencies(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['dependencies'],
    $schemaPath = it.schemaPath + '.' + 'dependencies',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  var $schemaDeps = {},
    $propertyDeps = {};
  for ($property in $schema) {
    var $sch = $schema[$property];
    var $deps = Array.isArray($sch) ? $propertyDeps : $schemaDeps;
    $deps[$property] = $sch;
  }
  out += 'var ' + ($errs) + ' = errors;';
  for (var $property in $propertyDeps) {
    out += ' if (' + ($data) + (it.util.getProperty($property)) + ' !== undefined) { ';
    $deps = $propertyDeps[$property];
    out += ' if ( ';
    var arr1 = $deps;
    if (arr1) {
      var $dep, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $dep = arr1[$i += 1];
        if ($i) {
          out += ' || ';
        }
        out += ' ' + ($data) + (it.util.getProperty($dep)) + ' === undefined ';
      }
    }
    out += ') {  ';
    if (!it.compositeRule && $breakOnError) {
      out += ' validate.errors = [ { keyword: \'' + ('dependencies') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should have ';
        if ($deps.length == 1) {
          out += 'property ' + (it.util.escapeQuotes($deps[0]));
        } else {
          out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
        }
        out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { n: ' + ($deps.length) + ', deps: \'';
        if ($deps.length == 1) {
          out += '' + (it.util.escapeQuotes($deps[0]));
        } else {
          out += '' + (it.util.escapeQuotes($deps.join(", ")));
        }
        out += '\', property: \'' + (it.util.escapeQuotes($property)) + '\' }';
      }
      out += ' }]; return false; ';
    } else {
      out += '  var err =   { keyword: \'' + ('dependencies') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should have ';
        if ($deps.length == 1) {
          out += 'property ' + (it.util.escapeQuotes($deps[0]));
        } else {
          out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
        }
        out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { n: ' + ($deps.length) + ', deps: \'';
        if ($deps.length == 1) {
          out += '' + (it.util.escapeQuotes($deps[0]));
        } else {
          out += '' + (it.util.escapeQuotes($deps.join(", ")));
        }
        out += '\', property: \'' + (it.util.escapeQuotes($property)) + '\' }';
      }
      out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' }   ';
    if ($breakOnError) {
      $closingBraces += '}';
      out += ' else { ';
    }
    out += ' }';
  }
  for (var $property in $schemaDeps) {
    var $sch = $schemaDeps[$property];
    if (it.util.schemaHasRules($sch, it.RULES.all)) {
      out += ' valid' + ($it.level) + ' = true; if (' + ($data) + '[\'' + ($property) + '\'] !== undefined) { ';
      $it.schema = $sch;
      $it.schemaPath = $schemaPath + it.util.getProperty($property);
      out += ' ' + (it.validate($it)) + ' }  ';
      if ($breakOnError) {
        out += ' if (valid' + ($it.level) + ') { ';
        $closingBraces += '}';
      }
    }
  }
  if ($breakOnError) {
    out += '   ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  out = it.util.cleanUpCode(out);
  return out;
}

},{}],26:[function(require,module,exports){
'use strict';
module.exports = function generate_enum(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['enum'],
    $schemaPath = it.schemaPath + '.' + 'enum',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $i = 'i' + $lvl;
  out += 'var enumSchema' + ($lvl) + ' = validate.schema' + ($schemaPath) + ' , ' + ($valid) + ' = false;for (var ' + ($i) + '=0; ' + ($i) + '<enumSchema' + ($lvl) + '.length; ' + ($i) + '++) if (equal(' + ($data) + ', enumSchema' + ($lvl) + '[' + ($i) + '])) { ' + ($valid) + ' = true; break; } if (!' + ($valid) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('enum') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be equal to one of values\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('enum') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be equal to one of values\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' }';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],27:[function(require,module,exports){
'use strict';
module.exports = function generate_format(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['format'],
    $schemaPath = it.schemaPath + '.' + 'format',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $format = it.formats[$schema];
  if (it.opts.format !== false && $format) {
    out += ' if (!   ';
    if (typeof $format == 'function') {
      out += ' formats' + (it.util.getProperty($schema)) + ' (' + ($data) + ') ';
    } else {
      out += ' formats' + (it.util.getProperty($schema)) + ' .test(' + ($data) + ') ';
    }
    out += ') {  ';
    if (!it.compositeRule && $breakOnError) {
      out += ' validate.errors = [ { keyword: \'' + ('format') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match format ' + (it.util.escapeQuotes($schema)) + '\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { escaped: \'' + (it.util.escapeQuotes($schema)) + '\' }';
      }
      out += ' }]; return false; ';
    } else {
      out += '  var err =   { keyword: \'' + ('format') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match format ' + (it.util.escapeQuotes($schema)) + '\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { escaped: \'' + (it.util.escapeQuotes($schema)) + '\' }';
      }
      out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}

},{}],28:[function(require,module,exports){
'use strict';
module.exports = function generate_items(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['items'],
    $schemaPath = it.schemaPath + '.' + 'items',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  var $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt;
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if (Array.isArray($schema)) {
    var $additionalItems = it.schema.additionalItems;
    if ($additionalItems === false) {
      out += ' ' + ($valid) + ' = ' + ($data) + '.length <= ' + ($schema.length) + ';  if (!' + ($valid) + ') {  ';
      if (!it.compositeRule && $breakOnError) {
        out += ' validate.errors = [ { keyword: \'' + ('additionalItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT have more than ' + ($schema.length) + ' items\' ';
        }
        if (it.opts.verbose || it.opts.i18n) {
          out += ' , schema: false ';
        }
        if (it.opts.verbose) {
          out += ' , data: ' + ($data) + ' ';
        }
        out += '  }]; return false; ';
      } else {
        out += '  var err =   { keyword: \'' + ('additionalItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT have more than ' + ($schema.length) + ' items\' ';
        }
        if (it.opts.verbose || it.opts.i18n) {
          out += ' , schema: false ';
        }
        if (it.opts.verbose) {
          out += ' , data: ' + ($data) + ' ';
        }
        out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      out += ' }  ';
      if ($breakOnError) {
        $closingBraces += '}';
        out += ' else { ';
      }
    }
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        if (it.util.schemaHasRules($sch, it.RULES.all)) {
          out += ' valid' + ($it.level) + ' = true; if (' + ($data) + '.length > ' + ($i) + ') { ';
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + '[' + $i + ']';
          $it.errorPath = it.util.getPathExpr(it.errorPath, $i, it.opts.jsonPointers, true);
          var $passData = $data + '[' + $i + ']';
          var $code = it.validate($it);
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          out += ' }  ';
          if ($breakOnError) {
            out += ' if (valid' + ($it.level) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
    if (typeof $additionalItems == 'object' && it.util.schemaHasRules($additionalItems, it.RULES.all)) {
      $it.schema = $additionalItems;
      $it.schemaPath = it.schemaPath + '.additionalItems';
      out += ' valid' + ($it.level) + ' = true; if (' + ($data) + '.length > ' + ($schema.length) + ') {  for (var i' + ($lvl) + ' = ' + ($schema.length) + '; i' + ($lvl) + ' < ' + ($data) + '.length; i' + ($lvl) + '++) { ';
      $it.errorPath = it.util.getPathExpr(it.errorPath, 'i' + $lvl, it.opts.jsonPointers, true);
      var $passData = $data + '[i' + $lvl + ']';
      var $code = it.validate($it);
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
      } else {
        out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
      }
      if ($breakOnError) {
        out += ' if (!valid' + ($it.level) + ') break; ';
      }
      out += ' } }  ';
      if ($breakOnError) {
        out += ' if (valid' + ($it.level) + ') { ';
        $closingBraces += '}';
      }
    }
  } else if (it.util.schemaHasRules($schema, it.RULES.all)) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    out += '  for (var i' + ($lvl) + ' = ' + (0) + '; i' + ($lvl) + ' < ' + ($data) + '.length; i' + ($lvl) + '++) { ';
    $it.errorPath = it.util.getPathExpr(it.errorPath, 'i' + $lvl, it.opts.jsonPointers, true);
    var $passData = $data + '[i' + $lvl + ']';
    var $code = it.validate($it);
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    if ($breakOnError) {
      out += ' if (!valid' + ($it.level) + ') break; ';
    }
    out += ' }  ';
    if ($breakOnError) {
      out += ' if (valid' + ($it.level) + ') { ';
      $closingBraces += '}';
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  out = it.util.cleanUpCode(out);
  return out;
}

},{}],29:[function(require,module,exports){
'use strict';
module.exports = function generate_maxItems(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['maxItems'],
    $schemaPath = it.schemaPath + '.' + 'maxItems',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'if (' + ($data) + '.length > ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('maxItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have more than ' + ($schema) + ' items\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('maxItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have more than ' + ($schema) + ' items\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],30:[function(require,module,exports){
'use strict';
module.exports = function generate_maxLength(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['maxLength'],
    $schemaPath = it.schemaPath + '.' + 'maxLength',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'if ( ';
  if (it.opts.unicode === false) {
    out += ' ' + ($data) + '.length ';
  } else {
    out += ' ucs2length(' + ($data) + ') ';
  }
  out += ' > ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('maxLength') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be longer than ' + ($schema) + ' characters\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('maxLength') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be longer than ' + ($schema) + ' characters\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],31:[function(require,module,exports){
'use strict';
module.exports = function generate_maxProperties(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['maxProperties'],
    $schemaPath = it.schemaPath + '.' + 'maxProperties',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'if (Object.keys(' + ($data) + ').length > ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('maxProperties') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have more than ' + ($schema) + ' properties\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('maxProperties') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have more than ' + ($schema) + ' properties\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],32:[function(require,module,exports){
'use strict';
module.exports = function generate_maximum(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['maximum'],
    $schemaPath = it.schemaPath + '.' + 'maximum',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $exclusive = it.schema.exclusiveMaximum === true,
    $op = $exclusive ? '<' : '<=',
    $notOp = $exclusive ? '>=' : '>';
  out += 'if (' + ($data) + ' ' + ($notOp) + ' ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('maximum') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be ' + ($op) + ' ' + ($schema) + '\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    if (it.opts.i18n) {
      out += ', params: { condition: \'' + ($op) + ' ' + ($schema) + '\' }';
    }
    out += ' }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('maximum') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be ' + ($op) + ' ' + ($schema) + '\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    if (it.opts.i18n) {
      out += ', params: { condition: \'' + ($op) + ' ' + ($schema) + '\' }';
    }
    out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],33:[function(require,module,exports){
'use strict';
module.exports = function generate_minItems(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['minItems'],
    $schemaPath = it.schemaPath + '.' + 'minItems',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'if (' + ($data) + '.length < ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('minItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have less than ' + ($schema) + ' items\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('minItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have less than ' + ($schema) + ' items\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],34:[function(require,module,exports){
'use strict';
module.exports = function generate_minLength(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['minLength'],
    $schemaPath = it.schemaPath + '.' + 'minLength',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'if ( ';
  if (it.opts.unicode === false) {
    out += ' ' + ($data) + '.length ';
  } else {
    out += ' ucs2length(' + ($data) + ') ';
  }
  out += ' < ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('minLength') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be shorter than ' + ($schema) + ' characters\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('minLength') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be shorter than ' + ($schema) + ' characters\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],35:[function(require,module,exports){
'use strict';
module.exports = function generate_minProperties(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['minProperties'],
    $schemaPath = it.schemaPath + '.' + 'minProperties',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'if (Object.keys(' + ($data) + ').length < ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('minProperties') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have less than ' + ($schema) + ' properties\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('minProperties') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have less than ' + ($schema) + ' properties\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],36:[function(require,module,exports){
'use strict';
module.exports = function generate_minimum(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['minimum'],
    $schemaPath = it.schemaPath + '.' + 'minimum',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $exclusive = it.schema.exclusiveMinimum === true,
    $op = $exclusive ? '>' : '>=',
    $notOp = $exclusive ? '<=' : '<';
  out += 'if (' + ($data) + ' ' + ($notOp) + ' ' + ($schema) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('minimum') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be ' + ($op) + ' ' + ($schema) + '\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    if (it.opts.i18n) {
      out += ', params: { condition: \'' + ($op) + ' ' + ($schema) + '\' }';
    }
    out += ' }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('minimum') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be ' + ($op) + ' ' + ($schema) + '\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    if (it.opts.i18n) {
      out += ', params: { condition: \'' + ($op) + ' ' + ($schema) + '\' }';
    }
    out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],37:[function(require,module,exports){
'use strict';
module.exports = function generate_multipleOf(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['multipleOf'],
    $schemaPath = it.schemaPath + '.' + 'multipleOf',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  out += 'var division' + ($lvl) + ' = ' + ($data) + ' / ' + ($schema) + ';if (' + ($data) + ' / ' + ($schema) + ' !== parseInt(division' + ($lvl) + ')) {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('multipleOf') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be multiple of ' + ($schema) + '\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('multipleOf') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be multiple of ' + ($schema) + '\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + ($schema) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],38:[function(require,module,exports){
'use strict';
module.exports = function generate_not(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['not'],
    $schemaPath = it.schemaPath + '.' + 'not',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  if (it.util.schemaHasRules($schema, it.RULES.all)) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    out += ' var ' + ($errs) + ' = errors;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    out += ' ' + (it.validate($it)) + '  ';
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' if (valid' + ($it.level) + ') {  ';
    if (!it.compositeRule && $breakOnError) {
      out += ' validate.errors = [ { keyword: \'' + ('not') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be valid\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      out += '  }]; return false; ';
    } else {
      out += '  var err =   { keyword: \'' + ('not') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be valid\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } else { errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    if (it.opts.allErrors) {
      out += ' } ';
    }
  } else {
    out += '  var err =   { keyword: \'' + ('not') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be valid\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if ($breakOnError) {
      out += ' if (false) { ';
    }
  }
  return out;
}

},{}],39:[function(require,module,exports){
'use strict';
module.exports = function generate_oneOf(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['oneOf'],
    $schemaPath = it.schemaPath + '.' + 'oneOf',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  out += 'var ' + ($errs) + ' = errors;var prevValid' + ($lvl) + ' = false;var ' + ($valid) + ' = false; ';
  var $wasComposite = it.compositeRule;
  it.compositeRule = $it.compositeRule = true;
  var arr1 = $schema;
  if (arr1) {
    var $sch, $i = -1,
      l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if (it.util.schemaHasRules($sch, it.RULES.all)) {
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        out += ' ' + (it.validate($it)) + ' ';
      } else {
        out += ' var valid' + ($it.level) + ' = true; ';
      }
      if ($i) {
        out += ' if (valid' + ($it.level) + ' && prevValid' + ($lvl) + ') ' + ($valid) + ' = false; else { ';
        $closingBraces += '}';
      }
      out += ' if (valid' + ($it.level) + ') ' + ($valid) + ' = prevValid' + ($lvl) + ' = true;';
    }
  }
  it.compositeRule = $it.compositeRule = $wasComposite;
  out += '' + ($closingBraces) + 'if (!' + ($valid) + ') {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('oneOf') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match exactly one schema in oneOf\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('oneOf') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match exactly one schema in oneOf\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} else { errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }';
  if (it.opts.allErrors) {
    out += ' } ';
  }
  return out;
}

},{}],40:[function(require,module,exports){
'use strict';
module.exports = function generate_pattern(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['pattern'],
    $schemaPath = it.schemaPath + '.' + 'pattern',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  new RegExp($schema);
  out += 'if (! ' + (it.usePattern($schema)) + '.test(' + ($data) + ') ) {  ';
  if (!it.compositeRule && $breakOnError) {
    out += ' validate.errors = [ { keyword: \'' + ('pattern') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match pattern "' + (it.util.escapeQuotes($schema)) + '"\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    if (it.opts.i18n) {
      out += ', params: { escaped: \'' + (it.util.escapeQuotes($schema)) + '\' }';
    }
    out += ' }]; return false; ';
  } else {
    out += '  var err =   { keyword: \'' + ('pattern') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match pattern "' + (it.util.escapeQuotes($schema)) + '"\' ';
    }
    if (it.opts.verbose || it.opts.i18n) {
      out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' ';
    }
    if (it.opts.verbose) {
      out += ' , data: ' + ($data) + ' ';
    }
    if (it.opts.i18n) {
      out += ', params: { escaped: \'' + (it.util.escapeQuotes($schema)) + '\' }';
    }
    out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

},{}],41:[function(require,module,exports){
'use strict';
module.exports = function generate_properties(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['properties'],
    $schemaPath = it.schemaPath + '.' + 'properties',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  var $it = it.util.copy(it),
    $closingBraces = '';
  $it.level++;
  var $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt;
  var $schemaKeys = Object.keys($schema || {}),
    $pProperties = it.schema.patternProperties || {},
    $pPropertyKeys = Object.keys($pProperties),
    $aProperties = it.schema.additionalProperties,
    $someProperties = $schemaKeys.length || $pPropertyKeys.length,
    $noAdditional = $aProperties === false,
    $additionalIsSchema = typeof $aProperties == 'object' && Object.keys($aProperties).length,
    $removeAdditional = it.opts.removeAdditional,
    $checkAdditional = $noAdditional || $additionalIsSchema || $removeAdditional,
    $requiredProperties = it.util.toHash(it.schema.required || []);
  out += 'var ' + ($errs) + ' = errors;var valid' + ($it.level) + ' = true;';
  if ($checkAdditional) {
    out += ' for (var key' + ($lvl) + ' in ' + ($data) + ') { ';
    if ($someProperties) {
      out += ' var isAdditional' + ($lvl) + ' = !(false ';
      if ($schemaKeys.length) {
        if ($schemaKeys.length > 5) {
          out += ' || validate.schema' + ($schemaPath) + '[key' + ($lvl) + '] ';
        } else {
          var arr1 = $schemaKeys;
          if (arr1) {
            var $propertyKey, i1 = -1,
              l1 = arr1.length - 1;
            while (i1 < l1) {
              $propertyKey = arr1[i1 += 1];
              out += ' || key' + ($lvl) + ' == ' + (it.util.toQuotedString($propertyKey)) + ' ';
            }
          }
        }
      }
      if ($pPropertyKeys.length) {
        var arr2 = $pPropertyKeys;
        if (arr2) {
          var $pProperty, $i = -1,
            l2 = arr2.length - 1;
          while ($i < l2) {
            $pProperty = arr2[$i += 1];
            out += ' || ' + (it.usePattern($pProperty)) + '.test(key' + ($lvl) + ') ';
          }
        }
      }
      out += ' ); if (isAdditional' + ($lvl) + ') { ';
    }
    if ($removeAdditional == 'all') {
      out += ' delete ' + ($data) + '[key' + ($lvl) + ']; ';
    } else {
      var $currentErrorPath = it.errorPath;
      it.errorPath = it.util.getPathExpr(it.errorPath, 'key' + $lvl, it.opts.jsonPointers);
      if ($noAdditional) {
        if ($removeAdditional) {
          out += ' delete ' + ($data) + '[key' + ($lvl) + ']; ';
        } else {
          out += ' valid' + ($it.level) + ' = false;  ';
          if (!it.compositeRule && $breakOnError) {
            out += ' validate.errors = [ { keyword: \'' + ('additionalProperties') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
            if (it.opts.messages !== false) {
              out += ' , message: \'should NOT have additional properties\' ';
            }
            if (it.opts.verbose || it.opts.i18n) {
              out += ' , schema: false ';
            }
            if (it.opts.verbose) {
              out += ' , data: ' + ($data) + ' ';
            }
            out += '  }]; return false; ';
          } else {
            out += '  var err =   { keyword: \'' + ('additionalProperties') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
            if (it.opts.messages !== false) {
              out += ' , message: \'should NOT have additional properties\' ';
            }
            if (it.opts.verbose || it.opts.i18n) {
              out += ' , schema: false ';
            }
            if (it.opts.verbose) {
              out += ' , data: ' + ($data) + ' ';
            }
            out += '  }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          if ($breakOnError) {
            out += ' break; ';
          }
        }
      } else if ($additionalIsSchema) {
        if ($removeAdditional == 'failing') {
          out += ' var ' + ($errs) + ' = errors;  ';
          var $wasComposite = it.compositeRule;
          it.compositeRule = $it.compositeRule = true;
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + '.additionalProperties';
          $it.errorPath = it.errorPath;
          var $passData = $data + '[key' + $lvl + ']';
          var $code = it.validate($it);
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          out += ' if (!valid' + ($it.level) + ') { errors = ' + ($errs) + '; if (validate.errors !== null) { if (errors) validate.errors.length = errors; else validate.errors = null; } delete ' + ($data) + '[key' + ($lvl) + ']; }  ';
          it.compositeRule = $it.compositeRule = $wasComposite;
        } else {
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + '.additionalProperties';
          $it.errorPath = it.errorPath;
          var $passData = $data + '[key' + $lvl + ']';
          var $code = it.validate($it);
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          if ($breakOnError) {
            out += ' if (!valid' + ($it.level) + ') break; ';
          }
        }
      }
      it.errorPath = $currentErrorPath;
    }
    if ($someProperties) {
      out += ' } ';
    }
    out += ' }  ';
    if ($breakOnError) {
      out += ' if (valid' + ($it.level) + ') { ';
      $closingBraces += '}';
    }
  }
  if ($schemaKeys.length) {
    var arr3 = $schemaKeys;
    if (arr3) {
      var $propertyKey, i3 = -1,
        l3 = arr3.length - 1;
      while (i3 < l3) {
        $propertyKey = arr3[i3 += 1];
        var $sch = $schema[$propertyKey];
        if (it.util.schemaHasRules($sch, it.RULES.all)) {
          $it.schema = $sch;
          var $prop = it.util.getProperty($propertyKey),
            $passData = $data + $prop;
          $it.schemaPath = $schemaPath + $prop;
          $it.errorPath = it.util.getPath(it.errorPath, $propertyKey, it.opts.jsonPointers);
          var $code = it.validate($it);
          if (it.util.varOccurences($code, $nextData) < 2) {
            $code = it.util.varReplace($code, $nextData, $passData);
            var $useData = $passData;
          } else {
            var $useData = $nextData;
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ';
          }
          if ($requiredProperties[$propertyKey]) {
            out += ' if (' + ($useData) + ' === undefined) { valid' + ($it.level) + ' = false; ';
            var $currentErrorPath = it.errorPath,
              $missingProperty = it.util.escapeQuotes($propertyKey);
            it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            if (!it.compositeRule && $breakOnError) {
              out += ' validate.errors = [ { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
              if (it.opts.messages !== false) {
                out += ' , message: \'is a required property\' ';
              }
              if (it.opts.verbose || it.opts.i18n) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' ';
              }
              if (it.opts.verbose) {
                out += ' , data: ' + ($data) + ' ';
              }
              if (it.opts.i18n) {
                out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
              }
              out += ' }]; return false; ';
            } else {
              out += '  var err =   { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
              if (it.opts.messages !== false) {
                out += ' , message: \'is a required property\' ';
              }
              if (it.opts.verbose || it.opts.i18n) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' ';
              }
              if (it.opts.verbose) {
                out += ' , data: ' + ($data) + ' ';
              }
              if (it.opts.i18n) {
                out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
              }
              out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
            }
            it.errorPath = $currentErrorPath;
            out += ' } else { ';
          } else {
            if ($breakOnError) {
              out += ' if (' + ($useData) + ' === undefined) { valid' + ($it.level) + ' = true; } else { ';
            } else {
              out += ' if (' + ($useData) + ' !== undefined) { ';
            }
          }
          out += ' ' + ($code) + ' } ';
        }
        if ($breakOnError) {
          out += ' if (valid' + ($it.level) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  var arr4 = $pPropertyKeys;
  if (arr4) {
    var $pProperty, i4 = -1,
      l4 = arr4.length - 1;
    while (i4 < l4) {
      $pProperty = arr4[i4 += 1];
      var $sch = $pProperties[$pProperty];
      if (it.util.schemaHasRules($sch, it.RULES.all)) {
        $it.schema = $sch;
        $it.schemaPath = it.schemaPath + '.patternProperties' + it.util.getProperty($pProperty);
        out += ' for (var key' + ($lvl) + ' in ' + ($data) + ') { if (' + (it.usePattern($pProperty)) + '.test(key' + ($lvl) + ')) { ';
        $it.errorPath = it.util.getPathExpr(it.errorPath, 'key' + $lvl, it.opts.jsonPointers);
        var $passData = $data + '[key' + $lvl + ']';
        var $code = it.validate($it);
        if (it.util.varOccurences($code, $nextData) < 2) {
          out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
        } else {
          out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
        }
        if ($breakOnError) {
          out += ' if (!valid' + ($it.level) + ') break; ';
        }
        out += ' } ';
        if ($breakOnError) {
          out += ' else valid' + ($it.level) + ' = true; ';
        }
        out += ' }  ';
        if ($breakOnError) {
          out += ' if (valid' + ($it.level) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  out = it.util.cleanUpCode(out);
  return out;
}

},{}],42:[function(require,module,exports){
'use strict';
module.exports = function generate_ref(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['$ref'],
    $schemaPath = it.schemaPath + '.' + '$ref',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  if ($schema == '#' || $schema == '#/') {
    if (it.isRoot) {
      out += '  if (! ' + ('validate') + '(' + ($data) + ', (dataPath || \'\')';
      if (it.errorPath != '""') {
        out += ' + ' + (it.errorPath);
      }
      out += ') ) { if (vErrors === null) vErrors = ' + ('validate') + '.errors; else vErrors = vErrors.concat(' + ('validate') + '.errors); errors = vErrors.length; } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    } else {
      out += '  if (! ' + ('root.refVal[0]') + '(' + ($data) + ', (dataPath || \'\')';
      if (it.errorPath != '""') {
        out += ' + ' + (it.errorPath);
      }
      out += ') ) { if (vErrors === null) vErrors = ' + ('root.refVal[0]') + '.errors; else vErrors = vErrors.concat(' + ('root.refVal[0]') + '.errors); errors = vErrors.length; } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    }
  } else {
    var $refVal = it.resolveRef(it.baseId, $schema, it.isRoot);
    if ($refVal === undefined) {
      var $message = 'can\'t resolve reference ' + $schema + ' from id ' + it.baseId;
      if (it.opts.missingRefs == 'fail') {
        console.log($message);
        if (!it.compositeRule && $breakOnError) {
          out += ' validate.errors = [ { keyword: \'' + ('$ref') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
          if (it.opts.messages !== false) {
            out += ' , message: \'can\\\'t resolve reference ' + (it.util.escapeQuotes($schema)) + '\' ';
          }
          if (it.opts.verbose || it.opts.i18n) {
            out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' ';
          }
          if (it.opts.verbose) {
            out += ' , data: ' + ($data) + ' ';
          }
          if (it.opts.i18n) {
            out += ', params: { escaped: \'' + (it.util.escapeQuotes($schema)) + '\' }';
          }
          out += ' }]; return false; ';
        } else {
          out += '  var err =   { keyword: \'' + ('$ref') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
          if (it.opts.messages !== false) {
            out += ' , message: \'can\\\'t resolve reference ' + (it.util.escapeQuotes($schema)) + '\' ';
          }
          if (it.opts.verbose || it.opts.i18n) {
            out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' ';
          }
          if (it.opts.verbose) {
            out += ' , data: ' + ($data) + ' ';
          }
          if (it.opts.i18n) {
            out += ', params: { escaped: \'' + (it.util.escapeQuotes($schema)) + '\' }';
          }
          out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        if ($breakOnError) {
          out += ' if (false) { ';
        }
      } else if (it.opts.missingRefs == 'ignore') {
        console.log($message);
        if ($breakOnError) {
          out += ' if (true) { ';
        }
      } else {
        var $error = new Error($message);
        $error.missingRef = it.resolve.url(it.baseId, $schema);
        $error.missingSchema = it.resolve.normalizeId(it.resolve.fullPath($error.missingRef));
        throw $error;
      }
    } else if (typeof $refVal == 'string') {
      out += '  if (! ' + ($refVal) + '(' + ($data) + ', (dataPath || \'\')';
      if (it.errorPath != '""') {
        out += ' + ' + (it.errorPath);
      }
      out += ') ) { if (vErrors === null) vErrors = ' + ($refVal) + '.errors; else vErrors = vErrors.concat(' + ($refVal) + '.errors); errors = vErrors.length; } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    } else {
      var $it = it.util.copy(it),
        $closingBraces = '';
      $it.level++;
      $it.schema = $refVal.schema;
      $it.schemaPath = '';
      var $code = it.validate($it);
      if (/validate\.schema/.test($code)) {
        out += ' var rootSchema' + ($it.level) + ' = validate.schema; validate.schema = ' + ($refVal.code) + '; ' + ($code) + ' validate.schema = rootSchema' + ($it.level) + '; ';
      } else {
        out += ' ' + ($code) + ' ';
      }
      if ($breakOnError) {
        out += ' if (valid' + ($it.level) + ') { ';
      }
    }
  }
  return out;
}

},{}],43:[function(require,module,exports){
'use strict';
module.exports = function generate_required(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['required'],
    $schemaPath = it.schemaPath + '.' + 'required',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  if (it.schema.properties && Object.keys(it.schema.properties).length) {
    var $required = [];
    var arr1 = $schema;
    if (arr1) {
      var $property, i1 = -1,
        l1 = arr1.length - 1;
      while (i1 < l1) {
        $property = arr1[i1 += 1];
        var $propertySch = it.schema.properties[$property];
        if (!($propertySch && it.util.schemaHasRules($propertySch, it.RULES.all))) {
          $required[$required.length] = $property;
        }
      }
    }
  } else {
    var $required = $schema;
  }
  if ($required.length) {
    var $currentErrorPath = it.errorPath;
    if ($breakOnError) {
      out += ' var missing' + ($lvl) + '; ';
      if ($required.length <= 20) {
        out += ' if ( ';
        var arr2 = $required;
        if (arr2) {
          var $property, $i = -1,
            l2 = arr2.length - 1;
          while ($i < l2) {
            $property = arr2[$i += 1];
            if ($i) {
              out += ' || ';
            }
            var $prop = it.util.getProperty($property);
            out += ' ( ' + ($data) + ($prop) + ' === undefined && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $property : $prop)) + ') ) ';
          }
        }
        out += ') { ';
        var $propertyPath = 'missing' + $lvl,
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
        if (!it.compositeRule && $breakOnError) {
          out += ' validate.errors = [ { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
          if (it.opts.messages !== false) {
            out += ' , message: \'is a required property\' ';
          }
          if (it.opts.verbose || it.opts.i18n) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' ';
          }
          if (it.opts.verbose) {
            out += ' , data: ' + ($data) + ' ';
          }
          if (it.opts.i18n) {
            out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
          }
          out += ' }]; return false; ';
        } else {
          out += '  var err =   { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
          if (it.opts.messages !== false) {
            out += ' , message: \'is a required property\' ';
          }
          if (it.opts.verbose || it.opts.i18n) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' ';
          }
          if (it.opts.verbose) {
            out += ' , data: ' + ($data) + ' ';
          }
          if (it.opts.i18n) {
            out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
          }
          out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } else { ';
      } else {
        out += '  var schema' + ($lvl) + ' = validate.schema' + ($schemaPath) + '; ';
        var $i = 'i' + $lvl,
          $propertyPath = 'schema' + $lvl + '[' + $i + ']',
          $missingProperty = '\' + "\'" + ' + $propertyPath + ' + "\'" + \'';
        it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < schema' + ($lvl) + '.length; ' + ($i) + '++) { var ' + ($valid) + ' = ' + ($data) + '[schema' + ($lvl) + '[' + ($i) + ']] !== undefined; if (!' + ($valid) + ') break; }  if (!' + ($valid) + ') {  ';
        if (!it.compositeRule && $breakOnError) {
          out += ' validate.errors = [ { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
          if (it.opts.messages !== false) {
            out += ' , message: \'is a required property\' ';
          }
          if (it.opts.verbose || it.opts.i18n) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' ';
          }
          if (it.opts.verbose) {
            out += ' , data: ' + ($data) + ' ';
          }
          if (it.opts.i18n) {
            out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
          }
          out += ' }]; return false; ';
        } else {
          out += '  var err =   { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
          if (it.opts.messages !== false) {
            out += ' , message: \'is a required property\' ';
          }
          if (it.opts.verbose || it.opts.i18n) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' ';
          }
          if (it.opts.verbose) {
            out += ' , data: ' + ($data) + ' ';
          }
          if (it.opts.i18n) {
            out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
          }
          out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } else { ';
      }
    } else {
      if ($required.length <= 20) {
        var arr3 = $required;
        if (arr3) {
          var $property, $i = -1,
            l3 = arr3.length - 1;
          while ($i < l3) {
            $property = arr3[$i += 1];
            var $prop = it.util.getProperty($property),
              $missingProperty = it.util.escapeQuotes($prop);
            it.errorPath = it.util.getPath($currentErrorPath, $property, it.opts.jsonPointers);
            out += ' if (' + ($data) + ($prop) + ' === undefined) {  var err =   { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
            if (it.opts.messages !== false) {
              out += ' , message: \'is a required property\' ';
            }
            if (it.opts.verbose || it.opts.i18n) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' ';
            }
            if (it.opts.verbose) {
              out += ' , data: ' + ($data) + ' ';
            }
            if (it.opts.i18n) {
              out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
            }
            out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
          }
        }
      } else {
        out += '  var schema' + ($lvl) + ' = validate.schema' + ($schemaPath) + '; ';
        var $i = 'i' + $lvl,
          $propertyPath = 'schema' + $lvl + '[' + $i + ']',
          $missingProperty = '\' + "\'" + ' + $propertyPath + ' + "\'" + \'';
        it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < schema' + ($lvl) + '.length; ' + ($i) + '++) { if (' + ($data) + '[schema' + ($lvl) + '[' + ($i) + ']] === undefined) {  var err =   { keyword: \'' + ('required') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
        if (it.opts.messages !== false) {
          out += ' , message: \'is a required property\' ';
        }
        if (it.opts.verbose || it.opts.i18n) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' ';
        }
        if (it.opts.verbose) {
          out += ' , data: ' + ($data) + ' ';
        }
        if (it.opts.i18n) {
          out += ', params: { missingProperty: \'' + ($missingProperty) + '\' }';
        }
        out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } } ';
      }
    }
    it.errorPath = $currentErrorPath;
  } else if ($breakOnError) {
    out += ' if (true) {';
  }
  return out;
}

},{}],44:[function(require,module,exports){
'use strict';
module.exports = function generate_uniqueItems(it) {
  var out = ' ';
  var $lvl = it.level,
    $dataLvl = it.dataLevel,
    $schema = it.schema['uniqueItems'],
    $schemaPath = it.schemaPath + '.' + 'uniqueItems',
    $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || ''),
    $valid = 'valid' + $lvl,
    $errs = 'errs' + $lvl;
  if ($schema && it.opts.uniqueItems !== false) {
    out += ' var ' + ($valid) + ' = true; if (' + ($data) + '.length > 1) { var i = ' + ($data) + '.length, j; outer: for (;i--;) { for (j = i; j--;) { if (equal(' + ($data) + '[i], ' + ($data) + '[j])) { ' + ($valid) + ' = false; break outer; } } } } if (!' + ($valid) + ') {  ';
    if (!it.compositeRule && $breakOnError) {
      out += ' validate.errors = [ { keyword: \'' + ('uniqueItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT have duplicate items (items ## \' + j + \' and \' + i + \' are identical)\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: ' + ($schema) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { i: i, j: j }';
      }
      out += ' }]; return false; ';
    } else {
      out += '  var err =   { keyword: \'' + ('uniqueItems') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT have duplicate items (items ## \' + j + \' and \' + i + \' are identical)\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: ' + ($schema) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { i: i, j: j }';
      }
      out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}

},{}],45:[function(require,module,exports){
'use strict';
module.exports = function generate_validate(it) {
  var out = '';
  if (it.isTop) {
    var $top = it.isTop,
      $lvl = it.level = 0,
      $dataLvl = it.dataLevel = 0,
      $data = 'data';
    it.rootId = it.resolve.fullPath(it.root.schema.id);
    it.baseId = it.baseId || it.rootId;
    delete it.isTop;
    out += ' validate = function (data, dataPath) { \'use strict\'; var vErrors = null; ';
    out += ' var errors = 0;     ';
  } else {
    var $lvl = it.level,
      $dataLvl = it.dataLevel,
      $data = 'data' + ($dataLvl || '');
    if (it.schema.id) it.baseId = it.resolve.url(it.baseId, it.schema.id);
    out += ' var errs_' + ($lvl) + ' = errors;';
  }
  var $valid = 'valid' + $lvl,
    $breakOnError = !it.opts.allErrors,
    $closingBraces1 = '',
    $closingBraces2 = '';
  var $typeSchema = it.schema.type;
  var arr1 = it.RULES;
  if (arr1) {
    var $rulesGroup, i1 = -1,
      l1 = arr1.length - 1;
    while (i1 < l1) {
      $rulesGroup = arr1[i1 += 1];
      if ($shouldUseGroup($rulesGroup)) {
        if ($rulesGroup.type) {
          out += ' if (' + (it.util.checkDataType($rulesGroup.type, $data)) + ') { ';
        }
        var arr2 = $rulesGroup.rules;
        if (arr2) {
          var $rule, i2 = -1,
            l2 = arr2.length - 1;
          while (i2 < l2) {
            $rule = arr2[i2 += 1];
            if ($shouldUseRule($rule)) {
              out += ' ' + ($rule.code(it)) + ' ';
              if ($breakOnError) {
                $closingBraces1 += '}';
              }
            }
          }
        }
        if ($breakOnError) {
          out += ' ' + ($closingBraces1) + ' ';
          $closingBraces1 = '';
        }
        if ($rulesGroup.type) {
          out += ' } ';
          if ($typeSchema && $typeSchema === $rulesGroup.type) {
            var $typeChecked = true;
            out += ' else {  ';
            if (!it.compositeRule && $breakOnError) {
              out += ' validate.errors = [ { keyword: \'' + ('type') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
              if (it.opts.messages !== false) {
                out += ' , message: \'should be ';
                if ($isArray) {
                  out += '' + ($typeSchema.join(","));
                } else {
                  out += '' + ($typeSchema);
                }
                out += '\' ';
              }
              if (it.opts.verbose || it.opts.i18n) {
                out += ' , schema: ';
                if ($isArray) {
                  out += '[\'' + ($typeSchema.join("','")) + '\']';
                } else {
                  out += '\'' + ($typeSchema) + '\'';
                }
              }
              if (it.opts.verbose) {
                out += ' , data: ' + ($data) + ' ';
              }
              if (it.opts.i18n) {
                out += ', params: { type: \'';
                if ($isArray) {
                  out += '' + ($typeSchema.join(","));
                } else {
                  out += '' + ($typeSchema);
                }
                out += '\' }';
              }
              out += ' }]; return false; ';
            } else {
              out += '  var err =   { keyword: \'' + ('type') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
              if (it.opts.messages !== false) {
                out += ' , message: \'should be ';
                if ($isArray) {
                  out += '' + ($typeSchema.join(","));
                } else {
                  out += '' + ($typeSchema);
                }
                out += '\' ';
              }
              if (it.opts.verbose || it.opts.i18n) {
                out += ' , schema: ';
                if ($isArray) {
                  out += '[\'' + ($typeSchema.join("','")) + '\']';
                } else {
                  out += '\'' + ($typeSchema) + '\'';
                }
              }
              if (it.opts.verbose) {
                out += ' , data: ' + ($data) + ' ';
              }
              if (it.opts.i18n) {
                out += ', params: { type: \'';
                if ($isArray) {
                  out += '' + ($typeSchema.join(","));
                } else {
                  out += '' + ($typeSchema);
                }
                out += '\' }';
              }
              out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
            }
            out += ' } ';
          }
        }
        if ($breakOnError) {
          out += ' if (errors === ';
          if ($top) {
            out += '0';
          } else {
            out += 'errs_' + ($lvl);
          }
          out += ') { ';
          $closingBraces2 += '}';
        }
      }
    }
  }
  if ($typeSchema && !$typeChecked) {
    var $schemaPath = it.schemaPath + '.type',
      $isArray = Array.isArray($typeSchema),
      $method = $isArray ? 'checkDataTypes' : 'checkDataType';
    out += ' if (' + (it.util[$method]($typeSchema, $data, true)) + ') {  ';
    if (!it.compositeRule && $breakOnError) {
      out += ' validate.errors = [ { keyword: \'' + ('type') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should be ';
        if ($isArray) {
          out += '' + ($typeSchema.join(","));
        } else {
          out += '' + ($typeSchema);
        }
        out += '\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: ';
        if ($isArray) {
          out += '[\'' + ($typeSchema.join("','")) + '\']';
        } else {
          out += '\'' + ($typeSchema) + '\'';
        }
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { type: \'';
        if ($isArray) {
          out += '' + ($typeSchema.join(","));
        } else {
          out += '' + ($typeSchema);
        }
        out += '\' }';
      }
      out += ' }]; return false; ';
    } else {
      out += '  var err =   { keyword: \'' + ('type') + '\', dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should be ';
        if ($isArray) {
          out += '' + ($typeSchema.join(","));
        } else {
          out += '' + ($typeSchema);
        }
        out += '\' ';
      }
      if (it.opts.verbose || it.opts.i18n) {
        out += ' , schema: ';
        if ($isArray) {
          out += '[\'' + ($typeSchema.join("','")) + '\']';
        } else {
          out += '\'' + ($typeSchema) + '\'';
        }
      }
      if (it.opts.verbose) {
        out += ' , data: ' + ($data) + ' ';
      }
      if (it.opts.i18n) {
        out += ', params: { type: \'';
        if ($isArray) {
          out += '' + ($typeSchema.join(","));
        } else {
          out += '' + ($typeSchema);
        }
        out += '\' }';
      }
      out += ' }; if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' }';
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces2) + ' ';
  }
  if ($top) {
    out += ' validate.errors = vErrors; ';
    out += ' return errors === 0;       ';
    out += ' }';
  } else {
    out += ' var ' + ($valid) + ' = errors === errs_' + ($lvl) + ';';
  }
  out = it.util.cleanUpCode(out);
  if ($top && $breakOnError) {
    out = it.util.cleanUpVarErrors(out);
  }

  function $shouldUseGroup($rulesGroup) {
    for (var i = 0; i < $rulesGroup.rules.length; i++)
      if ($shouldUseRule($rulesGroup.rules[i])) return true;
  }

  function $shouldUseRule($rule) {
    return it.schema[$rule.keyword] !== undefined || ($rule.keyword == 'properties' && (it.schema.additionalProperties === false || typeof it.schema.additionalProperties == 'object' || (it.schema.patternProperties && Object.keys(it.schema.patternProperties).length)));
  }
  return out;
}

},{}],46:[function(require,module,exports){
module.exports={
    "id": "http://json-schema.org/draft-04/schema#",
    "$schema": "http://json-schema.org/draft-04/schema#",
    "description": "Core schema meta-schema",
    "definitions": {
        "schemaArray": {
            "type": "array",
            "minItems": 1,
            "items": { "$ref": "#" }
        },
        "positiveInteger": {
            "type": "integer",
            "minimum": 0
        },
        "positiveIntegerDefault0": {
            "allOf": [ { "$ref": "#/definitions/positiveInteger" }, { "default": 0 } ]
        },
        "simpleTypes": {
            "enum": [ "array", "boolean", "integer", "null", "number", "object", "string" ]
        },
        "stringArray": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1,
            "uniqueItems": true
        }
    },
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "format": "uri"
        },
        "$schema": {
            "type": "string",
            "format": "uri"
        },
        "title": {
            "type": "string"
        },
        "description": {
            "type": "string"
        },
        "default": {},
        "multipleOf": {
            "type": "number",
            "minimum": 0,
            "exclusiveMinimum": true
        },
        "maximum": {
            "type": "number"
        },
        "exclusiveMaximum": {
            "type": "boolean",
            "default": false
        },
        "minimum": {
            "type": "number"
        },
        "exclusiveMinimum": {
            "type": "boolean",
            "default": false
        },
        "maxLength": { "$ref": "#/definitions/positiveInteger" },
        "minLength": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "pattern": {
            "type": "string",
            "format": "regex"
        },
        "additionalItems": {
            "anyOf": [
                { "type": "boolean" },
                { "$ref": "#" }
            ],
            "default": {}
        },
        "items": {
            "anyOf": [
                { "$ref": "#" },
                { "$ref": "#/definitions/schemaArray" }
            ],
            "default": {}
        },
        "maxItems": { "$ref": "#/definitions/positiveInteger" },
        "minItems": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "uniqueItems": {
            "type": "boolean",
            "default": false
        },
        "maxProperties": { "$ref": "#/definitions/positiveInteger" },
        "minProperties": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "required": { "$ref": "#/definitions/stringArray" },
        "additionalProperties": {
            "anyOf": [
                { "type": "boolean" },
                { "$ref": "#" }
            ],
            "default": {}
        },
        "definitions": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "properties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "patternProperties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "dependencies": {
            "type": "object",
            "additionalProperties": {
                "anyOf": [
                    { "$ref": "#" },
                    { "$ref": "#/definitions/stringArray" }
                ]
            }
        },
        "enum": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true
        },
        "type": {
            "anyOf": [
                { "$ref": "#/definitions/simpleTypes" },
                {
                    "type": "array",
                    "items": { "$ref": "#/definitions/simpleTypes" },
                    "minItems": 1,
                    "uniqueItems": true
                }
            ]
        },
        "allOf": { "$ref": "#/definitions/schemaArray" },
        "anyOf": { "$ref": "#/definitions/schemaArray" },
        "oneOf": { "$ref": "#/definitions/schemaArray" },
        "not": { "$ref": "#" }
    },
    "dependencies": {
        "exclusiveMaximum": [ "maximum" ],
        "exclusiveMinimum": [ "minimum" ]
    },
    "default": {}
}

},{}],47:[function(require,module,exports){
var json = typeof JSON !== 'undefined' ? JSON : require('jsonify');

module.exports = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};

},{"jsonify":48}],48:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":49,"./lib/stringify":50}],49:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],50:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}],51:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":52,"ieee754":53,"is-array":54}],52:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],53:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],54:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],55:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],56:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],57:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],58:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":56,"./encode":57}],59:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":55,"querystring":58}],60:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
};
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
};
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
};
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
};
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)
},{"buffer":51}],61:[function(require,module,exports){
// Copyright 2014, 2015 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

// This regex comes from regex.coffee, and is inserted here by generate-index.js
// (run `npm run build`).
module.exports = /((['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?)|(\/\/.*)|(\/\*(?:[^*]|\*(?!\/))*(\*\/)?)|(\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyu]{1,5}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))|((?:0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?))|((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]{1,6}\})+)|(--|\+\+|&&|\|\||=>|\.{3}|(?:[+\-*\/%&|^]|<{1,2}|>{1,3}|!=?|={1,2})=?|[?:~]|[;,.[\](){}])|(\s+)|(^$|[\s\S])/g

module.exports.matchToToken = function(match) {
  var token = {type: "invalid", value: match[0]}
       if (match[ 1]) token.type = "string" , token.closed = !!(match[3] || match[4])
  else if (match[ 5]) token.type = "comment"
  else if (match[ 6]) token.type = "comment", token.closed = !!match[7]
  else if (match[ 8]) token.type = "regex"
  else if (match[ 9]) token.type = "number"
  else if (match[10]) token.type = "name"
  else if (match[11]) token.type = "punctuator"
  else if (match[12]) token.type = "whitespace"
  return token
}

},{}]},{},[1]);
