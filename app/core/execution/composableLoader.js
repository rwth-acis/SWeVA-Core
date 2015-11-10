'use strict';

var axios = require('../../../bower_components/axios/dist/axios.min.js');

var Module = require('../composables/module.js');
var Composition = require('../composables/composition.js');
var DefinitionError = require('../errors/definitionError.js');


function ComposableLoader(basePath, suffix) {
    this.basePath = basePath || '';
    this.suffix = suffix || '.json';
    this.composables = {};
    this.waitingList = {};
}

ComposableLoader.prototype.size = function () {
    return Object.keys(this.composables).length;
}
ComposableLoader.prototype.get = function (name) {
    return this.composables[name];
}
ComposableLoader.prototype.add = function (name, composable) {
    this.composables[name] = composable;
}
ComposableLoader.prototype.convertToObject = function (json, context) {
    var result = json;
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            //reconstruct functions from string
            if (typeof json[key][0] == 'string') {
                var str = new String(json[key][0]);

                if (str.trim().indexOf('function') == 0) {
                    json[key] = sweva.SwevaScript.sanitize(json[key].join(''),
                        function (error) {
                            sweva.ErrorManager.error(
                              new DefinitionError('Could not sanitize function "' + key + '" when loading "' + context + '": ' + error,
                              context, json));
                        });

                    //console.log(json[key]);
                }
            }
        }
    }

    return result;
}

ComposableLoader.prototype.assignLoadedComposables = function (name, composable, assignToObject, property) {
    this.composables[name] = composable;

    if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
        assignToObject[property] = composable;
        //deal with waitinglist: as the caller has to wait for 'then' we, can set the required values now with some delay

        if (this.waitingList.hasOwnProperty(name)) {
            for (var i = 0; i < this.waitingList[name].length; i++) {
                var assignTo = this.waitingList[name][i].assignTo;
                var prop = this.waitingList[name][i].prop;

                assignTo[prop] = composable;
            }
            delete this.waitingList[name];
        }
    }
}
ComposableLoader.prototype.load = function (name, assignToObject, property) {
    var self = this;

    return new Promise(function (resolve, reject) {
        if (self.composables.hasOwnProperty(name)) {
            if (self.composables[name] === true) {//we have only our placeholder, no real value yet
                //put in waitinglist, which is checked after each load
                if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
                    if (!self.waitingList.hasOwnProperty(name)) {
                        self.waitingList[name] = [];
                    }
                    self.waitingList[name].push({
                        assignTo: assignToObject,
                        prop: property
                    });
                }

                resolve(self.composables[name]);
            }
            else {
                if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
                    assignToObject[property] = self.composables[name];
                }
                resolve(self.composables[name]);
            }
        }
        else {
            self.composables[name] = true; //set key and prevent unnecessary loads, while loading is already in progress
            var url = self.basePath + name + self.suffix;
            var request = axios.get(url)
            .then(function (response) {
                var composable = self.convertToObject(response.data, url);

                var func = function (comp) {
                    return function (res, rej) {                        
                        res(comp);
                    }
                }
                var internalPromise = new Promise(func(composable));

                //check if components just extends existing one
                if (composable.hasOwnProperty('extends')) {
                    var baseComposableName = composable.extends;
                    var func2 = function (baseComposableName, composable) {
                        return function (res, rej) {
                            self.load(baseComposableName).then(function (comp) {
                                res(comp.extendWith(composable));                                
                            });
                        }
                    };

                    internalPromise = new Promise(func2(baseComposableName, composable));
                }
               

                internalPromise.then(function (composable) {
                    console.log('loaded ' + composable.name);

                    if (composable.type == 'module') {
                        composable = new Module(composable);

                        self.assignLoadedComposables(name, composable, assignToObject, property);

                        resolve(composable);
                    }
                    else {
                        composable = new Composition(composable);

                        self.assignLoadedComposables(name, composable, assignToObject, property);

                        composable.loadModules().then(function () {
                            resolve(composable);
                        });
                    }
                });
            })
            .catch(function (response) {
                reject(self.basePath + name + self.suffix); //could not load
            });
        }
    });
}
ComposableLoader.prototype.clear = function () {
    this.composables = {};
    this.waitingList = {};
}
module.exports = ComposableLoader;