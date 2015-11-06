'use strict';

function ErrorManager() {
    this.queue = [];
}
ErrorManager.prototype.clear = function () {
    this.queue = [];
}
ErrorManager.prototype.error = function (error) {
    this.queue.push(error);
    console.log(error.toString());
    console.log(error);
    return error;
}

ErrorManager.prototype.getLog = function () {
    var result = '';
    for (var i = 0; i < this.queue.length; i++) {
        result += this.queue[i].toString() + '\n';
    }
    return result;
}

ErrorManager.prototype.getLastError = function () {
    if (this.queue.length > 0) {
        return this.queue[this.queue.length - 1];
    }
    return null;
}

module.exports = ErrorManager;