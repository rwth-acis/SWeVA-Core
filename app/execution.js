'use strict';
var now = Date.now();
var manager = new sweva.ExecutionManager();
manager.setup('composition1');

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
/*
var now = Date.now();
var test = {};
sweva.ComposableLoader.load('composition1').then(function (composable) {
    composable.execute({
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
    }
    ).then(function (output) {
        console.log('time ' + (Date.now() - now) + 'ms');
        console.log(output);
    });
});
/*
sweva.ComposableLoader.load('composition2', test, 'testcomposition').then(function (composable) {

    var arr = Object.keys(sweva.ComposableLoader.composables);
    console.log(arr);
    
        composable.execute({
            composition1: {
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
            sub5: {
                sub1: 10,
                sub2: 5
            }
        },
        {
            offset: 0,
            invert: 0
        }
    ).then(function (output) {
        console.log('time ' + (Date.now() - now) + 'ms');
        console.log(output);
    });
    
});*/

    /* composable.execute({
         sum1: 15,
         sum2: 3
     }, {
         offset: 0,
         invert: false
     }).then(function (output) {
         console.log('time ' + (Date.now() - now) + 'ms');
         console.log(output);
     })*/