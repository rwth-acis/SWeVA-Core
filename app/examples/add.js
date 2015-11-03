(function () {
  return {
    type: 'module',
    name: 'add',
    request: function (data, input) {
      var request = sweva.axios.get('http://localhost:8080/example/calc/add/'
          + data.sum1 + '/' + data.sum2,
          {
            params: {
              modifier1: input.offset,
              modifier2: input.invert
            }
          });
      return request;
    },
    dataInNames: ['sum1', 'sum2'],
    dataOutNames: ['result'],
    inputNames: ['offset', 'invert']
  }
})();