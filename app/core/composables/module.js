﻿'use strict';

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
function Module(initializationObject, manager) {
  this.manager = manager;

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

Module.prototype.lastReturnedData = null;

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
Module.prototype.callSubscription = function(subscribe, data, input) {
  var self = this;

  return new Promise(function(resolve, reject) {
    var client = subscribe;
    client.on('connect', function() { self.onConnect(client, input, sweva.libs); });
    if (self.lastReturnedData === null) {
      self.lastReturnedData = data;
    }
    client.on('message', function(topic, message) {
      self.lastReturnedData = self.onMessageReceived(self.lastReturnedData, topic, message);
      // now notify the execution manager
      self.manager.onModuleUpdate(self, self.lastReturnedData); //TODO: add some key to uniquely identify module
    });

    resolve(self.onSubscription(data, input, sweva.libs)).catch(function(error) {
        // if we have a function to deal with errors from service directly...
        if (typeof self.requestError === 'function') {
          resolve(self.requestError(response, input, sweva.libs));
        } else {
          reject(error);
        }
      });
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

        self.callSubscription(self.subscribe(data, input, sweva.libs), data, input).then(function(output) {
          //validate output
          if (self.validateTypes('dataOut', output)) {
            //report progress, if callback is defined
            if (typeof progress !== 'undefined') {

              progress(alias, self.name, context);
            }

            self.lastReturnedData = output;
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

        self.callService(self.request(data, input, sweva.libs), input).then(function(output) {
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