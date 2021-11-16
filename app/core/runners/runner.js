'use strict';


/**
 * The runner executes the compiled code made available by the compiler and contains a reference to the matching compiler
 * It has two phases: A setup phase, were all dependencies are loaded and initialized and an operational phase, which is used to compile code
 * The setup needs to be done only once, while the execution can be repeated on different data.
 * 
 * This is a default implementation, which should be subclassed for each supported language
 * 
 * @constructor
 * @abstract
 */
function Runner() {
    /**
    * Determines, if dependencies are loaded.
    * @name ExecutionManager#modulesTotal
    * @type {boolean}
    */
    this.setupCompleted = false;
}

/**
 * Run the provided binary or source code
 * @param {module} module - module containing source code/binary to run
 *
 * @abstract
 */
Runner.prototype.exec = function (module) {
}

/**
 * End user friendly Name
 */
Runner.prototype.name = "Abstract Runner"
   
/**
 * Loads dependencies and should set setupCompleted to true, when done
 * 
 * @abstract
 */
 Runner.prototype.setup = function () {
 }

/**
 * Determine data schema based on source/binary and write results to the module
 * The properties dataInSchema, dataOutSchema, inputSchema, dataInNames, dataOutNames, inputNames of the module can be written
 * 
 * @param {module} module - module containing source code/binary
 * 
 * @abstract
 */
 Runner.prototype.createDataSchema = function (module) {
 }

module.exports = Runner