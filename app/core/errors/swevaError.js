'use strict';

function SwevaError(message, context, faultyObject) {
    
    this.name = 'SwevaError';
    this.message = message || 'Default Message';
    this.stack = (new Error()).stack;
    this.context = context;

    if (faultyObject !== 'undefined') {

        //shallow copy: should provide enough information and save RAM
        //copy is needed, as we need the object ecactly at the time the error occurred
        this.faultyObject = faultyObject;
       
        if (typeof faultyObject === 'function') {
            //slow, but works for now
            this.faultyObject = eval('(' + faultyObject.toString() + ')');
        }
        else if (typeof faultyObject === 'object') {
            for (var key in faultyObject) {
                if (faultyObject.hasOwnProperty(key)) {
                    this.faultyObject[key] = faultyObject[key];
                }
            }
        }
        console.log(this.faultyObject);        
    }
    else {
        this.faultyObject = null;
    }
    
    this.time = Date.now();
}


SwevaError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: this.constructor,
        writable: true,
        configurable: true
    }
});

SwevaError.prototype.getTime = function () {
    return new Date().toLocaleTimeString();
}

SwevaError.prototype.toString = function () {
    var faultyObject = '';
    if(typeof this.faultyObject === 'object') {
        faultyObject= JSON.stringify(this.faultyObject, null, 4);
    } 
    else {
        faultyObject = this.faultyObject.toString();
    }
    
    return '[' + this.getTime() + '] ' + this.name + ' in ' + this.context + ' : ' + this.message + '\n'
        + faultyObject;
}
module.exports = SwevaError;