'use strict';
var JsTokens = require('../../../node_modules/js-tokens/index.js');
function SwevaScript() {
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

    this.allowedGlobals = {
        Math: true,
        console: true
    }
}

SwevaScript.prototype.verify = function (code) {
    try {
        var tokens = code.match(JsTokens);
    } catch (e) {
        return {
            valid: false,
            error: e.message
        }
    }

    var prettyPrint = ''
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i].trim();
        if (token.length > 0) {
            if (this.forbiddenList.hasOwnProperty(token)) {
                return {
                    valid: false,
                    error: 'Invalid usage of ' + token
                };
            }
        }

        // prettyPrint += token.length == 0 ? '' : token + '\n';
    }

    // console.log(prettyPrint);
    return {
        valid: true,
        error: ''
    }
}

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
    if (typeof property === 'string') {
        if (!object.window && !forbiddenList.hasOwnProperty(property)) {
            return object[property];
        }
    }
    else if (typeof property === 'number') {
        return object[property];
    }
    console.error('Illegal property name: ' + property);
    return null;
}

SwevaScript.prototype.sanitize = function (code, errorCallback) {
    code = code.replace(/(\r\n|\n|\r)/gm, ""); //all in one line

    
    var error = '';    
    var validation = this.verify(code);    
    if (validation.valid) {        
        var allowedGlobals = this.allowedGlobals;
        var globals = Object.keys(window).filter(function (obj) {
            return !allowedGlobals.hasOwnProperty(obj)
        }).join(','); //we want to shadow all global variables except the ones we allow
        //https://stackoverflow.com/posts/26917938/revisions
        var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var match = funcReg.exec(code);
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
    console.log(2);
    return null;
}

module.exports = SwevaScript;