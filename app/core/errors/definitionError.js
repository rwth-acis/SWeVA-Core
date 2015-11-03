'use strict';

var SwevaError = require('./swevaError.js');
function DefinitionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'DefinitionError';
}
DefinitionError.prototype = Object.create(SwevaError.prototype);

module.exports = DefinitionError;