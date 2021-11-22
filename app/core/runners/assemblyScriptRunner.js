'use strict';

var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/assemblyScriptCompiler.js');
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');
var DefinitionError = require('../../core/errors/ExecutionError.js');

/**
 * Parameters in the AssemblyScript run function starting with this string are used for the user inputs.
 */
const userInputSeparator = "input_";

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
    console.log(data);
    var definitionData = null;

    if(!module.binary || module.binary.length === 0){
        let compilerResult = await this.compiler.compile(module);
        module.binary = compilerResult.binaryData;
        definitionData = compilerResult.definitionData;
    }

    const moduleInstance = await AsBind.instantiate(module.binary);

    if(definitionData != null)
        createDataSchema(module, moduleInstance, definitionData);

    console.log(module);
    let preparedParams = [];
    if(module.inputNames.length > 0)
        preparedParams = preparedParams.concat(findParamAssignment(module.inputNames, input, module.context))
    if(module.dataInNames.length > 0)
        preparedParams = preparedParams.concat(findParamAssignment(module.dataInNames, data, module.context));

    let result = moduleInstance.exports.run(...preparedParams);
    console.log(result);
    return result;
}

function findParamAssignment(names, values, context) {
    let preparedParams = [];
    for(let i in names) {
        let matchFound = false;
        if(values !== undefined && values != null) {
            for(let inputName in values) {
                if(names[i] === inputName) {
                    preparedParams.push(values[inputName]);
                    matchFound = true;
                }
            }
        }
        if(!matchFound)
            throw new DefinitionError("Mismatch between received and expected parameters!\nExpected \""+names[i]+"\", but not contained in received parameters: "+JSON.stringify(values), context);
    }
    return preparedParams;
}

function createDataSchema (module, moduleInstance, definitionData) {
    let run = moduleInstance.typeDescriptor.exportedFunctions.run;

    //verify entrypoint exists
    if(run === undefined)
        throw new DefinitionError("Missing entrypoint: exported function named run is required, as an entrypoint.", module.context);

    //inputs
    //parse variable names - replace if AssemblyScript API, to access parameter names becomes available
    let paramNames = parseAssemblyScriptVariableNames(definitionData);

    if(run.parameters.length !== paramNames.length)
        throw new DefinitionError("Parameter length mismatch! Parameters could not be parsed fully!", module.context);

    module.dataInNames = [];
    module.inputNames = [];
    module.dataInSchema = null;
    module.inputSchema = null;

    for(let i in run.parameters) {
        if(paramNames[i].startsWith(userInputSeparator)) {
            module.inputNames.push(paramNames[i]);

            if(module.inputSchema == null)
                module.inputSchema = {type: "object", properties: {}};
            module.inputSchema.properties[paramNames[i]] = {type: run.parameters[i]};
        } else {
            module.dataInNames.push(paramNames[i]);

            if(module.dataInSchema == null)
                module.dataInSchema = {type: "object", properties: {}};
            module.dataInSchema.properties[paramNames[i]] = {type: run.parameters[i]};
        }
    }

    //outputs
    console.log(moduleInstance);
    module.dataOutNames = [];
    module.dataOutSchema = null;
    for(let exportedObj in moduleInstance.exports) {
        if(moduleInstance.exports[exportedObj] instanceof WebAssembly.Global && !exportedObj.startsWith("__")) {
            console.log(exportedObj);
            module.dataOutNames.push(exportedObj);
        }
    }
}

function parseAssemblyScriptVariableNames(definitionData) {
    let paramNames = Array();
    let lines = definitionData.split("\n");
    for(let line in lines) {
        if(lines[line].indexOf("export function run") === 0) {
            let params = lines[line].substring(lines[line].indexOf('(')+1,lines[line].indexOf(')')).split(', ');
            for(let i in params) {
                let paramName = params[i].substring(0,params[i].indexOf(":"));
                if(paramName.length > 0)
                    paramNames.push(paramName);
            }
        }
    }
    return paramNames;
}

module.exports = AssemblyScriptRunner;