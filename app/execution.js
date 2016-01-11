'use strict';


var now = Date.now();
var manager = new sweva.ExecutionManager();
manager.setup('composition3');
manager.onProgress(function (progress) {
    //console.log(progress);
});


manager.execute({
    adder1: {
        sum1: 10,
        sum2: 50
    },
    adder2: {
        sum1: 5,
        sum2: 15
    },
    clone1: {
        sum1: 20,
        sum2: 10
    }
},
    {
        offset: 0,
        invert: 0
    })
.then(function (result) {
    console.log('time ' + (Date.now() - now) + 'ms');
    console.log(result);
    
});

