'use strict';

var AsBind = require('../../../node_modules/as-bind/dist/as-bind.iife.js');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/assemblyScript.js')
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

/**
 * The AssemblyScript runner supports strict TypeScript
 * 
 * @constructor
 * @extends Compiler
 *
 */
function AssemblyScript() {

    this.compiler = new Compiler();
}

//inherit properties
AssemblyScript.prototype = Object.create(Runner.prototype);
AssemblyScript.prototype.constructor = AssemblyScript;

Runner.prototype.setup = function () {
    this.setupCompleted = true;
}

Runner.prototype.exec = async function (module, input) {
    var updateIO = false;

    if(!module.binary || module.binary.length == 0){
        await this.compiler.setup();
        module.binary = await this.compiler.compile(module.source);
        updateIO = true;
    }

    const asBindInstance = await AsBind.instantiate(module.binary);

    if(updateIO)
        createDataSchema(module, asBindInstance)

    return asBindInstance.exports.main(input);
}

AssemblyScript.prototype.createDataSchema = function (module) {
    //write data structure to module
}


module.exports = AssemblyScript; 