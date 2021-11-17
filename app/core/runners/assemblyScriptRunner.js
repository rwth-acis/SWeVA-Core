'use strict';

var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/assemblyScriptCompiler.js');
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

/**
 * The AssemblyScript runner supports strict TypeScript
 * 
 * @constructor
 * @extends Runner
 *
 */
function AssemblyScriptRunner() {
    this.compiler = new Compiler();
}

//inherit properties
AssemblyScriptRunner.prototype = Object.create(Runner.prototype);
AssemblyScriptRunner.prototype.constructor = AssemblyScriptRunner;

AssemblyScriptRunner.prototype.name = "TypeScript (using AssemblyScript)"

AssemblyScriptRunner.prototype.setup = function () {
    this.setupCompleted = true;
}

AssemblyScriptRunner.prototype.exec = async function (module, data, input) {
    console.log("EXEC");
    console.log(module);
    console.log(data);
    var updateIO = false;

    if(!module.binary || module.binary.length === 0){
        module.binary = await this.compiler.compile(module);
        updateIO = true;
    }

    const asBindInstance = await AsBind.instantiate(module.binary);

    //if(updateIO)
        //createDataSchema(module, asBindInstance);

    var dataS;
    for(var key in data) {
        dataS = data[key];
    }

    var result = asBindInstance.exports.run(dataS);
    console.log(result);
    return result;
}

AssemblyScriptRunner.prototype.createDataSchema = function (module) {
    //write data structure back to module
}


module.exports = AssemblyScriptRunner;