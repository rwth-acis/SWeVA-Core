'use strict';

var ExecutionError = require('../errors/executionError.js');

function ExecutionManager(name) {
    if (typeof name === 'string') {
        this.name = name;
    }
    else {
        this.name = 'ExecutionManager';
    }
}
ExecutionManager.prototype.setup = function (executionArray) {
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
            }
            else {
                this.composables[composable.name] = new Composition(composable);
                needsLoading.push(this.composables[composable.name].loadModules());
            }
        }
    }
    var self = this;
    Promise.all(needsLoading).then(function () {
        //composables should now contain everything
        self.isReady = true;
        if (self.wantsToExecute) {
            self.wantsToExecute = false;
            self.executeCallback();
        }
    })
    .catch(function (error) {
        sweva.ErrorManager.error(
                      new ExecutionError('Could not load all modules: ' + error,
                      self.name, error));
    });
}

ExecutionManager.prototype.execute = function (data, input) {
    var executions = [];
    var self = this;

    return new Promise(function (resolve, reject) {
        var func = function (composables, executions, resolve, reject) {
            return function () {
                var onlyOneConsumable = false;

                if (Object.keys(composables).length == 1) {
                    onlyOneConsumable = true;
                }
                for (var key in composables) {
                    if (composables.hasOwnProperty(key)) {
                        if (onlyOneConsumable) {
                            executions.push(composables[key].execute(data, input));
                        }
                        else {
                            executions.push(composables[key].execute(data[key], input[key]));
                        }
                    }
                }

                Promise.all(executions).then(function (results) {
                    if (onlyOneConsumable) {
                        return resolve(results[0]);
                    }
                    resolve(results);
                })
                .catch(function (results) {
                    if (onlyOneConsumable) {
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