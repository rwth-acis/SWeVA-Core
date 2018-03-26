(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var DefinitionError = require('../../core/errors/definitionError.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');
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
},{"../../../node_modules/clone/clone.js":52,"../../core/errors/ExecutionError.js":5,"../../core/errors/definitionError.js":6}],2:[function(require,module,exports){
'use strict';

var Composable = require('../../core/composables/composable.js');
var Module = require('../../core/composables/module.js');
var DefinitionError = require('../../core/errors/definitionError.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

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
},{"../../core/composables/composable.js":1,"../../core/composables/module.js":3,"../../core/errors/ExecutionError.js":5,"../../core/errors/definitionError.js":6}],3:[function(require,module,exports){
'use strict';

var Composable = require('../../core/composables/composable.js');
var DefinitionError = require('../../core/errors/definitionError.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

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

  // compute node type

  this.initializeFunction(initializationObject, 'compute', 3, null);

  // synchronous request node type

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

  // now the asynchronous node type

  this.initializeFunction(initializationObject, 'subscribe', 3, null);

  this.initializeFunction(initializationObject, 'onConnect', 3, null);

  this.initializeFunction(initializationObject, 'onSubscription', 3, null);

  this.initializeFunction(initializationObject, 'onMessageReceived', 2, null);
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
};

/**
 * This one subscribes to a topic on a message queue.
 *
 * @param subscribe
 * @param input
 */
Module.prototype.callSubscription = function(subscribe, input) {
  var self = this;

  debugger;
  return new Promise(function(resolve, reject) {
    var client = subscribe;
    client.on('connect', function() { self.onConnect(client, input, sweva.libs); });
    client.on('message', function(topic, message) { self.onMessageReceived(topic, message) });

    resolve();

    /*.then(function() {
        resolve(self.onMessageReceived(client, input, sweva.libs));
      }).catch(function(onSubscription) {
        // if we have a function to deal with errors from service directly...
        if (typeof self.requestError === 'function') {
          resolve(self.requestError(response, input, sweva.libs));
        } else {
          reject(onSubscription);
        }
      }));
      */
  });
};

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

      if (typeof self.compute === 'function') {
        // if a computation function is defined, then skip service calls and compute locally
        var result = self.compute(data, input, sweva.libs);
        if (self.validateTypes('dataOut', result)) {
          //report progress, if callback is defined
          if (typeof progress !== 'undefined') {
            progress(alias, self.name, context);
          }
          resolve(result);
        } else {
          reject(sweva.ErrorManager.getLastError());
        }

      } else if (typeof self.subscribe === 'function') {
        // this is subscribing to an asynchronous message queue

        self.callSubscription(self.subscribe(data, input, sweva.libs)).then(function(output) {
          //validate output
          if (self.validateTypes('dataOut', output)) {
            //report progress, if callback is defined
            if (typeof progress !== 'undefined') {

              progress(alias, self.name, context);
            }

            resolve(output);
          } else {
            reject(sweva.ErrorManager.getLastError());
          }
        }).catch(function (error) {
          sweva.ErrorManager.error(
            new ExecutionError('Something unexpected happened: ' + error,
              context, error));
          reject(sweva.ErrorManager.getLastError());
        });
      } else if (typeof self.request === 'function') {
        // this is an HTTP request node, call service using an HTTP request

        self.callService(self.request(data, input, sweva.libs), input).then(function() {
          // the output is already the HTTP response

          //validate output
          if (self.validateTypes('dataOut', output)) {
            //report progress, if callback is defined
            if (typeof progress !== 'undefined') {

              progress(alias, self.name, context);
            }

            resolve(output);
          } else {
            reject(sweva.ErrorManager.getLastError());
          }
        }).catch(function (error) {
          sweva.ErrorManager.error(
            new ExecutionError('Something unexpected happened: ' + error,
              context, error));
          reject(sweva.ErrorManager.getLastError());
        });
      }
    } else {
      reject(sweva.ErrorManager.getLastError());
    }
  });
};

module.exports = Module;
},{"../../core/composables/composable.js":1,"../../core/errors/ExecutionError.js":5,"../../core/errors/definitionError.js":6}],4:[function(require,module,exports){
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
globalObject.sweva.asyncmqtt = require('../../node_modules/async-mqtt');

var Ajv = require('../../node_modules/ajv/lib/ajv.js');
globalObject.sweva.Ajv = new Ajv();

var ComposableLoader = require('../../app/core/execution/composableLoader.js');
globalObject.sweva.ComposableLoader = new ComposableLoader('');

globalObject.sweva.ExecutionManager = require('../../app/core/execution/executionManager.js');

var ErrorManager = require('../../app/core/errors/errorManager.js');
globalObject.sweva.ErrorManager = new ErrorManager();

var SwevaScript = require('../../app/core/swevaScript/swevaScript.js');
globalObject.sweva.SwevaScript = new SwevaScript();

globalObject.sweva.libs = {
    axios: globalObject.sweva.axios,
    mqtt: globalObject.sweva.asyncmqtt,
    get: globalObject.sweva.SwevaScript.get,
    set: globalObject.sweva.SwevaScript.set,
    //mqttclient: globalObject.sweva.SwevaScript.client,
    //mqttsubscribe: globalObject.sweva.SwevaScript.subscribe,
    adddata: globalObject.sweva.SwevaScript.adddata
}





},{"../../app/core/errors/errorManager.js":7,"../../app/core/execution/composableLoader.js":9,"../../app/core/execution/executionManager.js":10,"../../app/core/swevaScript/swevaScript.js":11,"../../bower_components/axios/dist/axios.min.js":12,"../../node_modules/ajv/lib/ajv.js":13,"../../node_modules/async-mqtt":47}],5:[function(require,module,exports){
'use strict';

var SwevaError = require('../../core/errors/swevaError.js');
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
},{"../../core/errors/swevaError.js":8}],6:[function(require,module,exports){
'use strict';

var SwevaError = require('../../core/errors/swevaError.js');
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
},{"../../core/errors/swevaError.js":8}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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

var Module = require('../../core/composables/module.js');
var Composition = require('../../core/composables/composition.js');
var DefinitionError = require('../../core/errors/definitionError.js');

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
},{"../../core/composables/composition.js":2,"../../core/composables/module.js":3,"../../core/errors/definitionError.js":6}],10:[function(require,module,exports){
'use strict';

var ExecutionError = require('../../core/errors/ExecutionError.js');
var Module = require('../../core/composables/module.js');
var Composition = require('../../core/composables/composition.js');
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
},{"../../core/composables/composition.js":2,"../../core/composables/module.js":3,"../../core/errors/ExecutionError.js":5}],11:[function(require,module,exports){
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
};

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
};



 SwevaScript.prototype.client =  function(broker){
     return sweva.asyncmqtt.connect(broker);//asyncClient.
};

 

  SwevaScript.prototype.subscribe  =   function (client , topic, mqttcallback, libs){

      var old_mqttcallback = mqttcallback;
      mqttcallback = function (topic, message) {
         old_mqttcallback(topic, message)
         console.log(this);
      };

      var promise = new Promise(function(resolve, reject) {
       client.on('connect', function () {
         client.subscribe(topic);
         client.on('message', mqttcallback.bind(sweva.libs));
          resolve(client);
       });
     });

     return promise;

  };

SwevaScript.prototype.adddata =  function(node, topic, message){
  self.sweva.ee(self.sweva.ExecutionManager.prototype);
  var emmiter = new self.sweva.ExecutionManager();
  //emmiter.emit('onMessageArrived', node, topic, message)
};





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
},{"../../../node_modules/js-tokens/index.js":62}],12:[function(require,module,exports){
/* axios v0.7.0 | (c) 2015 by Matt Zabriskie */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.axios=t():e.axios=t()}(this,function(){return function(e){function t(r){if(n[r])return n[r].exports;var o=n[r]={exports:{},id:r,loaded:!1};return e[r].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}var n={};return t.m=e,t.c=n,t.p="",t(0)}([function(e,t,n){e.exports=n(1)},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(4),s=n(12),u=e.exports=function(e){"string"==typeof e&&(e=o.merge({url:arguments[0]},arguments[1])),e=o.merge({method:"get",headers:{},timeout:r.timeout,transformRequest:r.transformRequest,transformResponse:r.transformResponse},e),e.withCredentials=e.withCredentials||r.withCredentials;var t=[i,void 0],n=Promise.resolve(e);for(u.interceptors.request.forEach(function(e){t.unshift(e.fulfilled,e.rejected)}),u.interceptors.response.forEach(function(e){t.push(e.fulfilled,e.rejected)});t.length;)n=n.then(t.shift(),t.shift());return n};u.defaults=r,u.all=function(e){return Promise.all(e)},u.spread=n(13),u.interceptors={request:new s,response:new s},function(){function e(){o.forEach(arguments,function(e){u[e]=function(t,n){return u(o.merge(n||{},{method:e,url:t}))}})}function t(){o.forEach(arguments,function(e){u[e]=function(t,n,r){return u(o.merge(r||{},{method:e,url:t,data:n}))}})}e("delete","get","head"),t("post","put","patch")}()},function(e,t,n){"use strict";var r=n(3),o=/^\)\]\}',?\n/,i={"Content-Type":"application/x-www-form-urlencoded"};e.exports={transformRequest:[function(e,t){return r.isFormData(e)?e:r.isArrayBuffer(e)?e:r.isArrayBufferView(e)?e.buffer:!r.isObject(e)||r.isFile(e)||r.isBlob(e)?e:(r.isUndefined(t)||(r.forEach(t,function(e,n){"content-type"===n.toLowerCase()&&(t["Content-Type"]=e)}),r.isUndefined(t["Content-Type"])&&(t["Content-Type"]="application/json;charset=utf-8")),JSON.stringify(e))}],transformResponse:[function(e){if("string"==typeof e){e=e.replace(o,"");try{e=JSON.parse(e)}catch(t){}}return e}],headers:{common:{Accept:"application/json, text/plain, */*"},patch:r.merge(i),post:r.merge(i),put:r.merge(i)},timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN"}},function(e,t){"use strict";function n(e){return"[object Array]"===v.call(e)}function r(e){return"[object ArrayBuffer]"===v.call(e)}function o(e){return"[object FormData]"===v.call(e)}function i(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer}function s(e){return"string"==typeof e}function u(e){return"number"==typeof e}function a(e){return"undefined"==typeof e}function f(e){return null!==e&&"object"==typeof e}function c(e){return"[object Date]"===v.call(e)}function p(e){return"[object File]"===v.call(e)}function l(e){return"[object Blob]"===v.call(e)}function d(e){return e.replace(/^\s*/,"").replace(/\s*$/,"")}function h(e){return"[object Arguments]"===v.call(e)}function m(){return"undefined"!=typeof window&&"undefined"!=typeof document&&"function"==typeof document.createElement}function y(e,t){if(null!==e&&"undefined"!=typeof e){var r=n(e)||h(e);if("object"==typeof e||r||(e=[e]),r)for(var o=0,i=e.length;i>o;o++)t.call(null,e[o],o,e);else for(var s in e)e.hasOwnProperty(s)&&t.call(null,e[s],s,e)}}function g(){var e={};return y(arguments,function(t){y(t,function(t,n){e[n]=t})}),e}var v=Object.prototype.toString;e.exports={isArray:n,isArrayBuffer:r,isFormData:o,isArrayBufferView:i,isString:s,isNumber:u,isObject:f,isUndefined:a,isDate:c,isFile:p,isBlob:l,isStandardBrowserEnv:m,forEach:y,merge:g,trim:d}},function(e,t,n){(function(t){"use strict";e.exports=function(e){return new Promise(function(r,o){try{"undefined"!=typeof XMLHttpRequest||"undefined"!=typeof ActiveXObject?n(6)(r,o,e):"undefined"!=typeof t&&n(6)(r,o,e)}catch(i){o(i)}})}}).call(t,n(5))},function(e,t){function n(){f=!1,s.length?a=s.concat(a):c=-1,a.length&&r()}function r(){if(!f){var e=setTimeout(n);f=!0;for(var t=a.length;t;){for(s=a,a=[];++c<t;)s&&s[c].run();c=-1,t=a.length}s=null,f=!1,clearTimeout(e)}}function o(e,t){this.fun=e,this.array=t}function i(){}var s,u=e.exports={},a=[],f=!1,c=-1;u.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];a.push(new o(e,t)),1!==a.length||f||setTimeout(r,0)},o.prototype.run=function(){this.fun.apply(null,this.array)},u.title="browser",u.browser=!0,u.env={},u.argv=[],u.version="",u.versions={},u.on=i,u.addListener=i,u.once=i,u.off=i,u.removeListener=i,u.removeAllListeners=i,u.emit=i,u.binding=function(e){throw new Error("process.binding is not supported")},u.cwd=function(){return"/"},u.chdir=function(e){throw new Error("process.chdir is not supported")},u.umask=function(){return 0}},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(7),s=n(8),u=n(9);e.exports=function(e,t,a){var f=u(a.data,a.headers,a.transformRequest),c=o.merge(r.headers.common,r.headers[a.method]||{},a.headers||{});o.isFormData(f)&&delete c["Content-Type"];var p=new(XMLHttpRequest||ActiveXObject)("Microsoft.XMLHTTP");if(p.open(a.method.toUpperCase(),i(a.url,a.params),!0),p.timeout=a.timeout,p.onreadystatechange=function(){if(p&&4===p.readyState){var n=s(p.getAllResponseHeaders()),r=-1!==["text",""].indexOf(a.responseType||"")?p.responseText:p.response,o={data:u(r,n,a.transformResponse),status:p.status,statusText:p.statusText,headers:n,config:a};(p.status>=200&&p.status<300?e:t)(o),p=null}},o.isStandardBrowserEnv()){var l=n(10),d=n(11),h=d(a.url)?l.read(a.xsrfCookieName||r.xsrfCookieName):void 0;h&&(c[a.xsrfHeaderName||r.xsrfHeaderName]=h)}if(o.forEach(c,function(e,t){f||"content-type"!==t.toLowerCase()?p.setRequestHeader(t,e):delete c[t]}),a.withCredentials&&(p.withCredentials=!0),a.responseType)try{p.responseType=a.responseType}catch(m){if("json"!==p.responseType)throw m}o.isArrayBuffer(f)&&(f=new DataView(f)),p.send(f)}},function(e,t,n){"use strict";function r(e){return encodeURIComponent(e).replace(/%40/gi,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}var o=n(3);e.exports=function(e,t){if(!t)return e;var n=[];return o.forEach(t,function(e,t){null!==e&&"undefined"!=typeof e&&(o.isArray(e)&&(t+="[]"),o.isArray(e)||(e=[e]),o.forEach(e,function(e){o.isDate(e)?e=e.toISOString():o.isObject(e)&&(e=JSON.stringify(e)),n.push(r(t)+"="+r(e))}))}),n.length>0&&(e+=(-1===e.indexOf("?")?"?":"&")+n.join("&")),e}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e){var t,n,o,i={};return e?(r.forEach(e.split("\n"),function(e){o=e.indexOf(":"),t=r.trim(e.substr(0,o)).toLowerCase(),n=r.trim(e.substr(o+1)),t&&(i[t]=i[t]?i[t]+", "+n:n)}),i):i}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e,t,n){return r.forEach(n,function(n){e=n(e,t)}),e}},function(e,t,n){"use strict";var r=n(3);e.exports={write:function(e,t,n,o,i,s){var u=[];u.push(e+"="+encodeURIComponent(t)),r.isNumber(n)&&u.push("expires="+new Date(n).toGMTString()),r.isString(o)&&u.push("path="+o),r.isString(i)&&u.push("domain="+i),s===!0&&u.push("secure"),document.cookie=u.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}},function(e,t,n){"use strict";function r(e){var t=e;return s&&(u.setAttribute("href",t),t=u.href),u.setAttribute("href",t),{href:u.href,protocol:u.protocol?u.protocol.replace(/:$/,""):"",host:u.host,search:u.search?u.search.replace(/^\?/,""):"",hash:u.hash?u.hash.replace(/^#/,""):"",hostname:u.hostname,port:u.port,pathname:"/"===u.pathname.charAt(0)?u.pathname:"/"+u.pathname}}var o,i=n(3),s=/(msie|trident)/i.test(navigator.userAgent),u=document.createElement("a");o=r(window.location.href),e.exports=function(e){var t=i.isString(e)?r(e):e;return t.protocol===o.protocol&&t.host===o.host}},function(e,t,n){"use strict";function r(){this.handlers=[]}var o=n(3);r.prototype.use=function(e,t){return this.handlers.push({fulfilled:e,rejected:t}),this.handlers.length-1},r.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},r.prototype.forEach=function(e){o.forEach(this.handlers,function(t){null!==t&&e(t)})},e.exports=r},function(e,t){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}}])});

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

},{"./cache":14,"./compile":18,"./compile/formats":17,"./compile/resolve":19,"./compile/schema_obj":21,"./refs/json-schema-draft-04.json":46,"json-stable-stringify":63}],14:[function(require,module,exports){
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

},{"./equal":16,"./schema_obj":21,"./util":22,"url":122}],20:[function(require,module,exports){
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

},{"json-stable-stringify":63}],23:[function(require,module,exports){
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
"use strict";
var mqtt = require("mqtt");
var inArray = require("in-array");

var RegularClientPrototype = mqtt.MqttClient.prototype;

var ASYNC_METHODS = ["publish",
	"subscribe",
	"unsubscribe",
	"unsubscribe",
	"end"
];

var SYNC_METHODS = [
	"emit",
	"addListener",
	"on",
	"once",
	"removeListener",
	"removeAllListeners",
	"setMaxListeners",
	"getMaxListeners",
	"listeners",
	"listenerCount"
];

module.exports = {
	connect: connect,
	AsyncClient: AsyncClient
};

function connect(brokerURL, opts) {
	var client = mqtt.connect(brokerURL, opts);

	var asyncClient = new AsyncClient(client);

	return asyncClient;
}

function AsyncClient(client) {
	this._client = client;
}

AsyncClient.prototype = {
	set handleMessage(newHandler) {
		this._client.handleMessage = newHandler;
	},
	get handleMessage() {
		return this._client.handleMessage;
	}
};

ASYNC_METHODS.forEach(defineAsync);
SYNC_METHODS.forEach(definePassthrough);

function definePassthrough(name) {
	AsyncClient.prototype[name] = function() {
		var client = this._client;
		return client[name].apply(client, arguments);
	};
}

function defineAsync(name) {
	AsyncClient.prototype[name] = function asyncMethod() {
		var client = this._client;
		var args = [];
		var length = arguments.length;
		var i = 0;
		for (i; i < length; i++)
			args.push(arguments[i]);

		return new Promise(function(resolve, reject) {
			args.push(makeCallback(resolve, reject));
			client[name].apply(client, args);
		});
	};
}

function makeCallback(resolve, reject) {
	return function(err, data) {
		if (err)
			reject(err);
		else resolve(data);
	};
}

},{"in-array":58,"mqtt":85}],48:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = ((uint8[i] << 16) & 0xFF0000) + ((uint8[i + 1] << 8) & 0xFF00) + (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],49:[function(require,module,exports){

},{}],50:[function(require,module,exports){
(function (global){
'use strict';

var buffer = require('buffer');
var Buffer = buffer.Buffer;
var SlowBuffer = buffer.SlowBuffer;
var MAX_LEN = buffer.kMaxLength || 2147483647;
exports.alloc = function alloc(size, fill, encoding) {
  if (typeof Buffer.alloc === 'function') {
    return Buffer.alloc(size, fill, encoding);
  }
  if (typeof encoding === 'number') {
    throw new TypeError('encoding must not be number');
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  var enc = encoding;
  var _fill = fill;
  if (_fill === undefined) {
    enc = undefined;
    _fill = 0;
  }
  var buf = new Buffer(size);
  if (typeof _fill === 'string') {
    var fillBuf = new Buffer(_fill, enc);
    var flen = fillBuf.length;
    var i = -1;
    while (++i < size) {
      buf[i] = fillBuf[i % flen];
    }
  } else {
    buf.fill(_fill);
  }
  return buf;
}
exports.allocUnsafe = function allocUnsafe(size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    return Buffer.allocUnsafe(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new Buffer(size);
}
exports.from = function from(value, encodingOrOffset, length) {
  if (typeof Buffer.from === 'function' && (!global.Uint8Array || Uint8Array.from !== Buffer.from)) {
    return Buffer.from(value, encodingOrOffset, length);
  }
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number');
  }
  if (typeof value === 'string') {
    return new Buffer(value, encodingOrOffset);
  }
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    var offset = encodingOrOffset;
    if (arguments.length === 1) {
      return new Buffer(value);
    }
    if (typeof offset === 'undefined') {
      offset = 0;
    }
    var len = length;
    if (typeof len === 'undefined') {
      len = value.byteLength - offset;
    }
    if (offset >= value.byteLength) {
      throw new RangeError('\'offset\' is out of bounds');
    }
    if (len > value.byteLength - offset) {
      throw new RangeError('\'length\' is out of bounds');
    }
    return new Buffer(value.slice(offset, offset + len));
  }
  if (Buffer.isBuffer(value)) {
    var out = new Buffer(value.length);
    value.copy(out, 0, 0, value.length);
    return out;
  }
  if (value) {
    if (Array.isArray(value) || (typeof ArrayBuffer !== 'undefined' && value.buffer instanceof ArrayBuffer) || 'length' in value) {
      return new Buffer(value);
    }
    if (value.type === 'Buffer' && Array.isArray(value.data)) {
      return new Buffer(value.data);
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ' + 'ArrayBuffer, Array, or array-like object.');
}
exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
  if (typeof Buffer.allocUnsafeSlow === 'function') {
    return Buffer.allocUnsafeSlow(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size >= MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new SlowBuffer(size);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"buffer":51}],51:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
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
    case 'latin1':
    case 'binary':
    case 'base64':
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
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
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

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

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

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

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

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
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

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
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

function latin1Write (buf, string, offset, length) {
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
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
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

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

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

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
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

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
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
  offset = offset >>> 0
  byteLength = byteLength >>> 0
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
  offset = offset >>> 0
  byteLength = byteLength >>> 0
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
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
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
  offset = offset >>> 0
  byteLength = byteLength >>> 0
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
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

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
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

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
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
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
  value = +value
  offset = offset >>> 0
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
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
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
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
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

  for (var i = 0; i < length; ++i) {
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
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
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
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
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
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":48,"ieee754":57}],52:[function(require,module,exports){
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
},{"buffer":51}],53:[function(require,module,exports){
(function (Buffer){
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

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":60}],54:[function(require,module,exports){
(function (process,Buffer){
var stream = require('readable-stream')
var eos = require('end-of-stream')
var inherits = require('inherits')
var shift = require('stream-shift')

var SIGNAL_FLUSH = (Buffer.from && Buffer.from !== Uint8Array.from)
  ? Buffer.from([0])
  : new Buffer([0])

var onuncork = function(self, fn) {
  if (self._corked) self.once('uncork', fn)
  else fn()
}

var destroyer = function(self, end) {
  return function(err) {
    if (err) self._destroyInterval(err)
    else if (end && !self._ended) self.end()
  }
}

var end = function(ws, fn) {
  if (!ws) return fn()
  if (ws._writableState && ws._writableState.finished) return fn()
  if (ws._writableState) return ws.end(fn)
  ws.end()
  fn()
}

var toStreams2 = function(rs) {
  return new (stream.Readable)({objectMode:true, highWaterMark:16}).wrap(rs)
}

var Duplexify = function(writable, readable, opts) {
  if (!(this instanceof Duplexify)) return new Duplexify(writable, readable, opts)
  stream.Duplex.call(this, opts)

  this._writable = null
  this._readable = null
  this._readable2 = null

  this._forwardDestroy = !opts || opts.destroy !== false
  this._forwardEnd = !opts || opts.end !== false
  this._corked = 1 // start corked
  this._ondrain = null
  this._drained = false
  this._forwarding = false
  this._unwrite = null
  this._unread = null
  this._ended = false
  this._error = null
  this._preferError = false

  this.destroyed = false

  if (writable) this.setWritable(writable)
  if (readable) this.setReadable(readable)
}

inherits(Duplexify, stream.Duplex)

Duplexify.obj = function(writable, readable, opts) {
  if (!opts) opts = {}
  opts.objectMode = true
  opts.highWaterMark = 16
  return new Duplexify(writable, readable, opts)
}

Duplexify.prototype.cork = function() {
  if (++this._corked === 1) this.emit('cork')
}

Duplexify.prototype.uncork = function() {
  if (this._corked && --this._corked === 0) this.emit('uncork')
}

Duplexify.prototype.setWritable = function(writable) {
  if (this._unwrite) this._unwrite()

  if (this.destroyed) {
    if (writable && writable.destroy) writable.destroy()
    return
  }

  if (writable === null || writable === false) {
    this.end()
    return
  }

  var self = this
  var unend = eos(writable, {writable:true, readable:false}, destroyer(this, this._forwardEnd))

  var ondrain = function() {
    var ondrain = self._ondrain
    self._ondrain = null
    if (ondrain) ondrain()
  }

  var clear = function() {
    self._writable.removeListener('drain', ondrain)
    unend()
  }

  if (this._unwrite) process.nextTick(ondrain) // force a drain on stream reset to avoid livelocks

  this._writable = writable
  this._writable.on('drain', ondrain)
  this._unwrite = clear

  this.uncork() // always uncork setWritable
}

Duplexify.prototype.setReadable = function(readable) {
  if (this._unread) this._unread()

  if (this.destroyed) {
    if (readable && readable.destroy) readable.destroy()
    return
  }

  if (readable === null || readable === false) {
    this.push(null)
    this.resume()
    return
  }

  var self = this
  var unend = eos(readable, {writable:false, readable:true}, destroyer(this))

  var onreadable = function() {
    self._forward()
  }

  var onend = function() {
    self.push(null)
  }

  var clear = function() {
    self._readable2.removeListener('readable', onreadable)
    self._readable2.removeListener('end', onend)
    unend()
  }

  this._drained = true
  this._readable = readable
  this._readable2 = readable._readableState ? readable : toStreams2(readable)
  this._readable2.on('readable', onreadable)
  this._readable2.on('end', onend)
  this._unread = clear

  this._forward()
}

Duplexify.prototype._read = function() {
  this._drained = true
  this._forward()
}

Duplexify.prototype._forward = function() {
  if (this._forwarding || !this._readable2 || !this._drained) return
  this._forwarding = true

  var data

  while (this._drained && (data = shift(this._readable2)) !== null) {
    if (this.destroyed) continue
    this._drained = this.push(data)
  }

  this._forwarding = false
}

Duplexify.prototype.destroy = function(err) {
  if (this._preferError && !this._error && err) this._error = err

  if (this.destroyed) return
  this.destroyed = true

  var self = this
  process.nextTick(function() {
    self._destroy(self._preferError ? self._error : err)
  })
}

Duplexify.prototype._destroyInterval = function(err) {
  if (this.destroyed) return
  if (err.message !== 'premature close') return this.destroy(err)
  this._preferError = true
  this.destroy(null)
}

Duplexify.prototype._destroy = function(err) {
  if (err) {
    var ondrain = this._ondrain
    this._ondrain = null
    if (ondrain) ondrain(err)
    else this.emit('error', err)
  }

  if (this._forwardDestroy) {
    if (this._readable && this._readable.destroy) this._readable.destroy()
    if (this._writable && this._writable.destroy) this._writable.destroy()
  }

  this.emit('close')
}

Duplexify.prototype._write = function(data, enc, cb) {
  if (this.destroyed) return cb()
  if (this._corked) return onuncork(this, this._write.bind(this, data, enc, cb))
  if (data === SIGNAL_FLUSH) return this._finish(cb)
  if (!this._writable) return cb()

  if (this._writable.write(data) === false) this._ondrain = cb
  else cb()
}


Duplexify.prototype._finish = function(cb) {
  var self = this
  this.emit('preend')
  onuncork(this, function() {
    end(self._forwardEnd && self._writable, function() {
      // haxx to not emit prefinish twice
      if (self._writableState.prefinished === false) self._writableState.prefinished = true
      self.emit('prefinish')
      onuncork(self, cb)
    })
  })
}

Duplexify.prototype.end = function(data, enc, cb) {
  if (typeof data === 'function') return this.end(null, null, data)
  if (typeof enc === 'function') return this.end(data, null, enc)
  this._ended = true
  if (data) this.write(data)
  if (!this._writableState.ending) this.write(SIGNAL_FLUSH)
  return stream.Writable.prototype.end.call(this, cb)
}

module.exports = Duplexify

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":106,"buffer":51,"end-of-stream":55,"inherits":59,"readable-stream":117,"stream-shift":120}],55:[function(require,module,exports){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;

},{"once":104}],56:[function(require,module,exports){
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

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],57:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
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
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

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
  var eLen = (nBytes * 8) - mLen - 1
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
      m = ((value * c) - 1) * Math.pow(2, mLen)
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

},{}],58:[function(require,module,exports){
/*!
 * in-array <https://github.com/jonschlinkert/in-array>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT License
 */

'use strict';

module.exports = function inArray (arr, val) {
  arr = arr || [];
  var len = arr.length;
  var i;

  for (i = 0; i < len; i++) {
    if (arr[i] === val) {
      return true;
    }
  }
  return false;
};

},{}],59:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],60:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],61:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],62:[function(require,module,exports){
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

},{}],63:[function(require,module,exports){
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
            seen.splice(seen.indexOf(node), 1);
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

},{"jsonify":64}],64:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":65,"./lib/stringify":66}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
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

},{}],67:[function(require,module,exports){
'use strict'

var Buffer = require('safe-buffer').Buffer

/* Protocol - protocol constants */
var protocol = module.exports

/* Command code => mnemonic */
protocol.types = {
  0: 'reserved',
  1: 'connect',
  2: 'connack',
  3: 'publish',
  4: 'puback',
  5: 'pubrec',
  6: 'pubrel',
  7: 'pubcomp',
  8: 'subscribe',
  9: 'suback',
  10: 'unsubscribe',
  11: 'unsuback',
  12: 'pingreq',
  13: 'pingresp',
  14: 'disconnect',
  15: 'reserved'
}

/* Mnemonic => Command code */
protocol.codes = {}
for (var k in protocol.types) {
  var v = protocol.types[k]
  protocol.codes[v] = k
}

/* Header */
protocol.CMD_SHIFT = 4
protocol.CMD_MASK = 0xF0
protocol.DUP_MASK = 0x08
protocol.QOS_MASK = 0x03
protocol.QOS_SHIFT = 1
protocol.RETAIN_MASK = 0x01

/* Length */
protocol.LENGTH_MASK = 0x7F
protocol.LENGTH_FIN_MASK = 0x80

/* Connack */
protocol.SESSIONPRESENT_MASK = 0x01
protocol.SESSIONPRESENT_HEADER = Buffer.from([protocol.SESSIONPRESENT_MASK])
protocol.CONNACK_HEADER = Buffer.from([protocol.codes['connack'] << protocol.CMD_SHIFT])

/* Connect */
protocol.USERNAME_MASK = 0x80
protocol.PASSWORD_MASK = 0x40
protocol.WILL_RETAIN_MASK = 0x20
protocol.WILL_QOS_MASK = 0x18
protocol.WILL_QOS_SHIFT = 3
protocol.WILL_FLAG_MASK = 0x04
protocol.CLEAN_SESSION_MASK = 0x02
protocol.CONNECT_HEADER = Buffer.from([protocol.codes['connect'] << protocol.CMD_SHIFT])

function genHeader (type) {
  return [0, 1, 2].map(function (qos) {
    return [0, 1].map(function (dup) {
      return [0, 1].map(function (retain) {
        var buf = new Buffer(1)
        buf.writeUInt8(
          protocol.codes[type] << protocol.CMD_SHIFT |
          (dup ? protocol.DUP_MASK : 0) |
          qos << protocol.QOS_SHIFT | retain, 0, true)
        return buf
      })
    })
  })
}

/* Publish */
protocol.PUBLISH_HEADER = genHeader('publish')

/* Subscribe */
protocol.SUBSCRIBE_HEADER = genHeader('subscribe')

/* Unsubscribe */
protocol.UNSUBSCRIBE_HEADER = genHeader('unsubscribe')

/* Confirmations */
protocol.ACKS = {
  unsuback: genHeader('unsuback'),
  puback: genHeader('puback'),
  pubcomp: genHeader('pubcomp'),
  pubrel: genHeader('pubrel'),
  pubrec: genHeader('pubrec')
}

protocol.SUBACK_HEADER = Buffer.from([protocol.codes['suback'] << protocol.CMD_SHIFT])

/* Protocol versions */
protocol.VERSION3 = Buffer.from([3])
protocol.VERSION4 = Buffer.from([4])

/* QoS */
protocol.QOS = [0, 1, 2].map(function (qos) {
  return Buffer.from([qos])
})

/* Empty packets */
protocol.EMPTY = {
  pingreq: Buffer.from([protocol.codes['pingreq'] << 4, 0]),
  pingresp: Buffer.from([protocol.codes['pingresp'] << 4, 0]),
  disconnect: Buffer.from([protocol.codes['disconnect'] << 4, 0])
}

},{"safe-buffer":119}],68:[function(require,module,exports){
'use strict'

var Buffer = require('safe-buffer').Buffer
var writeToStream = require('./writeToStream')
var EE = require('events').EventEmitter
var inherits = require('inherits')

function generate (packet) {
  var stream = new Accumulator()
  writeToStream(packet, stream)
  return stream.concat()
}

function Accumulator () {
  this._array = new Array(20)
  this._i = 0
}

inherits(Accumulator, EE)

Accumulator.prototype.write = function (chunk) {
  this._array[this._i++] = chunk
  return true
}

Accumulator.prototype.concat = function () {
  var length = 0
  var lengths = new Array(this._array.length)
  var list = this._array
  var pos = 0
  var i
  var result

  for (i = 0; i < list.length && list[i] !== undefined; i++) {
    if (typeof list[i] !== 'string') lengths[i] = list[i].length
    else lengths[i] = Buffer.byteLength(list[i])

    length += lengths[i]
  }

  result = Buffer.allocUnsafe(length)

  for (i = 0; i < list.length && list[i] !== undefined; i++) {
    if (typeof list[i] !== 'string') {
      list[i].copy(result, pos)
      pos += lengths[i]
    } else {
      result.write(list[i], pos)
      pos += lengths[i]
    }
  }

  return result
}

module.exports = generate

},{"./writeToStream":83,"events":56,"inherits":59,"safe-buffer":119}],69:[function(require,module,exports){
'use strict'

exports.parser = require('./parser')
exports.generate = require('./generate')
exports.writeToStream = require('./writeToStream')

},{"./generate":68,"./parser":82,"./writeToStream":83}],70:[function(require,module,exports){
var DuplexStream = require('readable-stream/duplex')
  , util         = require('util')
  , Buffer       = require('safe-buffer').Buffer


function BufferList (callback) {
  if (!(this instanceof BufferList))
    return new BufferList(callback)

  this._bufs  = []
  this.length = 0

  if (typeof callback == 'function') {
    this._callback = callback

    var piper = function piper (err) {
      if (this._callback) {
        this._callback(err)
        this._callback = null
      }
    }.bind(this)

    this.on('pipe', function onPipe (src) {
      src.on('error', piper)
    })
    this.on('unpipe', function onUnpipe (src) {
      src.removeListener('error', piper)
    })
  } else {
    this.append(callback)
  }

  DuplexStream.call(this)
}


util.inherits(BufferList, DuplexStream)


BufferList.prototype._offset = function _offset (offset) {
  var tot = 0, i = 0, _t
  if (offset === 0) return [ 0, 0 ]
  for (; i < this._bufs.length; i++) {
    _t = tot + this._bufs[i].length
    if (offset < _t || i == this._bufs.length - 1)
      return [ i, offset - tot ]
    tot = _t
  }
}


BufferList.prototype.append = function append (buf) {
  var i = 0

  if (Buffer.isBuffer(buf)) {
    this._appendBuffer(buf);
  } else if (Array.isArray(buf)) {
    for (; i < buf.length; i++)
      this.append(buf[i])
  } else if (buf instanceof BufferList) {
    // unwrap argument into individual BufferLists
    for (; i < buf._bufs.length; i++)
      this.append(buf._bufs[i])
  } else if (buf != null) {
    // coerce number arguments to strings, since Buffer(number) does
    // uninitialized memory allocation
    if (typeof buf == 'number')
      buf = buf.toString()

    this._appendBuffer(Buffer.from(buf));
  }

  return this
}


BufferList.prototype._appendBuffer = function appendBuffer (buf) {
  this._bufs.push(buf)
  this.length += buf.length
}


BufferList.prototype._write = function _write (buf, encoding, callback) {
  this._appendBuffer(buf)

  if (typeof callback == 'function')
    callback()
}


BufferList.prototype._read = function _read (size) {
  if (!this.length)
    return this.push(null)

  size = Math.min(size, this.length)
  this.push(this.slice(0, size))
  this.consume(size)
}


BufferList.prototype.end = function end (chunk) {
  DuplexStream.prototype.end.call(this, chunk)

  if (this._callback) {
    this._callback(null, this.slice())
    this._callback = null
  }
}


BufferList.prototype.get = function get (index) {
  return this.slice(index, index + 1)[0]
}


BufferList.prototype.slice = function slice (start, end) {
  if (typeof start == 'number' && start < 0)
    start += this.length
  if (typeof end == 'number' && end < 0)
    end += this.length
  return this.copy(null, 0, start, end)
}


BufferList.prototype.copy = function copy (dst, dstStart, srcStart, srcEnd) {
  if (typeof srcStart != 'number' || srcStart < 0)
    srcStart = 0
  if (typeof srcEnd != 'number' || srcEnd > this.length)
    srcEnd = this.length
  if (srcStart >= this.length)
    return dst || Buffer.alloc(0)
  if (srcEnd <= 0)
    return dst || Buffer.alloc(0)

  var copy   = !!dst
    , off    = this._offset(srcStart)
    , len    = srcEnd - srcStart
    , bytes  = len
    , bufoff = (copy && dstStart) || 0
    , start  = off[1]
    , l
    , i

  // copy/slice everything
  if (srcStart === 0 && srcEnd == this.length) {
    if (!copy) { // slice, but full concat if multiple buffers
      return this._bufs.length === 1
        ? this._bufs[0]
        : Buffer.concat(this._bufs, this.length)
    }

    // copy, need to copy individual buffers
    for (i = 0; i < this._bufs.length; i++) {
      this._bufs[i].copy(dst, bufoff)
      bufoff += this._bufs[i].length
    }

    return dst
  }

  // easy, cheap case where it's a subset of one of the buffers
  if (bytes <= this._bufs[off[0]].length - start) {
    return copy
      ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes)
      : this._bufs[off[0]].slice(start, start + bytes)
  }

  if (!copy) // a slice, we need something to copy in to
    dst = Buffer.allocUnsafe(len)

  for (i = off[0]; i < this._bufs.length; i++) {
    l = this._bufs[i].length - start

    if (bytes > l) {
      this._bufs[i].copy(dst, bufoff, start)
    } else {
      this._bufs[i].copy(dst, bufoff, start, start + bytes)
      break
    }

    bufoff += l
    bytes -= l

    if (start)
      start = 0
  }

  return dst
}

BufferList.prototype.shallowSlice = function shallowSlice (start, end) {
  start = start || 0
  end = end || this.length

  if (start < 0)
    start += this.length
  if (end < 0)
    end += this.length

  var startOffset = this._offset(start)
    , endOffset = this._offset(end)
    , buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1)

  if (endOffset[1] == 0)
    buffers.pop()
  else
    buffers[buffers.length-1] = buffers[buffers.length-1].slice(0, endOffset[1])

  if (startOffset[1] != 0)
    buffers[0] = buffers[0].slice(startOffset[1])

  return new BufferList(buffers)
}

BufferList.prototype.toString = function toString (encoding, start, end) {
  return this.slice(start, end).toString(encoding)
}

BufferList.prototype.consume = function consume (bytes) {
  while (this._bufs.length) {
    if (bytes >= this._bufs[0].length) {
      bytes -= this._bufs[0].length
      this.length -= this._bufs[0].length
      this._bufs.shift()
    } else {
      this._bufs[0] = this._bufs[0].slice(bytes)
      this.length -= bytes
      break
    }
  }
  return this
}


BufferList.prototype.duplicate = function duplicate () {
  var i = 0
    , copy = new BufferList()

  for (; i < this._bufs.length; i++)
    copy.append(this._bufs[i])

  return copy
}


BufferList.prototype.destroy = function destroy () {
  this._bufs.length = 0
  this.length = 0
  this.push(null)
}


;(function () {
  var methods = {
      'readDoubleBE' : 8
    , 'readDoubleLE' : 8
    , 'readFloatBE'  : 4
    , 'readFloatLE'  : 4
    , 'readInt32BE'  : 4
    , 'readInt32LE'  : 4
    , 'readUInt32BE' : 4
    , 'readUInt32LE' : 4
    , 'readInt16BE'  : 2
    , 'readInt16LE'  : 2
    , 'readUInt16BE' : 2
    , 'readUInt16LE' : 2
    , 'readInt8'     : 1
    , 'readUInt8'    : 1
  }

  for (var m in methods) {
    (function (m) {
      BufferList.prototype[m] = function (offset) {
        return this.slice(offset, offset + methods[m])[m](0)
      }
    }(m))
  }
}())


module.exports = BufferList

},{"readable-stream/duplex":72,"safe-buffer":119,"util":127}],71:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this,require('_process'))
},{"_process":106}],72:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":73}],73:[function(require,module,exports){
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

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":74,"./_stream_writable":75,"core-util-is":53,"inherits":59,"process-nextick-args":71}],74:[function(require,module,exports){
(function (process,global){
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

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":73,"./internal/streams/BufferList":76,"./internal/streams/destroy":77,"./internal/streams/stream":78,"_process":106,"core-util-is":53,"events":56,"inherits":59,"isarray":61,"process-nextick-args":71,"safe-buffer":119,"string_decoder/":79,"util":49}],75:[function(require,module,exports){
(function (process,global){
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

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":73,"./internal/streams/destroy":77,"./internal/streams/stream":78,"_process":106,"core-util-is":53,"inherits":59,"process-nextick-args":71,"safe-buffer":119,"util-deprecate":124}],76:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":119,"util":49}],77:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":71}],78:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":56}],79:[function(require,module,exports){
'use strict';

var Buffer = require('safe-buffer').Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd'.repeat(p);
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd'.repeat(p + 1);
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd'.repeat(p + 2);
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":119}],80:[function(require,module,exports){
'use strict'

var Buffer = require('safe-buffer').Buffer
var max = 65536
var cache = {}

function generateBuffer (i) {
  var buffer = Buffer.allocUnsafe(2)
  buffer.writeUInt8(i >> 8, 0, true)
  buffer.writeUInt8(i & 0x00FF, 0 + 1, true)

  return buffer
}

function generateCache () {
  for (var i = 0; i < max; i++) {
    cache[i] = generateBuffer(i)
  }
}

module.exports = {
  cache: cache,
  generateCache: generateCache,
  generateNumber: generateBuffer
}

},{"safe-buffer":119}],81:[function(require,module,exports){

function Packet () {
  this.cmd = null
  this.retain = false
  this.qos = 0
  this.dup = false
  this.length = -1
  this.topic = null
  this.payload = null
}

module.exports = Packet

},{}],82:[function(require,module,exports){
'use strict'

var bl = require('bl')
var inherits = require('inherits')
var EE = require('events').EventEmitter
var Packet = require('./packet')
var constants = require('./constants')

function Parser () {
  if (!(this instanceof Parser)) return new Parser()

  this._states = [
    '_parseHeader',
    '_parseLength',
    '_parsePayload',
    '_newPacket'
  ]

  this._resetState()
}

inherits(Parser, EE)

Parser.prototype._resetState = function () {
  this.packet = new Packet()
  this.error = null
  this._list = bl()
  this._stateCounter = 0
}

Parser.prototype.parse = function (buf) {
  if (this.error) this._resetState()

  this._list.append(buf)

  while ((this.packet.length !== -1 || this._list.length > 0) &&
         this[this._states[this._stateCounter]]() &&
         !this.error) {
    this._stateCounter++

    if (this._stateCounter >= this._states.length) this._stateCounter = 0
  }

  return this._list.length
}

Parser.prototype._parseHeader = function () {
  // There is at least one byte in the buffer
  var zero = this._list.readUInt8(0)
  this.packet.cmd = constants.types[zero >> constants.CMD_SHIFT]
  this.packet.retain = (zero & constants.RETAIN_MASK) !== 0
  this.packet.qos = (zero >> constants.QOS_SHIFT) & constants.QOS_MASK
  this.packet.dup = (zero & constants.DUP_MASK) !== 0

  this._list.consume(1)

  return true
}

Parser.prototype._parseLength = function () {
  // There is at least one byte in the list
  var bytes = 0
  var mul = 1
  var length = 0
  var result = true
  var current

  while (bytes < 5) {
    current = this._list.readUInt8(bytes++)
    length += mul * (current & constants.LENGTH_MASK)
    mul *= 0x80

    if ((current & constants.LENGTH_FIN_MASK) === 0) break
    if (this._list.length <= bytes) {
      result = false
      break
    }
  }

  if (result) {
    this.packet.length = length
    this._list.consume(bytes)
  }

  return result
}

Parser.prototype._parsePayload = function () {
  var result = false

  // Do we have a payload? Do we have enough data to complete the payload?
  // PINGs have no payload
  if (this.packet.length === 0 || this._list.length >= this.packet.length) {
    this._pos = 0

    switch (this.packet.cmd) {
      case 'connect':
        this._parseConnect()
        break
      case 'connack':
        this._parseConnack()
        break
      case 'publish':
        this._parsePublish()
        break
      case 'puback':
      case 'pubrec':
      case 'pubrel':
      case 'pubcomp':
        this._parseMessageId()
        break
      case 'subscribe':
        this._parseSubscribe()
        break
      case 'suback':
        this._parseSuback()
        break
      case 'unsubscribe':
        this._parseUnsubscribe()
        break
      case 'unsuback':
        this._parseUnsuback()
        break
      case 'pingreq':
      case 'pingresp':
      case 'disconnect':
        // These are empty, nothing to do
        break
      default:
        this._emitError(new Error('Not supported'))
    }

    result = true
  }

  return result
}

Parser.prototype._parseConnect = function () {
  var protocolId // Protocol ID
  var clientId // Client ID
  var topic // Will topic
  var payload // Will payload
  var password // Password
  var username // Username
  var flags = {}
  var packet = this.packet

  // Parse protocolId
  protocolId = this._parseString()

  if (protocolId === null) return this._emitError(new Error('Cannot parse protocolId'))
  if (protocolId !== 'MQTT' && protocolId !== 'MQIsdp') {
    return this._emitError(new Error('Invalid protocolId'))
  }

  packet.protocolId = protocolId

  // Parse constants version number
  if (this._pos >= this._list.length) return this._emitError(new Error('Packet too short'))

  packet.protocolVersion = this._list.readUInt8(this._pos)

  if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4) {
    return this._emitError(new Error('Invalid protocol version'))
  }

  this._pos++

  if (this._pos >= this._list.length) {
    return this._emitError(new Error('Packet too short'))
  }

  // Parse connect flags
  flags.username = (this._list.readUInt8(this._pos) & constants.USERNAME_MASK)
  flags.password = (this._list.readUInt8(this._pos) & constants.PASSWORD_MASK)
  flags.will = (this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK)

  if (flags.will) {
    packet.will = {}
    packet.will.retain = (this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK) !== 0
    packet.will.qos = (this._list.readUInt8(this._pos) &
                          constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT
  }

  packet.clean = (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK) !== 0
  this._pos++

  // Parse keepalive
  packet.keepalive = this._parseNum()
  if (packet.keepalive === -1) return this._emitError(new Error('Packet too short'))

  // Parse clientId
  clientId = this._parseString()
  if (clientId === null) return this._emitError(new Error('Packet too short'))
  packet.clientId = clientId

  if (flags.will) {
    // Parse will topic
    topic = this._parseString()
    if (topic === null) return this._emitError(new Error('Cannot parse will topic'))
    packet.will.topic = topic

    // Parse will payload
    payload = this._parseBuffer()
    if (payload === null) return this._emitError(new Error('Cannot parse will payload'))
    packet.will.payload = payload
  }

  // Parse username
  if (flags.username) {
    username = this._parseString()
    if (username === null) return this._emitError(new Error('Cannot parse username'))
    packet.username = username
  }

  // Parse password
  if (flags.password) {
    password = this._parseBuffer()
    if (password === null) return this._emitError(new Error('Cannot parse password'))
    packet.password = password
  }

  return packet
}

Parser.prototype._parseConnack = function () {
  var packet = this.packet

  if (this._list.length < 2) return null

  packet.sessionPresent = !!(this._list.readUInt8(this._pos++) & constants.SESSIONPRESENT_MASK)
  packet.returnCode = this._list.readUInt8(this._pos)

  if (packet.returnCode === -1) return this._emitError(new Error('Cannot parse return code'))
}

Parser.prototype._parsePublish = function () {
  var packet = this.packet
  packet.topic = this._parseString()

  if (packet.topic === null) return this._emitError(new Error('Cannot parse topic'))

  // Parse messageId
  if (packet.qos > 0) if (!this._parseMessageId()) { return }

  packet.payload = this._list.slice(this._pos, packet.length)
}

Parser.prototype._parseSubscribe = function () {
  var packet = this.packet
  var topic
  var qos

  if (packet.qos !== 1) {
    return this._emitError(new Error('Wrong subscribe header'))
  }

  packet.subscriptions = []

  if (!this._parseMessageId()) { return }

  while (this._pos < packet.length) {
    // Parse topic
    topic = this._parseString()
    if (topic === null) return this._emitError(new Error('Cannot parse topic'))

    qos = this._list.readUInt8(this._pos++)

    // Push pair to subscriptions
    packet.subscriptions.push({ topic: topic, qos: qos })
  }
}

Parser.prototype._parseSuback = function () {
  this.packet.granted = []

  if (!this._parseMessageId()) { return }

  // Parse granted QoSes
  while (this._pos < this.packet.length) {
    this.packet.granted.push(this._list.readUInt8(this._pos++))
  }
}

Parser.prototype._parseUnsubscribe = function () {
  var packet = this.packet

  packet.unsubscriptions = []

  // Parse messageId
  if (!this._parseMessageId()) { return }

  while (this._pos < packet.length) {
    var topic

    // Parse topic
    topic = this._parseString()
    if (topic === null) return this._emitError(new Error('Cannot parse topic'))

    // Push topic to unsubscriptions
    packet.unsubscriptions.push(topic)
  }
}

Parser.prototype._parseUnsuback = function () {
  if (!this._parseMessageId()) return this._emitError(new Error('Cannot parse messageId'))
}

Parser.prototype._parseMessageId = function () {
  var packet = this.packet

  packet.messageId = this._parseNum()

  if (packet.messageId === null) {
    this._emitError(new Error('Cannot parse messageId'))
    return false
  }

  return true
}

Parser.prototype._parseString = function (maybeBuffer) {
  var length = this._parseNum()
  var result
  var end = length + this._pos

  if (length === -1 || end > this._list.length || end > this.packet.length) return null

  result = this._list.toString('utf8', this._pos, end)
  this._pos += length

  return result
}

Parser.prototype._parseBuffer = function () {
  var length = this._parseNum()
  var result
  var end = length + this._pos

  if (length === -1 || end > this._list.length || end > this.packet.length) return null

  result = this._list.slice(this._pos, end)

  this._pos += length

  return result
}

Parser.prototype._parseNum = function () {
  if (this._list.length - this._pos < 2) return -1

  var result = this._list.readUInt16BE(this._pos)
  this._pos += 2

  return result
}

Parser.prototype._newPacket = function () {
  if (this.packet) {
    this._list.consume(this.packet.length)
    this.emit('packet', this.packet)
  }

  this.packet = new Packet()

  return true
}

Parser.prototype._emitError = function (err) {
  this.error = err
  this.emit('error', err)
}

module.exports = Parser

},{"./constants":67,"./packet":81,"bl":70,"events":56,"inherits":59}],83:[function(require,module,exports){
'use strict'

var protocol = require('./constants')
var Buffer = require('safe-buffer').Buffer
var empty = Buffer.allocUnsafe(0)
var zeroBuf = Buffer.from([0])
var numbers = require('./numbers')
var nextTick = require('process-nextick-args').nextTick

var numCache = numbers.cache
var generateNumber = numbers.generateNumber
var generateCache = numbers.generateCache
var writeNumber = writeNumberCached
var toGenerate = true

function generate (packet, stream) {
  if (stream.cork) {
    stream.cork()
    nextTick(uncork, stream)
  }

  if (toGenerate) {
    toGenerate = false
    generateCache()
  }

  switch (packet.cmd) {
    case 'connect':
      return connect(packet, stream)
    case 'connack':
      return connack(packet, stream)
    case 'publish':
      return publish(packet, stream)
    case 'puback':
    case 'pubrec':
    case 'pubrel':
    case 'pubcomp':
    case 'unsuback':
      return confirmation(packet, stream)
    case 'subscribe':
      return subscribe(packet, stream)
    case 'suback':
      return suback(packet, stream)
    case 'unsubscribe':
      return unsubscribe(packet, stream)
    case 'pingreq':
    case 'pingresp':
    case 'disconnect':
      return emptyPacket(packet, stream)
    default:
      stream.emit('error', new Error('Unknown command'))
      return false
  }
}
/**
 * Controls numbers cache.
 * Set to "false" to allocate buffers on-the-flight instead of pre-generated cache
 */
Object.defineProperty(generate, 'cacheNumbers', {
  get: function () {
    return writeNumber === writeNumberCached
  },
  set: function (value) {
    if (value) {
      if (!numCache || Object.keys(numCache).length === 0) toGenerate = true
      writeNumber = writeNumberCached
    } else {
      toGenerate = false
      writeNumber = writeNumberGenerated
    }
  }
})

function uncork (stream) {
  stream.uncork()
}

function connect (opts, stream) {
  var settings = opts || {}
  var protocolId = settings.protocolId || 'MQTT'
  var protocolVersion = settings.protocolVersion || 4
  var will = settings.will
  var clean = settings.clean
  var keepalive = settings.keepalive || 0
  var clientId = settings.clientId || ''
  var username = settings.username
  var password = settings.password

  if (clean === undefined) clean = true

  var length = 0

  // Must be a string and non-falsy
  if (!protocolId ||
     (typeof protocolId !== 'string' && !Buffer.isBuffer(protocolId))) {
    stream.emit('error', new Error('Invalid protocolId'))
    return false
  } else length += protocolId.length + 2

  // Must be 3 or 4
  if (protocolVersion !== 3 && protocolVersion !== 4) {
    stream.emit('error', new Error('Invalid protocol version'))
    return false
  } else length += 1

  // ClientId might be omitted in 3.1.1, but only if cleanSession is set to 1
  if ((typeof clientId === 'string' || Buffer.isBuffer(clientId)) &&
     (clientId || protocolVersion === 4) && (clientId || clean)) {
    length += clientId.length + 2
  } else {
    if (protocolVersion < 4) {
      stream.emit('error', new Error('clientId must be supplied before 3.1.1'))
      return false
    }
    if ((clean * 1) === 0) {
      stream.emit('error', new Error('clientId must be given if cleanSession set to 0'))
      return false
    }
  }

  // Must be a two byte number
  if (typeof keepalive !== 'number' ||
      keepalive < 0 ||
      keepalive > 65535 ||
      keepalive % 1 !== 0) {
    stream.emit('error', new Error('Invalid keepalive'))
    return false
  } else length += 2

  // Connect flags
  length += 1

  // If will exists...
  if (will) {
    // It must be an object
    if (typeof will !== 'object') {
      stream.emit('error', new Error('Invalid will'))
      return false
    }
    // It must have topic typeof string
    if (!will.topic || typeof will.topic !== 'string') {
      stream.emit('error', new Error('Invalid will topic'))
      return false
    } else {
      length += Buffer.byteLength(will.topic) + 2
    }

    // Payload
    if (will.payload && will.payload) {
      if (will.payload.length >= 0) {
        if (typeof will.payload === 'string') {
          length += Buffer.byteLength(will.payload) + 2
        } else {
          length += will.payload.length + 2
        }
      } else {
        stream.emit('error', new Error('Invalid will payload'))
        return false
      }
    } else {
      length += 2
    }
  }

  // Username
  var providedUsername = false
  if (username != null) {
    if (isStringOrBuffer(username)) {
      providedUsername = true
      length += Buffer.byteLength(username) + 2
    } else {
      stream.emit('error', new Error('Invalid username'))
      return false
    }
  }

  // Password
  if (password != null) {
    if (!providedUsername) {
      stream.emit('error', new Error('Username is required to use password'))
      return false
    }

    if (isStringOrBuffer(password)) {
      length += byteLength(password) + 2
    } else {
      stream.emit('error', new Error('Invalid password'))
      return false
    }
  }

  // Generate header
  stream.write(protocol.CONNECT_HEADER)

  // Generate length
  writeLength(stream, length)

  // Generate protocol ID
  writeStringOrBuffer(stream, protocolId)
  stream.write(
    protocolVersion === 4 ? protocol.VERSION4 : protocol.VERSION3
  )

  // Connect flags
  var flags = 0
  flags |= (username != null) ? protocol.USERNAME_MASK : 0
  flags |= (password != null) ? protocol.PASSWORD_MASK : 0
  flags |= (will && will.retain) ? protocol.WILL_RETAIN_MASK : 0
  flags |= (will && will.qos) ? will.qos << protocol.WILL_QOS_SHIFT : 0
  flags |= will ? protocol.WILL_FLAG_MASK : 0
  flags |= clean ? protocol.CLEAN_SESSION_MASK : 0

  stream.write(Buffer.from([flags]))

  // Keepalive
  writeNumber(stream, keepalive)

  // Client ID
  writeStringOrBuffer(stream, clientId)

  // Will
  if (will) {
    writeString(stream, will.topic)
    writeStringOrBuffer(stream, will.payload)
  }

  // Username and password
  if (username != null) {
    writeStringOrBuffer(stream, username)
  }
  if (password != null) {
    writeStringOrBuffer(stream, password)
  }
  // This is a small packet that happens only once on a stream
  // We assume the stream is always free to receive more data after this
  return true
}

function connack (opts, stream) {
  var settings = opts || {}
  var rc = settings.returnCode

  // Check return code
  if (typeof rc !== 'number') {
    stream.emit('error', new Error('Invalid return code'))
    return false
  }

  stream.write(protocol.CONNACK_HEADER)
  writeLength(stream, 2)
  stream.write(opts.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf)

  return stream.write(Buffer.from([rc]))
}

function publish (opts, stream) {
  var settings = opts || {}
  var qos = settings.qos || 0
  var retain = settings.retain ? protocol.RETAIN_MASK : 0
  var topic = settings.topic
  var payload = settings.payload || empty
  var id = settings.messageId

  var length = 0

  // Topic must be a non-empty string or Buffer
  if (typeof topic === 'string') length += Buffer.byteLength(topic) + 2
  else if (Buffer.isBuffer(topic)) length += topic.length + 2
  else {
    stream.emit('error', new Error('Invalid topic'))
    return false
  }

  // Get the payload length
  if (!Buffer.isBuffer(payload)) length += Buffer.byteLength(payload)
  else length += payload.length

  // Message ID must a number if qos > 0
  if (qos && typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else if (qos) length += 2

  // Header
  stream.write(protocol.PUBLISH_HEADER[qos][opts.dup ? 1 : 0][retain ? 1 : 0])

  // Remaining length
  writeLength(stream, length)

  // Topic
  writeNumber(stream, byteLength(topic))
  stream.write(topic)

  // Message ID
  if (qos > 0) writeNumber(stream, id)

  // Payload
  return stream.write(payload)
}

/* Puback, pubrec, pubrel and pubcomp */
function confirmation (opts, stream) {
  var settings = opts || {}
  var type = settings.cmd || 'puback'
  var id = settings.messageId
  var dup = (settings.dup && type === 'pubrel') ? protocol.DUP_MASK : 0
  var qos = 0

  if (type === 'pubrel') qos = 1

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  }

  // Header
  stream.write(protocol.ACKS[type][qos][dup][0])

  // Length
  writeLength(stream, 2)

  // Message ID
  return writeNumber(stream, id)
}

function subscribe (opts, stream) {
  var settings = opts || {}
  var dup = settings.dup ? protocol.DUP_MASK : 0
  var id = settings.messageId
  var subs = settings.subscriptions

  var length = 0

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else length += 2

  // Check subscriptions
  if (typeof subs === 'object' && subs.length) {
    for (var i = 0; i < subs.length; i += 1) {
      var itopic = subs[i].topic
      var iqos = subs[i].qos

      if (typeof itopic !== 'string') {
        stream.emit('error', new Error('Invalid subscriptions - invalid topic'))
        return false
      }
      if (typeof iqos !== 'number') {
        stream.emit('error', new Error('Invalid subscriptions - invalid qos'))
        return false
      }

      length += Buffer.byteLength(itopic) + 2 + 1
    }
  } else {
    stream.emit('error', new Error('Invalid subscriptions'))
    return false
  }

  // Generate header
  stream.write(protocol.SUBSCRIBE_HEADER[1][dup ? 1 : 0][0])

  // Generate length
  writeLength(stream, length)

  // Generate message ID
  writeNumber(stream, id)

  var result = true

  // Generate subs
  for (var j = 0; j < subs.length; j++) {
    var sub = subs[j]
    var jtopic = sub.topic
    var jqos = sub.qos

    // Write topic string
    writeString(stream, jtopic)

    // Write qos
    result = stream.write(protocol.QOS[jqos])
  }

  return result
}

function suback (opts, stream) {
  var settings = opts || {}
  var id = settings.messageId
  var granted = settings.granted

  var length = 0

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else length += 2

  // Check granted qos vector
  if (typeof granted === 'object' && granted.length) {
    for (var i = 0; i < granted.length; i += 1) {
      if (typeof granted[i] !== 'number') {
        stream.emit('error', new Error('Invalid qos vector'))
        return false
      }
      length += 1
    }
  } else {
    stream.emit('error', new Error('Invalid qos vector'))
    return false
  }

  // header
  stream.write(protocol.SUBACK_HEADER)

  // Length
  writeLength(stream, length)

  // Message ID
  writeNumber(stream, id)

  return stream.write(Buffer.from(granted))
}

function unsubscribe (opts, stream) {
  var settings = opts || {}
  var id = settings.messageId
  var dup = settings.dup ? protocol.DUP_MASK : 0
  var unsubs = settings.unsubscriptions

  var length = 0

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else {
    length += 2
  }
  // Check unsubs
  if (typeof unsubs === 'object' && unsubs.length) {
    for (var i = 0; i < unsubs.length; i += 1) {
      if (typeof unsubs[i] !== 'string') {
        stream.emit('error', new Error('Invalid unsubscriptions'))
        return false
      }
      length += Buffer.byteLength(unsubs[i]) + 2
    }
  } else {
    stream.emit('error', new Error('Invalid unsubscriptions'))
    return false
  }

  // Header
  stream.write(protocol.UNSUBSCRIBE_HEADER[1][dup ? 1 : 0][0])

  // Length
  writeLength(stream, length)

  // Message ID
  writeNumber(stream, id)

  // Unsubs
  var result = true
  for (var j = 0; j < unsubs.length; j++) {
    result = writeString(stream, unsubs[j])
  }

  return result
}

function emptyPacket (opts, stream) {
  return stream.write(protocol.EMPTY[opts.cmd])
}

/**
 * calcLengthLength - calculate the length of the remaining
 * length field
 *
 * @api private
 */
function calcLengthLength (length) {
  if (length >= 0 && length < 128) return 1
  else if (length >= 128 && length < 16384) return 2
  else if (length >= 16384 && length < 2097152) return 3
  else if (length >= 2097152 && length < 268435456) return 4
  else return 0
}

function genBufLength (length) {
  var digit = 0
  var pos = 0
  var buffer = Buffer.allocUnsafe(calcLengthLength(length))

  do {
    digit = length % 128 | 0
    length = length / 128 | 0
    if (length > 0) digit = digit | 0x80

    buffer.writeUInt8(digit, pos++, true)
  } while (length > 0)

  return buffer
}

/**
 * writeLength - write an MQTT style length field to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <Number> length - length (>0)
 * @returns <Number> number of bytes written
 *
 * @api private
 */

var lengthCache = {}
function writeLength (stream, length) {
  var buffer = lengthCache[length]

  if (!buffer) {
    buffer = genBufLength(length)
    if (length < 16384) lengthCache[length] = buffer
  }

  stream.write(buffer)
}

/**
 * writeString - write a utf8 string to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> string - string to write
 * @return <Number> number of bytes written
 *
 * @api private
 */

function writeString (stream, string) {
  var strlen = Buffer.byteLength(string)
  writeNumber(stream, strlen)

  stream.write(string, 'utf8')
}

/**
 * writeNumber - write a two byte number to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> number - number to write
 * @return <Number> number of bytes written
 *
 * @api private
 */
function writeNumberCached (stream, number) {
  return stream.write(numCache[number])
}
function writeNumberGenerated (stream, number) {
  return stream.write(generateNumber(number))
}

/**
 * writeStringOrBuffer - write a String or Buffer with the its length prefix
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> toWrite - String or Buffer
 * @return <Number> number of bytes written
 */
function writeStringOrBuffer (stream, toWrite) {
  if (typeof toWrite === 'string') {
    writeString(stream, toWrite)
  } else if (toWrite) {
    writeNumber(stream, toWrite.length)
    stream.write(toWrite)
  } else writeNumber(stream, 0)
}

function byteLength (bufOrString) {
  if (!bufOrString) return 0
  else if (bufOrString instanceof Buffer) return bufOrString.length
  else return Buffer.byteLength(bufOrString)
}

function isStringOrBuffer (field) {
  return typeof field === 'string' || field instanceof Buffer
}

module.exports = generate

},{"./constants":67,"./numbers":80,"process-nextick-args":71,"safe-buffer":119}],84:[function(require,module,exports){
(function (process,global){
'use strict'

/**
 * Module dependencies
 */
var events = require('events')
var Store = require('./store')
var eos = require('end-of-stream')
var mqttPacket = require('mqtt-packet')
var Writable = require('readable-stream').Writable
var inherits = require('inherits')
var reInterval = require('reinterval')
var validations = require('./validations')
var xtend = require('xtend')
var setImmediate = global.setImmediate || function (callback) {
  // works in node v0.8
  process.nextTick(callback)
}
var defaultConnectOptions = {
  keepalive: 60,
  reschedulePings: true,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  resubscribe: true
}

function defaultId () {
  return 'mqttjs_' + Math.random().toString(16).substr(2, 8)
}

function sendPacket (client, packet, cb) {
  client.emit('packetsend', packet)

  var result = mqttPacket.writeToStream(packet, client.stream)

  if (!result && cb) {
    client.stream.once('drain', cb)
  } else if (cb) {
    cb()
  }
}

function flush (queue) {
  if (queue) {
    Object.keys(queue).forEach(function (messageId) {
      if (typeof queue[messageId] === 'function') {
        queue[messageId](new Error('Connection closed'))
        delete queue[messageId]
      }
    })
  }
}

function storeAndSend (client, packet, cb) {
  client.outgoingStore.put(packet, function storedPacket (err) {
    if (err) {
      return cb && cb(err)
    }
    sendPacket(client, packet, cb)
  })
}

function nop () {}

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
function MqttClient (streamBuilder, options) {
  var k
  var that = this

  if (!(this instanceof MqttClient)) {
    return new MqttClient(streamBuilder, options)
  }

  this.options = options || {}

  // Defaults
  for (k in defaultConnectOptions) {
    if (typeof this.options[k] === 'undefined') {
      this.options[k] = defaultConnectOptions[k]
    } else {
      this.options[k] = options[k]
    }
  }

  this.options.clientId = (typeof this.options.clientId === 'string') ? this.options.clientId : defaultId()

  this.streamBuilder = streamBuilder

  // Inflight message storages
  this.outgoingStore = this.options.outgoingStore || new Store()
  this.incomingStore = this.options.incomingStore || new Store()

  // Should QoS zero messages be queued when the connection is broken?
  this.queueQoSZero = this.options.queueQoSZero === undefined ? true : this.options.queueQoSZero

  // map of subscribed topics to support reconnection
  this._resubscribeTopics = {}

  // map of a subscribe messageId and a topic
  this.messageIdToTopic = {}

  // Ping timer, setup in _setupPingTimer
  this.pingTimer = null
  // Is the client connected?
  this.connected = false
  // Are we disconnecting?
  this.disconnecting = false
  // Packet queue
  this.queue = []
  // connack timer
  this.connackTimer = null
  // Reconnect timer
  this.reconnectTimer = null
  // MessageIDs starting with 1
  this.nextId = Math.floor(Math.random() * 65535)

  // Inflight callbacks
  this.outgoing = {}

  // Mark connected on connect
  this.on('connect', function () {
    if (this.disconnected) {
      return
    }

    this.connected = true
    var outStore = null
    outStore = this.outgoingStore.createStream()

    // Control of stored messages
    outStore.once('readable', function () {
      function storeDeliver () {
        var packet = outStore.read(1)
        var cb

        if (!packet) {
          return
        }

        // Avoid unnecessary stream read operations when disconnected
        if (!that.disconnecting && !that.reconnectTimer && that.options.reconnectPeriod > 0) {
          outStore.read(0)
          cb = that.outgoing[packet.messageId]
          that.outgoing[packet.messageId] = function (err, status) {
            // Ensure that the original callback passed in to publish gets invoked
            if (cb) {
              cb(err, status)
            }

            storeDeliver()
          }
          that._sendPacket(packet)
        } else if (outStore.destroy) {
          outStore.destroy()
        }
      }
      storeDeliver()
    }).on('error', this.emit.bind(this, 'error'))
  })

  // Mark disconnected on stream close
  this.on('close', function () {
    this.connected = false
    clearTimeout(this.connackTimer)
  })

  // Setup ping timer
  this.on('connect', this._setupPingTimer)

  // Send queued packets
  this.on('connect', function () {
    var queue = this.queue

    function deliver () {
      var entry = queue.shift()
      var packet = null

      if (!entry) {
        return
      }

      packet = entry.packet

      that._sendPacket(
        packet,
        function (err) {
          if (entry.cb) {
            entry.cb(err)
          }
          deliver()
        }
      )
    }

    deliver()
  })

  var firstConnection = true
  // resubscribe
  this.on('connect', function () {
    if (!firstConnection &&
        this.options.clean &&
        Object.keys(this._resubscribeTopics).length > 0) {
      if (this.options.resubscribe) {
        this._resubscribeTopics.resubscribe = true
        this.subscribe(this._resubscribeTopics)
      } else {
        this._resubscribeTopics = {}
      }
    }

    firstConnection = false
  })

  // Clear ping timer
  this.on('close', function () {
    if (that.pingTimer !== null) {
      that.pingTimer.clear()
      that.pingTimer = null
    }
  })

  // Setup reconnect timer on disconnect
  this.on('close', this._setupReconnect)

  events.EventEmitter.call(this)

  this._setupStream()
}
inherits(MqttClient, events.EventEmitter)

/**
 * setup the event handlers in the inner stream.
 *
 * @api private
 */
MqttClient.prototype._setupStream = function () {
  var connectPacket
  var that = this
  var writable = new Writable()
  var parser = mqttPacket.parser(this.options)
  var completeParse = null
  var packets = []

  this._clearReconnect()

  this.stream = this.streamBuilder(this)

  parser.on('packet', function (packet) {
    packets.push(packet)
  })

  function nextTickWork () {
    process.nextTick(work)
  }

  function work () {
    var packet = packets.shift()
    var done = completeParse

    if (packet) {
      that._handlePacket(packet, nextTickWork)
    } else {
      completeParse = null
      done()
    }
  }

  writable._write = function (buf, enc, done) {
    completeParse = done
    parser.parse(buf)
    work()
  }

  this.stream.pipe(writable)

  // Suppress connection errors
  this.stream.on('error', nop)

  // Echo stream close
  eos(this.stream, this.emit.bind(this, 'close'))

  // Send a connect packet
  connectPacket = Object.create(this.options)
  connectPacket.cmd = 'connect'
  // avoid message queue
  sendPacket(this, connectPacket)

  // Echo connection errors
  parser.on('error', this.emit.bind(this, 'error'))

  // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
  this.stream.setMaxListeners(1000)

  clearTimeout(this.connackTimer)
  this.connackTimer = setTimeout(function () {
    that._cleanUp(true)
  }, this.options.connectTimeout)
}

MqttClient.prototype._handlePacket = function (packet, done) {
  this.emit('packetreceive', packet)

  switch (packet.cmd) {
    case 'publish':
      this._handlePublish(packet, done)
      break
    case 'puback':
    case 'pubrec':
    case 'pubcomp':
    case 'suback':
    case 'unsuback':
      this._handleAck(packet)
      done()
      break
    case 'pubrel':
      this._handlePubrel(packet, done)
      break
    case 'connack':
      this._handleConnack(packet)
      done()
      break
    case 'pingresp':
      this._handlePingresp(packet)
      done()
      break
    default:
      // do nothing
      // maybe we should do an error handling
      // or just log it
      break
  }
}

MqttClient.prototype._checkDisconnecting = function (callback) {
  if (this.disconnecting) {
    if (callback) {
      callback(new Error('client disconnecting'))
    } else {
      this.emit('error', new Error('client disconnecting'))
    }
  }
  return this.disconnecting
}

/**
 * publish - publish <message> to <topic>
 *
 * @param {String} topic - topic to publish to
 * @param {String, Buffer} message - message to publish
 * @param {Object} [opts] - publish options, includes:
 *    {Number} qos - qos level to publish on
 *    {Boolean} retain - whether or not to retain the message
 *    {Boolean} dup - whether or not mark a message as duplicate
 * @param {Function} [callback] - function(err){}
 *    called when publish succeeds or fails
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.publish('topic', 'message');
 * @example
 *     client.publish('topic', 'message', {qos: 1, retain: true, dup: true});
 * @example client.publish('topic', 'message', console.log);
 */
MqttClient.prototype.publish = function (topic, message, opts, callback) {
  var packet

  // .publish(topic, payload, cb);
  if (typeof opts === 'function') {
    callback = opts
    opts = null
  }

  // default opts
  var defaultOpts = {qos: 0, retain: false, dup: false}
  opts = xtend(defaultOpts, opts)

  if (this._checkDisconnecting(callback)) {
    return this
  }

  packet = {
    cmd: 'publish',
    topic: topic,
    payload: message,
    qos: opts.qos,
    retain: opts.retain,
    messageId: this._nextId(),
    dup: opts.dup
  }

  switch (opts.qos) {
    case 1:
    case 2:

      // Add to callbacks
      this.outgoing[packet.messageId] = callback || nop
      this._sendPacket(packet)
      break
    default:
      this._sendPacket(packet, callback)
      break
  }

  return this
}

/**
 * subscribe - subscribe to <topic>
 *
 * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Number} qos - subscribe qos level
 * @param {Function} [callback] - function(err, granted){} where:
 *    {Error} err - subscription error (none at the moment!)
 *    {Array} granted - array of {topic: 't', qos: 0}
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.subscribe('topic');
 * @example client.subscribe('topic', {qos: 1});
 * @example client.subscribe({'topic': 0, 'topic2': 1}, console.log);
 * @example client.subscribe('topic', console.log);
 */
MqttClient.prototype.subscribe = function () {
  var packet
  var args = Array.prototype.slice.call(arguments)
  var subs = []
  var obj = args.shift()
  var resubscribe = obj.resubscribe
  var callback = args.pop() || nop
  var opts = args.pop()
  var invalidTopic
  var that = this

  delete obj.resubscribe

  if (typeof obj === 'string') {
    obj = [obj]
  }

  if (typeof callback !== 'function') {
    opts = callback
    callback = nop
  }

  invalidTopic = validations.validateTopics(obj)
  if (invalidTopic !== null) {
    setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
    return this
  }

  if (this._checkDisconnecting(callback)) {
    return this
  }

  var defaultOpts = { qos: 0 }
  opts = xtend(defaultOpts, opts)

  if (Array.isArray(obj)) {
    obj.forEach(function (topic) {
      if (that._resubscribeTopics[topic] < opts.qos ||
          !that._resubscribeTopics.hasOwnProperty(topic) ||
          resubscribe) {
        subs.push({
          topic: topic,
          qos: opts.qos
        })
      }
    })
  } else {
    Object
      .keys(obj)
      .forEach(function (k) {
        if (that._resubscribeTopics[k] < obj[k] ||
            !that._resubscribeTopics.hasOwnProperty(k) ||
            resubscribe) {
          subs.push({
            topic: k,
            qos: obj[k]
          })
        }
      })
  }

  packet = {
    cmd: 'subscribe',
    subscriptions: subs,
    qos: 1,
    retain: false,
    dup: false,
    messageId: this._nextId()
  }

  if (!subs.length) {
    callback(null, [])
    return
  }

  // subscriptions to resubscribe to in case of disconnect
  if (this.options.resubscribe) {
    var topics = []
    subs.forEach(function (sub) {
      if (that.options.reconnectPeriod > 0) {
        that._resubscribeTopics[sub.topic] = sub.qos
        topics.push(sub.topic)
      }
    })
    that.messageIdToTopic[packet.messageId] = topics
  }

  this.outgoing[packet.messageId] = function (err, packet) {
    if (!err) {
      var granted = packet.granted
      for (var i = 0; i < granted.length; i += 1) {
        subs[i].qos = granted[i]
      }
    }

    callback(err, subs)
  }

  this._sendPacket(packet)

  return this
}

/**
 * unsubscribe - unsubscribe from topic(s)
 *
 * @param {String, Array} topic - topics to unsubscribe from
 * @param {Function} [callback] - callback fired on unsuback
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.unsubscribe('topic');
 * @example client.unsubscribe('topic', console.log);
 */
MqttClient.prototype.unsubscribe = function (topic, callback) {
  var packet = {
    cmd: 'unsubscribe',
    qos: 1,
    messageId: this._nextId()
  }
  var that = this

  callback = callback || nop

  if (this._checkDisconnecting(callback)) {
    return this
  }

  if (typeof topic === 'string') {
    packet.unsubscriptions = [topic]
  } else if (typeof topic === 'object' && topic.length) {
    packet.unsubscriptions = topic
  }

  if (this.options.resubscribe) {
    packet.unsubscriptions.forEach(function (topic) {
      delete that._resubscribeTopics[topic]
    })
  }

  this.outgoing[packet.messageId] = callback

  this._sendPacket(packet)

  return this
}

/**
 * end - close connection
 *
 * @returns {MqttClient} this - for chaining
 * @param {Boolean} force - do not wait for all in-flight messages to be acked
 * @param {Function} cb - called when the client has been closed
 *
 * @api public
 */
MqttClient.prototype.end = function (force, cb) {
  var that = this

  if (typeof force === 'function') {
    cb = force
    force = false
  }

  function closeStores () {
    that.disconnected = true
    that.incomingStore.close(function () {
      that.outgoingStore.close(function () {
        if (cb) {
          cb.apply(null, arguments)
        }
        that.emit('end')
      })
    })
    if (that._deferredReconnect) {
      that._deferredReconnect()
    }
  }

  function finish () {
    // defer closesStores of an I/O cycle,
    // just to make sure things are
    // ok for websockets
    that._cleanUp(force, setImmediate.bind(null, closeStores))
  }

  if (this.disconnecting) {
    return this
  }

  this._clearReconnect()

  this.disconnecting = true

  if (!force && Object.keys(this.outgoing).length > 0) {
    // wait 10ms, just to be sure we received all of it
    this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
  } else {
    finish()
  }

  return this
}

/**
 * removeOutgoingMessage - remove a message in outgoing store
 * the outgoing callback will be called withe Error('Message removed') if the message is removed
 *
 * @param {Number} mid - messageId to remove message
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.removeOutgoingMessage(client.getLastMessageId());
 */
MqttClient.prototype.removeOutgoingMessage = function (mid) {
  var cb = this.outgoing[mid]
  delete this.outgoing[mid]
  this.outgoingStore.del({messageId: mid}, function () {
    cb(new Error('Message removed'))
  })
  return this
}

/**
 * reconnect - connect again using the same options as connect()
 *
 * @param {Object} [opts] - optional reconnect options, includes:
 *    {Store} incomingStore - a store for the incoming packets
 *    {Store} outgoingStore - a store for the outgoing packets
 *    if opts is not given, current stores are used
 * @returns {MqttClient} this - for chaining
 *
 * @api public
 */
MqttClient.prototype.reconnect = function (opts) {
  var that = this
  var f = function () {
    if (opts) {
      that.options.incomingStore = opts.incomingStore
      that.options.outgoingStore = opts.outgoingStore
    } else {
      that.options.incomingStore = null
      that.options.outgoingStore = null
    }
    that.incomingStore = that.options.incomingStore || new Store()
    that.outgoingStore = that.options.outgoingStore || new Store()
    that.disconnecting = false
    that.disconnected = false
    that._deferredReconnect = null
    that._reconnect()
  }

  if (this.disconnecting && !this.disconnected) {
    this._deferredReconnect = f
  } else {
    f()
  }
  return this
}

/**
 * _reconnect - implement reconnection
 * @api privateish
 */
MqttClient.prototype._reconnect = function () {
  this.emit('reconnect')
  this._setupStream()
}

/**
 * _setupReconnect - setup reconnect timer
 */
MqttClient.prototype._setupReconnect = function () {
  var that = this

  if (!that.disconnecting && !that.reconnectTimer && (that.options.reconnectPeriod > 0)) {
    if (!this.reconnecting) {
      this.emit('offline')
      this.reconnecting = true
    }
    that.reconnectTimer = setInterval(function () {
      that._reconnect()
    }, that.options.reconnectPeriod)
  }
}

/**
 * _clearReconnect - clear the reconnect timer
 */
MqttClient.prototype._clearReconnect = function () {
  if (this.reconnectTimer) {
    clearInterval(this.reconnectTimer)
    this.reconnectTimer = null
  }
}

/**
 * _cleanUp - clean up on connection end
 * @api private
 */
MqttClient.prototype._cleanUp = function (forced, done) {
  if (done) {
    this.stream.on('close', done)
  }

  if (forced) {
    if ((this.options.reconnectPeriod === 0) && this.options.clean) {
      flush(this.outgoing)
    }
    this.stream.destroy()
  } else {
    this._sendPacket(
      { cmd: 'disconnect' },
      setImmediate.bind(
        null,
        this.stream.end.bind(this.stream)
      )
    )
  }

  if (!this.disconnecting) {
    this._clearReconnect()
    this._setupReconnect()
  }

  if (this.pingTimer !== null) {
    this.pingTimer.clear()
    this.pingTimer = null
  }

  if (done && !this.connected) {
    this.stream.removeListener('close', done)
    done()
  }
}

/**
 * _sendPacket - send or queue a packet
 * @param {String} type - packet type (see `protocol`)
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @api private
 */
MqttClient.prototype._sendPacket = function (packet, cb) {
  if (!this.connected) {
    if (((packet.qos || 0) === 0 && this.queueQoSZero) || packet.cmd !== 'publish') {
      this.queue.push({ packet: packet, cb: cb })
    } else if (packet.qos > 0) {
      cb = this.outgoing[packet.messageId]
      this.outgoingStore.put(packet, function (err) {
        if (err) {
          return cb && cb(err)
        }
      })
    } else if (cb) {
      cb(new Error('No connection to broker'))
    }

    return
  }

  // When sending a packet, reschedule the ping timer
  this._shiftPingInterval()

  if (packet.cmd !== 'publish') {
    sendPacket(this, packet, cb)
    return
  }

  switch (packet.qos) {
    case 2:
    case 1:
      storeAndSend(this, packet, cb)
      break
    /**
     * no need of case here since it will be caught by default
     * and jshint comply that before default it must be a break
     * anyway it will result in -1 evaluation
     */
    case 0:
      /* falls through */
    default:
      sendPacket(this, packet, cb)
      break
  }
}

/**
 * _setupPingTimer - setup the ping timer
 *
 * @api private
 */
MqttClient.prototype._setupPingTimer = function () {
  var that = this

  if (!this.pingTimer && this.options.keepalive) {
    this.pingResp = true
    this.pingTimer = reInterval(function () {
      that._checkPing()
    }, this.options.keepalive * 1000)
  }
}

/**
 * _shiftPingInterval - reschedule the ping interval
 *
 * @api private
 */
MqttClient.prototype._shiftPingInterval = function () {
  if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
    this.pingTimer.reschedule(this.options.keepalive * 1000)
  }
}
/**
 * _checkPing - check if a pingresp has come back, and ping the server again
 *
 * @api private
 */
MqttClient.prototype._checkPing = function () {
  if (this.pingResp) {
    this.pingResp = false
    this._sendPacket({ cmd: 'pingreq' })
  } else {
    // do a forced cleanup since socket will be in bad shape
    this._cleanUp(true)
  }
}

/**
 * _handlePingresp - handle a pingresp
 *
 * @api private
 */
MqttClient.prototype._handlePingresp = function () {
  this.pingResp = true
}

/**
 * _handleConnack
 *
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handleConnack = function (packet) {
  var rc = packet.returnCode
  var errors = [
    '',
    'Unacceptable protocol version',
    'Identifier rejected',
    'Server unavailable',
    'Bad username or password',
    'Not authorized'
  ]

  clearTimeout(this.connackTimer)

  if (rc === 0) {
    this.reconnecting = false
    this.emit('connect', packet)
  } else if (rc > 0) {
    var err = new Error('Connection refused: ' + errors[rc])
    err.code = rc
    this.emit('error', err)
  }
}

/**
 * _handlePublish
 *
 * @param {Object} packet
 * @api private
 */
/*
those late 2 case should be rewrite to comply with coding style:

case 1:
case 0:
  // do not wait sending a puback
  // no callback passed
  if (1 === qos) {
    this._sendPacket({
      cmd: 'puback',
      messageId: mid
    });
  }
  // emit the message event for both qos 1 and 0
  this.emit('message', topic, message, packet);
  this.handleMessage(packet, done);
  break;
default:
  // do nothing but every switch mus have a default
  // log or throw an error about unknown qos
  break;

for now i just suppressed the warnings
*/
MqttClient.prototype._handlePublish = function (packet, done) {
  var topic = packet.topic.toString()
  var message = packet.payload
  var qos = packet.qos
  var mid = packet.messageId
  var that = this

  switch (qos) {
    case 2:
      this.incomingStore.put(packet, function () {
        that._sendPacket({cmd: 'pubrec', messageId: mid}, done)
      })
      break
    case 1:
      // emit the message event
      this.emit('message', topic, message, packet)
      this.handleMessage(packet, function (err) {
        if (err) {
          return done && done(err)
        }
        // send 'puback' if the above 'handleMessage' method executed
        // successfully.
        that._sendPacket({cmd: 'puback', messageId: mid}, done)
      })
      break
    case 0:
      // emit the message event
      this.emit('message', topic, message, packet)
      this.handleMessage(packet, done)
      break
    default:
      // do nothing
      // log or throw an error about unknown qos
      break
  }
}

/**
 * Handle messages with backpressure support, one at a time.
 * Override at will.
 *
 * @param Packet packet the packet
 * @param Function callback call when finished
 * @api public
 */
MqttClient.prototype.handleMessage = function (packet, callback) {
  callback()
}

/**
 * _handleAck
 *
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handleAck = function (packet) {
  /* eslint no-fallthrough: "off" */
  var mid = packet.messageId
  var type = packet.cmd
  var response = null
  var cb = this.outgoing[mid]
  var that = this

  if (!cb) {
    // Server sent an ack in error, ignore it.
    return
  }

  // Process
  switch (type) {
    case 'pubcomp':
      // same thing as puback for QoS 2
    case 'puback':
      // Callback - we're done
      delete this.outgoing[mid]
      this.outgoingStore.del(packet, cb)
      break
    case 'pubrec':
      response = {
        cmd: 'pubrel',
        qos: 2,
        messageId: mid
      }

      this._sendPacket(response)
      break
    case 'suback':
      delete this.outgoing[mid]
      if (packet.granted.length === 1 && (packet.granted[0] & 0x80) !== 0) {
        // suback with Failure status
        var topics = this.messageIdToTopic[mid]
        if (topics) {
          topics.forEach(function (topic) {
            delete that._resubscribeTopics[topic]
          })
        }
      }
      cb(null, packet)
      break
    case 'unsuback':
      delete this.outgoing[mid]
      cb(null)
      break
    default:
      that.emit('error', new Error('unrecognized packet type'))
  }

  if (this.disconnecting &&
      Object.keys(this.outgoing).length === 0) {
    this.emit('outgoingEmpty')
  }
}

/**
 * _handlePubrel
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handlePubrel = function (packet, callback) {
  var mid = packet.messageId
  var that = this

  var comp = {cmd: 'pubcomp', messageId: mid}

  that.incomingStore.get(packet, function (err, pub) {
    if (!err && pub.cmd !== 'pubrel') {
      that.emit('message', pub.topic, pub.payload, pub)
      that.incomingStore.put(packet)
      that.handleMessage(pub, function (err) {
        if (err) {
          return callback && callback(err)
        }
        that._sendPacket(comp, callback)
      })
    } else {
      that._sendPacket(comp, callback)
    }
  })
}

/**
 * _nextId
 */
MqttClient.prototype._nextId = function () {
  var id = this.nextId++
  // Ensure 16 bit unsigned int:
  if (id === 65535) {
    this.nextId = 1
  }
  return id
}

/**
 * getLastMessageId
 */
MqttClient.prototype.getLastMessageId = function () {
  return (this.nextId === 1) ? 65535 : (this.nextId - 1)
}

module.exports = MqttClient

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./store":90,"./validations":91,"_process":106,"end-of-stream":92,"events":56,"inherits":59,"mqtt-packet":69,"readable-stream":102,"reinterval":118,"xtend":142}],85:[function(require,module,exports){
(function (process){
'use strict'

var MqttClient = require('../client')
var Store = require('../store')
var url = require('url')
var xtend = require('xtend')
var protocols = {}

if (process.title !== 'browser') {
  protocols.mqtt = require('./tcp')
  protocols.tcp = require('./tcp')
  protocols.ssl = require('./tls')
  protocols.tls = require('./tls')
  protocols.mqtts = require('./tls')
} else {
  protocols.wx = require('./wx')
  protocols.wxs = require('./wx')
}

protocols.ws = require('./ws')
protocols.wss = require('./ws')

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions (opts) {
  var matches
  if (opts.auth) {
    matches = opts.auth.match(/^(.+):(.+)$/)
    if (matches) {
      opts.username = matches[1]
      opts.password = matches[2]
    } else {
      opts.username = opts.auth
    }
  }
}

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect (brokerUrl, opts) {
  if ((typeof brokerUrl === 'object') && !opts) {
    opts = brokerUrl
    brokerUrl = null
  }

  opts = opts || {}

  if (brokerUrl) {
    var parsed = url.parse(brokerUrl, true)
    if (parsed.port != null) {
      parsed.port = Number(parsed.port)
    }

    opts = xtend(parsed, opts)

    if (opts.protocol === null) {
      throw new Error('Missing protocol')
    }
    opts.protocol = opts.protocol.replace(/:$/, '')
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts)

  // support clientId passed in the query string of the url
  if (opts.query && typeof opts.query.clientId === 'string') {
    opts.clientId = opts.query.clientId
  }

  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (['mqtts', 'wss', 'wxs'].indexOf(opts.protocol) === -1) {
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts'
            break
          case 'ws':
            opts.protocol = 'wss'
            break
          case 'wx':
            opts.protocol = 'wxs'
            break
          default:
            throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!')
        }
      }
    } else {
      // don't know what protocol he want to use, mqtts or wss
      throw new Error('Missing secure protocol key')
    }
  }

  if (!protocols[opts.protocol]) {
    var isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1
    opts.protocol = [
      'mqtt',
      'mqtts',
      'ws',
      'wss',
      'wx',
      'wxs'
    ].filter(function (key, index) {
      if (isSecure && index % 2 === 0) {
        // Skip insecure protocols when requesting a secure one.
        return false
      }
      return (typeof protocols[key] === 'function')
    })[0]
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients')
  }

  function wrapper (client) {
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0
      }

      opts.host = opts.servers[client._reconnectCount].host
      opts.port = opts.servers[client._reconnectCount].port
      opts.hostname = opts.host

      client._reconnectCount++
    }

    return protocols[opts.protocol](client, opts)
  }

  return new MqttClient(wrapper, opts)
}

module.exports = connect
module.exports.connect = connect
module.exports.MqttClient = MqttClient
module.exports.Store = Store

}).call(this,require('_process'))
},{"../client":84,"../store":90,"./tcp":86,"./tls":87,"./ws":88,"./wx":89,"_process":106,"url":122,"xtend":142}],86:[function(require,module,exports){
'use strict'
var net = require('net')

/*
  variables port and host can be removed since
  you have all required information in opts object
*/
function buildBuilder (client, opts) {
  var port, host
  opts.port = opts.port || 1883
  opts.hostname = opts.hostname || opts.host || 'localhost'

  port = opts.port
  host = opts.hostname

  return net.createConnection(port, host)
}

module.exports = buildBuilder

},{"net":49}],87:[function(require,module,exports){
'use strict'
var tls = require('tls')

function buildBuilder (mqttClient, opts) {
  var connection
  opts.port = opts.port || 8883
  opts.host = opts.hostname || opts.host || 'localhost'

  opts.rejectUnauthorized = opts.rejectUnauthorized !== false

  delete opts.path

  connection = tls.connect(opts)
  /* eslint no-use-before-define: [2, "nofunc"] */
  connection.on('secureConnect', function () {
    if (opts.rejectUnauthorized && !connection.authorized) {
      connection.emit('error', new Error('TLS not authorized'))
    } else {
      connection.removeListener('error', handleTLSerrors)
    }
  })

  function handleTLSerrors (err) {
    // How can I get verify this error is a tls error?
    if (opts.rejectUnauthorized) {
      mqttClient.emit('error', err)
    }

    // close this connection to match the behaviour of net
    // otherwise all we get is an error from the connection
    // and close event doesn't fire. This is a work around
    // to enable the reconnect code to work the same as with
    // net.createConnection
    connection.end()
  }

  connection.on('error', handleTLSerrors)
  return connection
}

module.exports = buildBuilder

},{"tls":49}],88:[function(require,module,exports){
(function (process){
'use strict'

var websocket = require('websocket-stream')
var urlModule = require('url')
var WSS_OPTIONS = [
  'rejectUnauthorized',
  'ca',
  'cert',
  'key',
  'pfx',
  'passphrase'
]
var IS_BROWSER = process.title === 'browser'

function buildUrl (opts, client) {
  var url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
  if (!IS_BROWSER && opts.protocol === 'wss') {
    // Add cert/key/ca etc options
    WSS_OPTIONS.forEach(function (prop) {
      if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
        opts.wsOptions[prop] = opts[prop]
      }
    })
  }
}

function createWebSocket (client, opts) {
  var websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)
  var url = buildUrl(opts, client)
  return websocket(url, [websocketSubProtocol], opts.wsOptions)
}

function buildBuilder (client, opts) {
  return createWebSocket(client, opts)
}

function buildBuilderBrowser (client, opts) {
  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    var parsed = urlModule.parse(document.URL)
    opts.hostname = parsed.hostname

    if (!opts.port) {
      opts.port = parsed.port
    }
  }
  return createWebSocket(client, opts)
}

if (IS_BROWSER) {
  module.exports = buildBuilderBrowser
} else {
  module.exports = buildBuilder
}

}).call(this,require('_process'))
},{"_process":106,"url":122,"websocket-stream":139}],89:[function(require,module,exports){
'use strict'

/* global wx */
var socketOpen = false
var socketMsgQueue = []

function sendSocketMessage (msg) {
  if (socketOpen) {
    wx.sendSocketMessage({
      data: msg
    })
  } else {
    socketMsgQueue.push(msg)
  }
}

function WebSocket (url, protocols) {
  var ws = {
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: socketOpen ? 1 : 0,
    send: sendSocketMessage,
    close: wx.closeSocket,
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null
  }

  wx.connectSocket({
    url: url,
    protocols: protocols
  })
  wx.onSocketOpen(function (res) {
    ws.readyState = ws.OPEN
    socketOpen = true
    for (var i = 0; i < socketMsgQueue.length; i++) {
      sendSocketMessage(socketMsgQueue[i])
    }
    socketMsgQueue = []

    ws.onopen && ws.onopen.apply(ws, arguments)
  })
  wx.onSocketMessage(function (res) {
    ws.onmessage && ws.onmessage.apply(ws, arguments)
  })
  wx.onSocketClose(function () {
    ws.onclose && ws.onclose.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  })
  wx.onSocketError(function () {
    ws.onerror && ws.onerror.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  })

  return ws
}

var websocket = require('websocket-stream')
var urlModule = require('url')

function buildUrl (opts, client) {
  var protocol = opts.protocol === 'wxs' ? 'wss' : 'ws'
  var url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
}

function createWebSocket (client, opts) {
  var websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)
  var url = buildUrl(opts, client)
  return websocket(WebSocket(url, [websocketSubProtocol]))
}

function buildBuilder (client, opts) {
  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    var parsed = urlModule.parse(document.URL)
    opts.hostname = parsed.hostname

    if (!opts.port) {
      opts.port = parsed.port
    }
  }
  return createWebSocket(client, opts)
}

module.exports = buildBuilder

},{"url":122,"websocket-stream":139}],90:[function(require,module,exports){
(function (process){
'use strict'

/**
 * Module dependencies
 */
var xtend = require('xtend')

var Readable = require('readable-stream').Readable
var streamsOpts = { objectMode: true }
var defaultStoreOptions = {
  clean: true
}

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 * @param {Object} [options] - store options
 */
function Store (options) {
  if (!(this instanceof Store)) {
    return new Store(options)
  }

  this.options = options || {}

  // Defaults
  this.options = xtend(defaultStoreOptions, options)

  this._inflights = {}
}

/**
 * Adds a packet to the store, a packet is
 * anything that has a messageId property.
 *
 */
Store.prototype.put = function (packet, cb) {
  this._inflights[packet.messageId] = packet

  if (cb) {
    cb()
  }

  return this
}

/**
 * Creates a stream with all the packets in the store
 *
 */
Store.prototype.createStream = function () {
  var stream = new Readable(streamsOpts)
  var inflights = this._inflights
  var ids = Object.keys(this._inflights)
  var destroyed = false
  var i = 0

  stream._read = function () {
    if (!destroyed && i < ids.length) {
      this.push(inflights[ids[i++]])
    } else {
      this.push(null)
    }
  }

  stream.destroy = function () {
    if (destroyed) {
      return
    }

    var self = this

    destroyed = true

    process.nextTick(function () {
      self.emit('close')
    })
  }

  return stream
}

/**
 * deletes a packet from the store.
 */
Store.prototype.del = function (packet, cb) {
  packet = this._inflights[packet.messageId]
  if (packet) {
    delete this._inflights[packet.messageId]
    cb(null, packet)
  } else if (cb) {
    cb(new Error('missing packet'))
  }

  return this
}

/**
 * get a packet from the store.
 */
Store.prototype.get = function (packet, cb) {
  packet = this._inflights[packet.messageId]
  if (packet) {
    cb(null, packet)
  } else if (cb) {
    cb(new Error('missing packet'))
  }

  return this
}

/**
 * Close the store
 */
Store.prototype.close = function (cb) {
  if (this.options.clean) {
    this._inflights = null
  }
  if (cb) {
    cb()
  }
}

module.exports = Store

}).call(this,require('_process'))
},{"_process":106,"readable-stream":102,"xtend":142}],91:[function(require,module,exports){
'use strict'

/**
 * Validate a topic to see if it's valid or not.
 * A topic is valid if it follow below rules:
 * - Rule #1: If any part of the topic is not `+` or `#`, then it must not contain `+` and '#'
 * - Rule #2: Part `#` must be located at the end of the mailbox
 *
 * @param {String} topic - A topic
 * @returns {Boolean} If the topic is valid, returns true. Otherwise, returns false.
 */
function validateTopic (topic) {
  var parts = topic.split('/')

  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === '+') {
      continue
    }

    if (parts[i] === '#') {
      // for Rule #2
      return i === parts.length - 1
    }

    if (parts[i].indexOf('+') !== -1 || parts[i].indexOf('#') !== -1) {
      return false
    }
  }

  return true
}

/**
 * Validate an array of topics to see if any of them is valid or not
  * @param {Array} topics - Array of topics
 * @returns {String} If the topics is valid, returns null. Otherwise, returns the invalid one
 */
function validateTopics (topics) {
  if (topics.length === 0) {
    return 'empty_topic_list'
  }
  for (var i = 0; i < topics.length; i++) {
    if (!validateTopic(topics[i])) {
      return topics[i]
    }
  }
  return null
}

module.exports = {
  validateTopics: validateTopics
}

},{}],92:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55,"once":104}],93:[function(require,module,exports){
arguments[4][71][0].apply(exports,arguments)
},{"_process":106,"dup":71}],94:[function(require,module,exports){
arguments[4][73][0].apply(exports,arguments)
},{"./_stream_readable":96,"./_stream_writable":98,"core-util-is":53,"dup":73,"inherits":59,"process-nextick-args":93}],95:[function(require,module,exports){
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

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":97,"core-util-is":53,"inherits":59}],96:[function(require,module,exports){
arguments[4][74][0].apply(exports,arguments)
},{"./_stream_duplex":94,"./internal/streams/BufferList":99,"./internal/streams/destroy":100,"./internal/streams/stream":101,"_process":106,"core-util-is":53,"dup":74,"events":56,"inherits":59,"isarray":61,"process-nextick-args":93,"safe-buffer":119,"string_decoder/":103,"util":49}],97:[function(require,module,exports){
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

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":94,"core-util-is":53,"inherits":59}],98:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"./_stream_duplex":94,"./internal/streams/destroy":100,"./internal/streams/stream":101,"_process":106,"core-util-is":53,"dup":75,"inherits":59,"process-nextick-args":93,"safe-buffer":119,"util-deprecate":124}],99:[function(require,module,exports){
arguments[4][76][0].apply(exports,arguments)
},{"dup":76,"safe-buffer":119,"util":49}],100:[function(require,module,exports){
arguments[4][77][0].apply(exports,arguments)
},{"dup":77,"process-nextick-args":93}],101:[function(require,module,exports){
arguments[4][78][0].apply(exports,arguments)
},{"dup":78,"events":56}],102:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":94,"./lib/_stream_passthrough.js":95,"./lib/_stream_readable.js":96,"./lib/_stream_transform.js":97,"./lib/_stream_writable.js":98}],103:[function(require,module,exports){
arguments[4][79][0].apply(exports,arguments)
},{"dup":79,"safe-buffer":119}],104:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}

},{"wrappy":141}],105:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":106}],106:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],107:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
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
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

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
		throw new RangeError(errors[type]);
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
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
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
	 * https://tools.ietf.org/html/rfc3492#section-3.4
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
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
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
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
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
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
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
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],108:[function(require,module,exports){
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

},{}],109:[function(require,module,exports){
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

},{}],110:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":108,"./encode":109}],111:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":113,"./_stream_writable":115,"core-util-is":53,"inherits":59,"process-nextick-args":105}],112:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":114,"core-util-is":53,"inherits":59}],113:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var StringDecoder;

util.inherits(Readable, Stream);

function prependListener(emitter, event, fn) {
  if (typeof emitter.prependListener === 'function') {
    return emitter.prependListener(event, fn);
  } else {
    // This is a hack to make sure that our error handler is attached before any
    // userland ones.  NEVER DO THIS. This is here only because this code needs
    // to continue to work with older versions of Node.js that do not include
    // the prependListener() method. The goal is to eventually remove this hack.
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
  }
}

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = bufferShim.from(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var _e = new Error('stream.unshift() after end event');
      stream.emit('error', _e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var _i = 0; _i < len; _i++) {
      dests[_i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1) return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = bufferShim.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'))
},{"./_stream_duplex":111,"./internal/streams/BufferList":116,"_process":106,"buffer":51,"buffer-shims":50,"core-util-is":53,"events":56,"inherits":59,"isarray":61,"process-nextick-args":105,"string_decoder/":121,"util":49}],114:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er) {
      done(stream, er);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('Not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er) {
  if (er) return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":111,"core-util-is":53,"inherits":59}],115:[function(require,module,exports){
(function (process){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

var Duplex;
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;
  // Always throw error if a null is written
  // if we are not in object mode then throw
  // if it is not a buffer, string, or undefined.
  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = bufferShim.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
}).call(this,require('_process'))
},{"./_stream_duplex":111,"_process":106,"buffer":51,"buffer-shims":50,"core-util-is":53,"events":56,"inherits":59,"process-nextick-args":105,"util-deprecate":124}],116:[function(require,module,exports){
'use strict';

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

module.exports = BufferList;

function BufferList() {
  this.head = null;
  this.tail = null;
  this.length = 0;
}

BufferList.prototype.push = function (v) {
  var entry = { data: v, next: null };
  if (this.length > 0) this.tail.next = entry;else this.head = entry;
  this.tail = entry;
  ++this.length;
};

BufferList.prototype.unshift = function (v) {
  var entry = { data: v, next: this.head };
  if (this.length === 0) this.tail = entry;
  this.head = entry;
  ++this.length;
};

BufferList.prototype.shift = function () {
  if (this.length === 0) return;
  var ret = this.head.data;
  if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
  --this.length;
  return ret;
};

BufferList.prototype.clear = function () {
  this.head = this.tail = null;
  this.length = 0;
};

BufferList.prototype.join = function (s) {
  if (this.length === 0) return '';
  var p = this.head;
  var ret = '' + p.data;
  while (p = p.next) {
    ret += s + p.data;
  }return ret;
};

BufferList.prototype.concat = function (n) {
  if (this.length === 0) return bufferShim.alloc(0);
  if (this.length === 1) return this.head.data;
  var ret = bufferShim.allocUnsafe(n >>> 0);
  var p = this.head;
  var i = 0;
  while (p) {
    p.data.copy(ret, i);
    i += p.data.length;
    p = p.next;
  }
  return ret;
};
},{"buffer":51,"buffer-shims":50}],117:[function(require,module,exports){
(function (process){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

if (!process.browser && process.env.READABLE_STREAM === 'disable' && Stream) {
  module.exports = Stream;
}

}).call(this,require('_process'))
},{"./lib/_stream_duplex.js":111,"./lib/_stream_passthrough.js":112,"./lib/_stream_readable.js":113,"./lib/_stream_transform.js":114,"./lib/_stream_writable.js":115,"_process":106}],118:[function(require,module,exports){
'use strict'

function ReInterval (callback, interval, args) {
  var self = this;

  this._callback = callback;
  this._args = args;

  this._interval = setInterval(callback, interval, this._args);

  this.reschedule = function (interval) {
    // if no interval entered, use the interval passed in on creation
    if (!interval)
      interval = self._interval;

    if (self._interval)
      clearInterval(self._interval);
    self._interval = setInterval(self._callback, interval, self._args);
  };

  this.clear = function () {
    if (self._interval) {
      clearInterval(self._interval);
      self._interval = undefined;
    }
  };
  
  this.destroy = function () {
    if (self._interval) {
      clearInterval(self._interval);
    }
    self._callback = undefined;
    self._interval = undefined;
    self._args = undefined;
  };
}

function reInterval () {
  if (typeof arguments[0] !== 'function')
    throw new Error('callback needed');
  if (typeof arguments[1] !== 'number')
    throw new Error('interval needed');

  var args;

  if (arguments.length > 0) {
    args = new Array(arguments.length - 2);

    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i + 2];
    }
  }

  return new ReInterval(arguments[0], arguments[1], args);
}

module.exports = reInterval;

},{}],119:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":51}],120:[function(require,module,exports){
module.exports = shift

function shift (stream) {
  var rs = stream._readableState
  if (!rs) return null
  return rs.objectMode ? stream.read() : stream.read(getStateLength(rs))
}

function getStateLength (state) {
  if (state.buffer.length) {
    // Since node 6.3.0 state.buffer is a BufferList not an array
    if (state.buffer.head) {
      return state.buffer.head.data.length
    }

    return state.buffer[0].length
  }

  return state.length
}

},{}],121:[function(require,module,exports){
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

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":51}],122:[function(require,module,exports){
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

var punycode = require('punycode');
var util = require('./util');

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

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

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
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
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
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

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
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
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
      if (rest.indexOf(ae) === -1)
        continue;
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
  if (util.isString(obj)) obj = urlParse(obj);
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
      util.isObject(this.query) &&
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
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

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
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

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
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
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
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
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
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
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
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
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
    //this especially happens in cases like
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
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
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

},{"./util":123,"punycode":107,"querystring":110}],123:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],124:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],125:[function(require,module,exports){
arguments[4][59][0].apply(exports,arguments)
},{"dup":59}],126:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],127:[function(require,module,exports){
(function (process,global){
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

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":126,"_process":106,"inherits":125}],128:[function(require,module,exports){
arguments[4][71][0].apply(exports,arguments)
},{"_process":106,"dup":71}],129:[function(require,module,exports){
arguments[4][73][0].apply(exports,arguments)
},{"./_stream_readable":131,"./_stream_writable":133,"core-util-is":53,"dup":73,"inherits":59,"process-nextick-args":128}],130:[function(require,module,exports){
arguments[4][95][0].apply(exports,arguments)
},{"./_stream_transform":132,"core-util-is":53,"dup":95,"inherits":59}],131:[function(require,module,exports){
arguments[4][74][0].apply(exports,arguments)
},{"./_stream_duplex":129,"./internal/streams/BufferList":134,"./internal/streams/destroy":135,"./internal/streams/stream":136,"_process":106,"core-util-is":53,"dup":74,"events":56,"inherits":59,"isarray":61,"process-nextick-args":128,"safe-buffer":119,"string_decoder/":138,"util":49}],132:[function(require,module,exports){
arguments[4][97][0].apply(exports,arguments)
},{"./_stream_duplex":129,"core-util-is":53,"dup":97,"inherits":59}],133:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"./_stream_duplex":129,"./internal/streams/destroy":135,"./internal/streams/stream":136,"_process":106,"core-util-is":53,"dup":75,"inherits":59,"process-nextick-args":128,"safe-buffer":119,"util-deprecate":124}],134:[function(require,module,exports){
arguments[4][76][0].apply(exports,arguments)
},{"dup":76,"safe-buffer":119,"util":49}],135:[function(require,module,exports){
arguments[4][77][0].apply(exports,arguments)
},{"dup":77,"process-nextick-args":128}],136:[function(require,module,exports){
arguments[4][78][0].apply(exports,arguments)
},{"dup":78,"events":56}],137:[function(require,module,exports){
arguments[4][102][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":129,"./lib/_stream_passthrough.js":130,"./lib/_stream_readable.js":131,"./lib/_stream_transform.js":132,"./lib/_stream_writable.js":133,"dup":102}],138:[function(require,module,exports){
arguments[4][79][0].apply(exports,arguments)
},{"dup":79,"safe-buffer":119}],139:[function(require,module,exports){
(function (process,global){
'use strict'

var Transform = require('readable-stream').Transform
var duplexify = require('duplexify')
var WS = require('ws')
var Buffer = require('safe-buffer').Buffer

module.exports = WebSocketStream

function buildProxy (options, socketWrite, socketEnd) {
  var proxy = new Transform({
    objectMode: options.objectMode
  })

  proxy._write = socketWrite
  proxy._flush = socketEnd

  return proxy
}

function WebSocketStream(target, protocols, options) {
  var stream, socket

  var isBrowser = process.title === 'browser'
  var isNative = !!global.WebSocket
  var socketWrite = isBrowser ? socketWriteBrowser : socketWriteNode

  if (protocols && !Array.isArray(protocols) && 'object' === typeof protocols) {
    // accept the "options" Object as the 2nd argument
    options = protocols
    protocols = null

    if (typeof options.protocol === 'string' || Array.isArray(options.protocol)) {
      protocols = options.protocol;
    }
  }

  if (!options) options = {}

  if (options.objectMode === undefined) {
    options.objectMode = !(options.binary === true || options.binary === undefined)
  }

  var proxy = buildProxy(options, socketWrite, socketEnd)

  if (!options.objectMode) {
    proxy._writev = writev
  }

  // browser only: sets the maximum socket buffer size before throttling
  var bufferSize = options.browserBufferSize || 1024 * 512

  // browser only: how long to wait when throttling
  var bufferTimeout = options.browserBufferTimeout || 1000

  // use existing WebSocket object that was passed in
  if (typeof target === 'object') {
    socket = target
  // otherwise make a new one
  } else {
    // special constructor treatment for native websockets in browsers, see
    // https://github.com/maxogden/websocket-stream/issues/82
    if (isNative && isBrowser) {
      socket = new WS(target, protocols)
    } else {
      socket = new WS(target, protocols, options)
    }

    socket.binaryType = 'arraybuffer'
  }

  // was already open when passed in
  if (socket.readyState === socket.OPEN) {
    stream = proxy
  } else {
    stream = duplexify.obj()
    socket.onopen = onopen
  }

  stream.socket = socket

  socket.onclose = onclose
  socket.onerror = onerror
  socket.onmessage = onmessage

  proxy.on('close', destroy)

  var coerceToBuffer = !options.objectMode

  function socketWriteNode(chunk, enc, next) {
    // avoid errors, this never happens unless
    // destroy() is called
    if (socket.readyState !== socket.OPEN) {
      next()
      return
    }

    if (coerceToBuffer && typeof chunk === 'string') {
      chunk = Buffer.from(chunk, 'utf8')
    }
    socket.send(chunk, next)
  }

  function socketWriteBrowser(chunk, enc, next) {
    if (socket.bufferedAmount > bufferSize) {
      setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next)
      return
    }

    if (coerceToBuffer && typeof chunk === 'string') {
      chunk = Buffer.from(chunk, 'utf8')
    }

    try {
      socket.send(chunk)
    } catch(err) {
      return next(err)
    }

    next()
  }

  function socketEnd(done) {
    socket.close()
    done()
  }

  function onopen() {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  }

  function onclose() {
    stream.end()
    stream.destroy()
  }

  function onerror(err) {
    stream.destroy(err)
  }

  function onmessage(event) {
    var data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    else data = Buffer.from(data, 'utf8')
    proxy.push(data)
  }

  function destroy() {
    socket.close()
  }

  // this is to be enabled only if objectMode is false
  function writev (chunks, cb) {
    var buffers = new Array(chunks.length)
    for (var i = 0; i < chunks.length; i++) {
      if (typeof chunks[i].chunk === 'string') {
        buffers[i] = Buffer.from(chunks[i], 'utf8')
      } else {
        buffers[i] = chunks[i].chunk
      }
    }

    this._write(Buffer.concat(buffers), 'binary', cb)
  }

  return stream
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":106,"duplexify":54,"readable-stream":137,"safe-buffer":119,"ws":140}],140:[function(require,module,exports){

var ws = null

if (typeof WebSocket !== 'undefined') {
  ws = WebSocket
} else if (typeof MozWebSocket !== 'undefined') {
  ws = MozWebSocket
} else if (typeof window !== 'undefined') {
  ws = window.WebSocket || window.MozWebSocket
}

module.exports = ws

},{}],141:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],142:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[4]);
