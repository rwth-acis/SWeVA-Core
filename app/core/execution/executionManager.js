'use strict';

var ExecutionError = require('../errors/executionError.js');

function ExecutionManager(name) {
    if (typeof name === 'string') {
        this.name = name;
    }
    else {
        this.name = 'ExecutionManager';
    }
    this.modulesTotal = 1;
    this.modulesDone = 0;
    this.progressCallback = null;
}
ExecutionManager.prototype.onProgress = function (callback) {
    this.progressCallback = callback;
}
ExecutionManager.prototype.setup = function (executionArray) {
    function countModules(composable) {
        if (typeof composable.modules === 'undefined') {
            return 1;
        }
        else {
            var count = 0;

            for (var key in composable.modules) {
                if (composable.modules.hasOwnProperty(key)) {
                    count += countModules(composable.modules[key]);
                }
            }
            return count;
        }
    }

    var needsLoading = [];
    this.composables = {};
    this.isReady = false;

    this.wantsToExecute = false;
    //if it is not an array, make it one
    if (!Array.isArray(executionArray)) {
        executionArray = [executionArray];
    }

    for (var i = 0; i < executionArray.length; i++) {
        var composable = executionArray[i];
        if (typeof composable === 'string') {
            needsLoading.push(sweva.ComposableLoader.load(composable, this.composables, composable));
        }
        else {
            if (composable.type == 'module') {
                this.composables[composable.name] = new Module(composable);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
            }
            else {
                this.composables[composable.name] = new Composition(composable);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
                needsLoading.push(this.composables[composable.name].loadModules());
            }
        }
    }
    var self = this;
    Promise.all(needsLoading).then(function () {

        //let's quickly check, ho meny modules are used in total to have a rough estimate for progress later on
        var moduleCount = 0;
        for (var i = 0; i < executionArray.length; i++) {
            moduleCount += countModules(sweva.ComposableLoader.get(executionArray[i]));
        }
        self.modulesTotal = moduleCount;
        self.modulesDone = 0;

        //composables should now contain everything
        self.isReady = true;
        console.log('all loaded');
        if (self.wantsToExecute) {
            self.wantsToExecute = false;
            self.executeCallback();
        }
       
        //console.log('Modules counted: ' + moduleCount);
    })
    .catch(function (error) {
        sweva.ErrorManager.error(
                      new ExecutionError('Could not load all modules: ' + error,
                      self.name, error));
    });
}

ExecutionManager.prototype.progressUpdate = function (alias, name, context) {
    
    if (this.progressCallback !== null) {
        this.modulesDone++;
        
        var progress = this.modulesDone/+this.modulesTotal;
        this.progressCallback((progress*100).toFixed(0));
    }
}
ExecutionManager.prototype.execute = function (data, input) {
    var executions = [];
    var self = this;

    return new Promise(function (resolve, reject) {
        var func = function (composables, executions, resolve, reject) {
            return function () {
                var onlyOneComposable = false;

                if (Object.keys(composables).length == 1) {
                    onlyOneComposable = true;
                }
                for (var key in composables) {
                    if (composables.hasOwnProperty(key)) {
                        if (onlyOneComposable) {
                            executions.push(composables[key].execute(data, input, '', key, self.progressUpdate.bind(self)));
                        }
                        else {
                            executions.push(composables[key].execute(data[key], input[key], '', key, self.progressUpdate.bind(self)));
                        }
                    }
                }

                Promise.all(executions).then(function (results) {
                    if (onlyOneComposable) {
                        return resolve(results[0]);
                    }
                    resolve(results);
                })
                .catch(function (results) {
                    if (onlyOneComposable) {
                        return resolve(results);
                    }
                    sweva.ErrorManager.error(
                      new ExecutionError('Something unexpected happened: ' + results,
                      this.name, results));
                    reject(results);
                });
            }
        }

        if (self.isReady) {
            func(self.composables, executions, resolve, reject)();
        }
        else {
            self.wantsToExecute = true;
            self.executeCallback = func(self.composables, executions, resolve, reject);
        }
    });
}

ExecutionManager.prototype.run = ExecutionManager.prototype.execute;
module.exports = ExecutionManager