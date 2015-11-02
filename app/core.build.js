(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

window.sweva = {};
window.sweva.Module = require('./composables/module.js');
window.sweva.Composition = require('./composables/composition.js');
window.sweva.axios = require('../../bower_components/axios/dist/axios.min.js');
},{"../../bower_components/axios/dist/axios.min.js":5,"./composables/composition.js":3,"./composables/module.js":4}],2:[function(require,module,exports){
'use strict';

function Composable() {
}

Composable.prototype.name = 'someModule';
Composable.prototype.dataBlocksIn = 1;
Composable.prototype.dataBlocksOut = 1;
Composable.prototype.inputBlocks = 0;

Composable.prototype.initialize = function (initializationObject) {
    if (initializationObject.hasOwnProperty('name')) {
        this.name = initializationObject.name;
    } else {
        this.name = 'someModule';
    }
    if (initializationObject.hasOwnProperty('dataBlocksIn')) {
        this.dataBlocksIn = initializationObject.dataBlocksIn;
    } else {
        this.dataBlocksIn = 1;
    }

    if (initializationObject.hasOwnProperty('dataBlocksOut')) {
        this.dataBlocksOut = initializationObject.dataBlocksOut;
    } else {
        this.dataBlocksOut = 1;
    }

    if (initializationObject.hasOwnProperty('inputBlocks')) {
        this.inputBlocks = initializationObject.inputBlocks;
    } else {
        this.inputBlocks = 0;
    }
}

Composable.prototype.execute = function (dataArray, inputArray) {
    return new Promise(function (resolve, reject) {
        resolve(0);
    });
}
module.exports = Composable;
},{}],3:[function(require,module,exports){
'use strict';

var Composable = require('./composable.js');

function Composition(initializationObject) {

    if (initializationObject.hasOwnProperty('modules')) {
        this.modules = initializationObject.modules;
    } else {
        this.modules = {};
    }

    if (initializationObject.hasOwnProperty('links')) {
        this.links = initializationObject.links;
    } else {
        this.links = {};
    }

    this.initialize(initializationObject);
    this.analyzeLinkGraph();
}
Composition.prototype = Object.create(Composable.prototype);

Composition.prototype.hasParameters = function (module) {
    //how many parameters do we need?
    var parametersNeeded = this.modules[module].dataBlocksIn;

    //we do not need any
    if (parametersNeeded == 0) {
        return true;
    }

    //we need at least one
    if (this.parameters.hasOwnProperty(module)) {
        //compare available parameter count with needed
        return this.parameters[module].count == parametersNeeded;
    }
    return false;
}

Composition.prototype.addParameter = function (module, position, value) {
    //if no key vor module present, create one
    if (!this.parameters.hasOwnProperty(module)) {
        this.parameters[module] = {
            count: 0
        };
    }
    //for paramaeters (datablocks) are expected in a certain order
    if (!this.parameters[module].hasOwnProperty(position)) {
        this.parameters[module].count += 1;
    }

    //check if position is in bounds
    if (this.modules[module].dataBlocksIn <= position || position < 0) {
        //throw some error
    }

    this.parameters[module][position] = value;
}
Composition.prototype.reset = function () {
    this.parameters = {};
    this.unlcearedModules = [];
    this.outputArray = [];
    for (var key in this.modules) {
        if (this.modules.hasOwnProperty(key)) {
            this.unlcearedModules.push({
                module: key,
                cleared: false
            });
        }
    }
}
Composition.prototype.analyzeLinkGraph = function () {
    this.startingModules = Object.keys(this.modules);
    this.endingModules = {};
    for (var key in this.modules) {
        if (this.modules.hasOwnProperty(key)) {
            this.endingModules[key] = true;
        }
    }

    //remove inverseLinks later, if actually not needed
    this.inverseLinks = {};

    for (var key in this.links) {
        if (this.links.hasOwnProperty(key)) {
            for (var i = 0; i < this.links[key].length; i++) {
                //build inverse graph
                var prop = this.links[key][i].to;
                if (!this.inverseLinks.hasOwnProperty(prop)) {
                    this.inverseLinks[prop] = [key];
                }
                else {
                    this.inverseLinks[prop].push(key);
                }
                //if one module A points to module B, then B cannot be startingModule
                var propIndex = this.startingModules.indexOf(prop);
                if (propIndex >= 0) {
                    this.startingModules.splice(propIndex, 1);
                }
                //if one module A points to module B, then A cannot be endingModule

                if (this.endingModules.hasOwnProperty(key)) {
                    delete this.endingModules[key]
                }
            }
        }
    }

    //implicit imformation
    this.dataBlocksIn = this.startingModules.length;
    this.dataBlocksOut = Object.keys(this.endingModules).length;
    this.inputBlocks = Object.keys(this.modules).length;
    /*console.log(this.name);
    console.log(this.dataBlocksIn);
    console.log(this.dataBlocksOut);
    console.log(this.inputBlocks);*/

    /*console.log(this.startingModules);
    console.log(this.endingModules);
    console.log(this.inverseLinks);*/
}

Composition.prototype.moduleQueueExecution = function () {
    for (var i = 0; i < this.unlcearedModules.length; i++) {
        if (this.unlcearedModules[i].cleared) {
            continue;
        }

        var moduleName = this.unlcearedModules[i].module;
        var data = [];
        var input = [];

        //fill data and input for next module call
        if (this.hasParameters(moduleName)) {
            for (var k = 0; k < this.parameters[moduleName].count; k++) {
                data.push(this.parameters[moduleName][k]);
            }

            input = this.inputArray[i];
        }
        else {
            continue;
        }

        //not continued = modulName can be executed
        var self = this;
        var func = function (moduleName, i) {
            return function (output) {
                //console.log(moduleName + " " + output)

                if (self.endingModules.hasOwnProperty(moduleName)) {
                    var allCleared = true;
                    self.outputArray.push(output);
                    for (var k = 0; k < self.unlcearedModules.length; k++) {
                        if (!self.unlcearedModules[k].cleared) {
                            allCleared = false;
                        }
                    }

                    //if this was the last endingModule, finish
                    if (allCleared) {
                        self.executeFinishedCallback();
                    }
                }
                else {
                    for (var k = 0; k < output.length; k++) {
                        self.addParameter(self.links[moduleName][k].to, self.links[moduleName][k].parameter || 0, output[k]);
                    }
                }

                //console.log(self.parameters);

                self.moduleQueueExecution.apply(self);
            }
        };
        if (!this.unlcearedModules[i].cleared) {
            this.unlcearedModules[i].cleared = true;
           
            this.modules[moduleName].execute(data, input).then(func(moduleName, i));
        }

        //debug stuff
        /*var st = "";
        for (var  k= 0; k < this.unlcearedModules.length; k++) {
            st += this.unlcearedModules[k].module +':'+ this.unlcearedModules[k].cleared+'  ';
        }
        console.log(st);*/
    }
}
Composition.prototype.execute = function (dataArray, inputArray) {
    var self = this;
    this.dataArray = dataArray;
    this.inputArray = inputArray;

    this.reset();
   
    return new Promise(function (resolve, reject) {
        if (self.dataArray.length < self.dataBlocksIn) {
            //throw error
            reject('Composition ' + '\"' + self.name + '\" has only ' + self.dataArray.length
                + ' elements as data, but requires '+self.dataBlocksIn+'!');
            return;
        }

        /*if (self.inputArray.length < self.inputBlocks) {
            //throw error
            reject('Composition ' + '\"' + self.name + '\" has only ' + self.inputArray.length
                + ' elements as input, but requires ' + self.inputBlocks + '!');
            return;
        }*/


        //each starting module has an own data block (array eslement)
        for (var i = 0; i < self.startingModules.length; i++) {
            var moduleNeedsDataBlocks = self.modules[self.startingModules[i]].dataBlocksIn;
            for (var k = 0; k < moduleNeedsDataBlocks; k++) {
                self.addParameter(self.startingModules[i], k, self.dataArray[i][k]);
            }
        }
        
        self.executeFinishedCallback = function (error) {
            if (error) {
                reject(error);
            }
            else {
               
                resolve(self.outputArray);
            }            
        }
        self.moduleQueueExecution.apply(self);
    });
}

module.exports = Composition;
},{"./composable.js":2}],4:[function(require,module,exports){
'use strict';

var Composable = require('./composable.js');

function Module(initializationObject){//name, createRequest, transformResponse) {
    
    if (initializationObject.hasOwnProperty('request')) {
        this.createRequestFunction = initializationObject.request;
    } else {
        this.createRequestFunction = function (dataArray, inputArray) {
            return new Promise(function (resolve, reject) {
                resolve(0);
            });
        };
    }
    if (initializationObject.hasOwnProperty('response')) {
        this.transformResponseFunction = initializationObject.response;
    } else {
        this.transformResponseFunction = function (response) { return [response.data] };
    }

    this.initialize(initializationObject);
}
Module.prototype = Object.create(Composable.prototype);



Module.prototype.createRequest = function (dataArray, inputArray) {
    return this.createRequestFunction(dataArray, inputArray);
}
Module.prototype.callService = function (request, inputArray) {
    var self = this;
    return new Promise(function (resolve, reject) {
        
        request
        .then(function (response) {
            resolve(self.transformResponse(response, inputArray));
        })
        .catch(function (response) {
            reject(response);
        });        
    });
}
Module.prototype.transformResponse = function (response) {
    return this.transformResponseFunction(response);
}
Module.prototype.execute = function (dataArray, inputArray) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var request = self.createRequest(dataArray, inputArray);
        self.callService(request, inputArray).then(function (output) {
            resolve(output);
        }).catch(function (err) {
            console.error(err);
        });
    });
}
module.exports = Module;
},{"./composable.js":2}],5:[function(require,module,exports){
/* axios v0.7.0 | (c) 2015 by Matt Zabriskie */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.axios=t():e.axios=t()}(this,function(){return function(e){function t(r){if(n[r])return n[r].exports;var o=n[r]={exports:{},id:r,loaded:!1};return e[r].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}var n={};return t.m=e,t.c=n,t.p="",t(0)}([function(e,t,n){e.exports=n(1)},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(4),s=n(12),u=e.exports=function(e){"string"==typeof e&&(e=o.merge({url:arguments[0]},arguments[1])),e=o.merge({method:"get",headers:{},timeout:r.timeout,transformRequest:r.transformRequest,transformResponse:r.transformResponse},e),e.withCredentials=e.withCredentials||r.withCredentials;var t=[i,void 0],n=Promise.resolve(e);for(u.interceptors.request.forEach(function(e){t.unshift(e.fulfilled,e.rejected)}),u.interceptors.response.forEach(function(e){t.push(e.fulfilled,e.rejected)});t.length;)n=n.then(t.shift(),t.shift());return n};u.defaults=r,u.all=function(e){return Promise.all(e)},u.spread=n(13),u.interceptors={request:new s,response:new s},function(){function e(){o.forEach(arguments,function(e){u[e]=function(t,n){return u(o.merge(n||{},{method:e,url:t}))}})}function t(){o.forEach(arguments,function(e){u[e]=function(t,n,r){return u(o.merge(r||{},{method:e,url:t,data:n}))}})}e("delete","get","head"),t("post","put","patch")}()},function(e,t,n){"use strict";var r=n(3),o=/^\)\]\}',?\n/,i={"Content-Type":"application/x-www-form-urlencoded"};e.exports={transformRequest:[function(e,t){return r.isFormData(e)?e:r.isArrayBuffer(e)?e:r.isArrayBufferView(e)?e.buffer:!r.isObject(e)||r.isFile(e)||r.isBlob(e)?e:(r.isUndefined(t)||(r.forEach(t,function(e,n){"content-type"===n.toLowerCase()&&(t["Content-Type"]=e)}),r.isUndefined(t["Content-Type"])&&(t["Content-Type"]="application/json;charset=utf-8")),JSON.stringify(e))}],transformResponse:[function(e){if("string"==typeof e){e=e.replace(o,"");try{e=JSON.parse(e)}catch(t){}}return e}],headers:{common:{Accept:"application/json, text/plain, */*"},patch:r.merge(i),post:r.merge(i),put:r.merge(i)},timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN"}},function(e,t){"use strict";function n(e){return"[object Array]"===v.call(e)}function r(e){return"[object ArrayBuffer]"===v.call(e)}function o(e){return"[object FormData]"===v.call(e)}function i(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer}function s(e){return"string"==typeof e}function u(e){return"number"==typeof e}function a(e){return"undefined"==typeof e}function f(e){return null!==e&&"object"==typeof e}function c(e){return"[object Date]"===v.call(e)}function p(e){return"[object File]"===v.call(e)}function l(e){return"[object Blob]"===v.call(e)}function d(e){return e.replace(/^\s*/,"").replace(/\s*$/,"")}function h(e){return"[object Arguments]"===v.call(e)}function m(){return"undefined"!=typeof window&&"undefined"!=typeof document&&"function"==typeof document.createElement}function y(e,t){if(null!==e&&"undefined"!=typeof e){var r=n(e)||h(e);if("object"==typeof e||r||(e=[e]),r)for(var o=0,i=e.length;i>o;o++)t.call(null,e[o],o,e);else for(var s in e)e.hasOwnProperty(s)&&t.call(null,e[s],s,e)}}function g(){var e={};return y(arguments,function(t){y(t,function(t,n){e[n]=t})}),e}var v=Object.prototype.toString;e.exports={isArray:n,isArrayBuffer:r,isFormData:o,isArrayBufferView:i,isString:s,isNumber:u,isObject:f,isUndefined:a,isDate:c,isFile:p,isBlob:l,isStandardBrowserEnv:m,forEach:y,merge:g,trim:d}},function(e,t,n){(function(t){"use strict";e.exports=function(e){return new Promise(function(r,o){try{"undefined"!=typeof XMLHttpRequest||"undefined"!=typeof ActiveXObject?n(6)(r,o,e):"undefined"!=typeof t&&n(6)(r,o,e)}catch(i){o(i)}})}}).call(t,n(5))},function(e,t){function n(){f=!1,s.length?a=s.concat(a):c=-1,a.length&&r()}function r(){if(!f){var e=setTimeout(n);f=!0;for(var t=a.length;t;){for(s=a,a=[];++c<t;)s&&s[c].run();c=-1,t=a.length}s=null,f=!1,clearTimeout(e)}}function o(e,t){this.fun=e,this.array=t}function i(){}var s,u=e.exports={},a=[],f=!1,c=-1;u.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];a.push(new o(e,t)),1!==a.length||f||setTimeout(r,0)},o.prototype.run=function(){this.fun.apply(null,this.array)},u.title="browser",u.browser=!0,u.env={},u.argv=[],u.version="",u.versions={},u.on=i,u.addListener=i,u.once=i,u.off=i,u.removeListener=i,u.removeAllListeners=i,u.emit=i,u.binding=function(e){throw new Error("process.binding is not supported")},u.cwd=function(){return"/"},u.chdir=function(e){throw new Error("process.chdir is not supported")},u.umask=function(){return 0}},function(e,t,n){"use strict";var r=n(2),o=n(3),i=n(7),s=n(8),u=n(9);e.exports=function(e,t,a){var f=u(a.data,a.headers,a.transformRequest),c=o.merge(r.headers.common,r.headers[a.method]||{},a.headers||{});o.isFormData(f)&&delete c["Content-Type"];var p=new(XMLHttpRequest||ActiveXObject)("Microsoft.XMLHTTP");if(p.open(a.method.toUpperCase(),i(a.url,a.params),!0),p.timeout=a.timeout,p.onreadystatechange=function(){if(p&&4===p.readyState){var n=s(p.getAllResponseHeaders()),r=-1!==["text",""].indexOf(a.responseType||"")?p.responseText:p.response,o={data:u(r,n,a.transformResponse),status:p.status,statusText:p.statusText,headers:n,config:a};(p.status>=200&&p.status<300?e:t)(o),p=null}},o.isStandardBrowserEnv()){var l=n(10),d=n(11),h=d(a.url)?l.read(a.xsrfCookieName||r.xsrfCookieName):void 0;h&&(c[a.xsrfHeaderName||r.xsrfHeaderName]=h)}if(o.forEach(c,function(e,t){f||"content-type"!==t.toLowerCase()?p.setRequestHeader(t,e):delete c[t]}),a.withCredentials&&(p.withCredentials=!0),a.responseType)try{p.responseType=a.responseType}catch(m){if("json"!==p.responseType)throw m}o.isArrayBuffer(f)&&(f=new DataView(f)),p.send(f)}},function(e,t,n){"use strict";function r(e){return encodeURIComponent(e).replace(/%40/gi,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}var o=n(3);e.exports=function(e,t){if(!t)return e;var n=[];return o.forEach(t,function(e,t){null!==e&&"undefined"!=typeof e&&(o.isArray(e)&&(t+="[]"),o.isArray(e)||(e=[e]),o.forEach(e,function(e){o.isDate(e)?e=e.toISOString():o.isObject(e)&&(e=JSON.stringify(e)),n.push(r(t)+"="+r(e))}))}),n.length>0&&(e+=(-1===e.indexOf("?")?"?":"&")+n.join("&")),e}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e){var t,n,o,i={};return e?(r.forEach(e.split("\n"),function(e){o=e.indexOf(":"),t=r.trim(e.substr(0,o)).toLowerCase(),n=r.trim(e.substr(o+1)),t&&(i[t]=i[t]?i[t]+", "+n:n)}),i):i}},function(e,t,n){"use strict";var r=n(3);e.exports=function(e,t,n){return r.forEach(n,function(n){e=n(e,t)}),e}},function(e,t,n){"use strict";var r=n(3);e.exports={write:function(e,t,n,o,i,s){var u=[];u.push(e+"="+encodeURIComponent(t)),r.isNumber(n)&&u.push("expires="+new Date(n).toGMTString()),r.isString(o)&&u.push("path="+o),r.isString(i)&&u.push("domain="+i),s===!0&&u.push("secure"),document.cookie=u.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}},function(e,t,n){"use strict";function r(e){var t=e;return s&&(u.setAttribute("href",t),t=u.href),u.setAttribute("href",t),{href:u.href,protocol:u.protocol?u.protocol.replace(/:$/,""):"",host:u.host,search:u.search?u.search.replace(/^\?/,""):"",hash:u.hash?u.hash.replace(/^#/,""):"",hostname:u.hostname,port:u.port,pathname:"/"===u.pathname.charAt(0)?u.pathname:"/"+u.pathname}}var o,i=n(3),s=/(msie|trident)/i.test(navigator.userAgent),u=document.createElement("a");o=r(window.location.href),e.exports=function(e){var t=i.isString(e)?r(e):e;return t.protocol===o.protocol&&t.host===o.host}},function(e,t,n){"use strict";function r(){this.handlers=[]}var o=n(3);r.prototype.use=function(e,t){return this.handlers.push({fulfilled:e,rejected:t}),this.handlers.length-1},r.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},r.prototype.forEach=function(e){o.forEach(this.handlers,function(t){null!==t&&e(t)})},e.exports=r},function(e,t){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}}])});
//# sourceMappingURL=axios.min.map
},{}]},{},[1]);
