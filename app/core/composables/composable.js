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