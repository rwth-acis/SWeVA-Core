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

/**
 * The AssemblyScriptCompiler supports strict TypeScript
 * 
 * @constructor
 * @extends Compiler
 *
 */
function AssemblyScriptCompiler() {
    this.asbind = null;
    //this.asc = null;
}

//inherit properties
AssemblyScriptCompiler.prototype = Object.create(Compiler.prototype);
AssemblyScriptCompiler.prototype.constructor = AssemblyScriptCompiler;

AssemblyScriptCompiler.prototype.setup = async function () {
    var self = this;

    return new Promise((resolve) => {
        if(!this.setupCompleted) {
            console.log("Loading AssemblyScript compiler");
            window.require([ "../../../node_modules/assemblyscript/dist/sdk.js" ], ({ asc, assemblyscript }) => {
                define("visitor-as/as", [], assemblyscript);
                window.require(["../../../node_modules/as-bind/dist/transform.amd.js"], asbind => {
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
            transforms: [self.asbind],
            readFile(name, baseDir) {
                console.log("Read "+name);
                const sourceStr = module.source.join("\n");
                return name === "module.ts" ? sourceStr : null;
            },
            writeFile(name, data, baseDir) {
                console.log("WRITE " + name + " (" + data.length + " Bytes)");
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

module.exports = AssemblyScriptCompiler;