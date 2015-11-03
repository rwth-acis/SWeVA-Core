(function () {
    return {
        type: 'module',
        name: 'localInvert',
        compute: function (data, input) {
            return -data;
        },
        dataInNames: ['data'],
        dataOutNames: ['result'],
        inputNames: []
    }
})();