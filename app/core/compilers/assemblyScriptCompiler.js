'use strict';

//var {asc, assemblyscript} = require('../../../node_modules/assemblyscript/dist/sdk.js');
//var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
//var AsBindTransform = require('../../../node_modules/as-bind/dist/transform.cjs');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/compiler.js')
var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

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
    var self = this;

    await this.setup()

    return new Promise((resolve) => {
        const stdout = self.asc.createMemoryStream();
        const stderr = self.asc.createMemoryStream();
        self.asc.main([
            "module.ts",
            "-O3",
            "--runtime", "stub",
            "--binaryFile", "module.wasm",
            "--exportRuntime"
            //"--textFile", "module.wat",
            //"--sourceMap"
        ], {
            stdout,
            stderr,
            transforms: [self.asbind],
            readFile(name, baseDir) {
                return name === "module.ts" ? module.source : null;
            },
            writeFile(name, data, baseDir) {
                console.log("WRITE " + name + " (" + data.length + " Bytes)");
                if (name === "module.wasm") {
                    resolve(data);
                }
            },
            listFiles(dirname, baseDir) {
                return [];
            }
        }, err => {
            if (err) {
                console.log(">>> THROWN >>>");
                console.log(err);
                console.log(`>>> STDOUT >>>\n${stdout.toString()}`);
                console.log(`>>> STDERR >>>\n${stderr.toString()}`);
            }
        });
    });
}

module.exports = AssemblyScriptCompiler;