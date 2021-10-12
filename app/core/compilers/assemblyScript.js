'use strict';

var AsBind = require('../../../node_modules/as-bind/dist/as-bind.iife.js');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/compiler.js')
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

/**
 * The AssemblyScript compiler supports strict TypeScript
 * 
 * @constructor
 * @extends runner
 *
 */
function AssemblyScript() {
    this.asbind = null;
    this.asc = null;
}

//inherit properties
AssemblyScript.prototype = Object.create(Compiler.prototype);
AssemblyScript.prototype.constructor = AssemblyScript;

Runner.prototype.setup = function () {
    var t = this;

    if(!this.setupCompleted) {
        require([ "../../node_modules/assemblyscript/dist/sdk.js", "../../node_modules/as-bind/dist/as-bind.iife.js" ], ({ asc, assemblyscript }) => {
            define("visitor-as/as", [], assemblyscript);
            require(["../../node_modules/as-bind/dist/transform.amd.js"], asbind => {
                asc.ready.then(() => {
                t.asc = asc;
                t.asbind = asbind;
                t.setupCompleted = true;
                });
            });
        });
    }
}

Runner.prototype.compile = function (module) {
    if (!this.setupCompleted)
        this.setup();

    return new Promise((resolve) => {
        const stdout = asc.createMemoryStream();
        const stderr = asc.createMemoryStream();
        asc.main([
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
            transforms: [asbind],
            readFile(name, baseDir) {
                return name === "module.ts" ? module.source : null;
            },
            writeFile(name, data, baseDir) {
                //console.log(`>>> WRITE:${name} >>> ${data.length} Bytes`);
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

module.exports = AssemblyScript; 