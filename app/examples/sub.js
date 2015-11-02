'use strict';

var subModule = new sweva.Module(
    {
        name: 'sub',
        request: function (dataArray, inputArray) {
            var request = sweva.axios.get('http://localhost:8080/example/calc/sub/'
                + dataArray[0] + '/' + dataArray[1],
                {
                    params: {
                        modifier1: inputArray[0],
                        modifier2: inputArray[1]
                    }
                });
            return request;
        },
        dataBlocksIn: 2,
        inputBlocks: 2
    });