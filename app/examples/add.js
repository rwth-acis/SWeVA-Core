'use strict';

var addModule = new sweva.Module(
    {
        name: 'add',
        request: function (dataArray, inputArray) {
            var request = sweva.axios.get('http://localhost:8080/example/calc/add/'
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

