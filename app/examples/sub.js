(function () {
    return {
        type: 'module',
        name: 'sub',
        request: function (data, input) {
            var request = sweva.axios.get('http://localhost:8080/example/calc/sub/'
                + data.sub1 + '/' + data.sub2,
                {
                    params: {
                        modifier1: input.offset,
                        modifier2: input.invert
                    }
                });
            return request;
        },
        dataInNames: ['sub1', 'sub1'],
        dataOutNames: ['result'],
        inputNames: ['offset', 'invert']
    }
})();