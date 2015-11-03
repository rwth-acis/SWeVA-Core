'use strict';

var axios = require('../../../bower_components/axios/dist/axios.min.js');

var Module = require('../composables/module.js');
var Composition = require('../composables/composition.js');

//https://stackoverflow.com/posts/26917938/revisions
if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var match = funcReg.exec(this.replace(/\n/g, ' '));

        if (match) {
            return new Function(match[1].split(','), match[2]);
        }
        return null;
    };
}

function ComposableLoader(basePath, suffix) {
    this.basePath = basePath || '';
    this.suffix = suffix || '.json';
    this.composables = {};
}
ComposableLoader.prototype.convertToObject = function (json) {
    
    var result = json;
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            
            //reconstruct functions from string
            if (typeof json[key][0] == 'string') {
                var str = new String(json[key][0]);
                
                if (str.trim().indexOf('function') == 0) {
                    json[key] = json[key].join('').parseFunction();
                }
                
            }


           
        }
    }

    return result;
}
ComposableLoader.prototype.load = function (name, assignToObject, property) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.composables.hasOwnProperty(name)) {
            assignToObject[property] = self.composables[name];
            resolve(self.composables[name]);
        }
        else {
            var request = axios.get(self.basePath + name + self.suffix)
            .then(function (response) {
                var composable = self.convertToObject(response.data);
                console.log('loaded ' + composable.name);
                if (composable.type == 'module') {
                    composable = new Module(composable);
                   
                }
                else {
                    composable = new Composition(composable);
                    
                }
                self.composables[name] = composable;
               
                assignToObject[property] = composable;
               
                resolve(composable);
            })
            .catch(function (response) {
                reject(self.basePath + name + self.suffix); //could not load
            });
        }
    });
}
ComposableLoader.prototype.clear = function () {
    this.composables = {};
}
module.exports = ComposableLoader;