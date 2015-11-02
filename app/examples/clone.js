'use strict';

var cloneModule = new sweva.Module(
     {
         name: 'clone',
         request: function (dataArray, inputArray) {
             var request = sweva.axios.get('http://localhost:8080/example/calc/add/'
                 + dataArray[0] + '/' + dataArray[1]);
             return request;
         },
         response: function (response, inputArray) {
             return [response.data, response.data];
         },
         dataBlocksIn:2,
         dataBlocksOut:2

     });


