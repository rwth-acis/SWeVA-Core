'use strict';

var SwevaError = require('./swevaError.js');
/**
 * An execution error should be used, if the error occured during execution.
 * @constructor
 * @extends SwevaError
 */
function ExecutionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'ExecutionError';
}
ExecutionError.prototype = Object.create(SwevaError.prototype);

module.exports = ExecutionError