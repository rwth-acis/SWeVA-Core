'use strict';

var SwevaError = require('./swevaError.js');

function ExecutionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'ExecutionError';
}
ExecutionError.prototype = Object.create(SwevaError.prototype);

module.exports = ExecutionError