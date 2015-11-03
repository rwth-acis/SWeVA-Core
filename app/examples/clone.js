(function () {
    return {
        type: 'module',
        name: 'clone',
        request: function (data, input) {
            var request = sweva.axios.get('http://localhost:8080/example/calc/add/'
                + data.sum1 + '/' + data.sum2);
            return request;
        },
        response: function (response, input) {
            return {
                first: response.data,
                second: response.data
            };
        },
        dataInNames: ['sum1', 'sum2'],
        dataOutNames: ['first', 'second'],
        inputNames: []
    }
})();