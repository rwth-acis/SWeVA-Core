'use strict';

//var {asc, assemblyscript} = require('../../../node_modules/assemblyscript/dist/sdk.js');
//var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
//var AsBindTransform = require('../../../node_modules/as-bind/dist/transform.cjs');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/compiler.js')
var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');
var CompileError = require('../../core/errors/CompileError.js');
const DefinitionError = require("../../core/errors/ExecutionError.js");
//var AssemblyScriptGetterTransform = require('./assemblyScriptGetterTransform.js');

/**
 * The AssemblyScriptCompiler supports strict TypeScript
 * 
 * @constructor
 * @extends Compiler
 *
 */
function AssemblyScriptCompiler(supportLib) {
    this.asbind = null;
    this.internalGetterPrefix = "_internal_get_";
    this.supportLibraryDeclares = this.generateSupportLibraryDeclares(supportLib);
    this.supportLibraryDocumentation = "The lib namespace contains all function from the support library.\n" +
        "synchronous functions return their result immediately, while the callback for asynchronous functions is called after all currently running AssemblyScript code is finished.\n" +
        "Callback functions can have less parameters than the listed parameters, in which case only the first parameters are passed.\n" +
        "Functions:\n";
}

//inherit properties
AssemblyScriptCompiler.prototype = Object.create(Compiler.prototype);
AssemblyScriptCompiler.prototype.constructor = AssemblyScriptCompiler;

/**
 * generates declare statements necessary, to access JavaScript functions from AssemblyScript
 * additionally the documentation is generated
 * @param supportLib
 */
AssemblyScriptCompiler.prototype.generateSupportLibraryDeclares = function (supportLib) {
    let docs = "";
    let declares = "namespace lib {\n";
    for(let funcName in supportLib.functions) {
        let returnSig = supportLib.functions[funcName].languageSpecific.typescript.returnSig || "void";
        let paramSig = supportLib.functions[funcName].languageSpecific.typescript.parameterSig;
        //callback function name is first parameter for asynchronous functions
        if(supportLib.functions[funcName].async) {
            paramSig = "callback: string | null" + (typeof paramSig !== undefined ? ", "+paramSig : "");
            returnSig = "void";
        }
        docs += funcName+":\n"+
            "  Description: "+supportLib.functions[funcName].description+"\n"+
            "  Parameters: \""+paramSig+"\"\n"+
            "  "+(supportLib.functions[funcName].async?
                "Async function: callback with signature \""+supportLib.functions[funcName].languageSpecific.typescript.returnSig+"\" required":
                "Sync function: returns \""+returnSig+"\"")+
            "\n";
        declares += "export declare function " + funcName + "(" + paramSig + "):" + returnSig + ";\n";
    }
    declares += "}";
    this.supportLibraryDocumentation = docs;
    console.log("Support functions:");
    console.log(this.supportLibraryDocumentation);
    return declares;
}

AssemblyScriptCompiler.prototype.setup = async function () {
    var self = this;

    return new Promise((resolve) => {
        if(!this.setupCompleted) {
            console.log("Loading AssemblyScript compiler");
            window.require([ "../../../node_modules/assemblyscript/dist/sdk.js",  ], ({ asc, assemblyscript }) => {
                define("visitor-as/as", [], assemblyscript);
                window.require(["../../../node_modules/as-bind/dist/transform.amd.js"], asbind => {

                    /*console.log("Assemblyscript loaded:");
                    console.log(asc);
                    console.log(assemblyscript);
                    console.log(asbind);*/
                    asc.ready.then(() => {
                        self.asc = asc;
                        self.asbind = asbind;
                        self.assemblyscript = assemblyscript;
                        self.setupCompleted = true;

                        resolve();
                    });
                });
            });
        }
        else {
            resolve();
        }
    })
}

AssemblyScriptCompiler.prototype.compile = async function (module) {
    const self = this;

    //load compiler
    await this.setup()

    return new Promise((resolve) => {
        const stdout = self.asc.createMemoryStream();
        const stderr = self.asc.createMemoryStream();
        let binaryData = null;
        let definitionData = null;
        self.asc.main([
            "module.ts",
            "-O3",
            //"--debug",
            "--runtime", "stub", //minimal runtime: garbage collection is not required, as instance is restarted after every execution
            "--exportRuntime",
            "--tsdFile", "module.tsd", //TypeScript Definitions for parameter name detection
            "--binaryFile", "module.wasm",
            "--exportTable",
            //"--textFile", "module.wat",
            //"--sourceMap"
        ], {
            stdout,
            stderr,
            transforms: [/*AssemblyScriptGetterTransform, */self.asbind],
            readFile(name, baseDir) {
                //console.log("Read "+name);
                const sourceStr = self.prepareSourceCode(module.source);
                return name === "module.ts" ? sourceStr : null;
            },
            writeFile(name, data, baseDir) {
                //console.log("WRITE " + name + " (" + data.length + " Bytes)");
                if (name === "module.wasm")
                    binaryData = data;
                if(name === "module.tsd")
                    definitionData = data;
                if(binaryData != null && definitionData != null)
                    resolve({definitionData: definitionData, binaryData: binaryData});
            },
            listFiles(dirname, baseDir) {
                return [];
            }
        }, err => {
            if (err) {
                let errorMessage = "--- AssemblyScript Compile Error ---\n" +
                    err+"\n" +
                    "STDOUT: "+stdout.toString()+"\n" +
                    "STDERR: "+stderr.toString();
                console.log(errorMessage);
                throw new CompileError(errorMessage, module.context);
            }
        });
    });
}

AssemblyScriptCompiler.prototype.prepareSourceCode = function(source) {
    let getters = this.generateGlobalGetters(source);
    let sourceStr = source.join("\n");
    return this.supportLibraryDeclares + sourceStr + getters;
}

AssemblyScriptCompiler.prototype.generateGlobalGetters = function(source) {
    let getters = "";
    for(let line in source) {
        if(source.includes(this.internalGetterPrefix)) {
            throw new CompileError("Do not use "+this.internalGetterPrefix+" for names in your source, as it is reserved for internal use.", "compileError");
        }
        else if(source[line].indexOf("export var") === 0) {
            let tmp = source[line].split('=')[0].split(':');
            let type = "anyref";
            if(tmp.length >= 2)
                type = tmp[1].split(/[\s=]+/).filter(x => x !== "")[0];
            else
                throw new CompileError("Exported variables require an explicit type! \n\""+source[line]+"\" does not contain a type.", "compileError");
            tmp = tmp[0].split(/[\s=]+/).filter(x => x !== "");
            let name = tmp[tmp.length-1];
            getters += "export function "+this.internalGetterPrefix+name+"():"+type+" { return "+name+"; }\n";
        }
    }

    return getters;
}



module.exports = AssemblyScriptCompiler;