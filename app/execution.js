'use strict';

/*
var now = Date.now();

composition1.execute({
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
});*/
var now = Date.now();
var test = {};
sweva.ComposableLoader.load('composition1', test, 'testcomposition').then(function (composable) {

    setTimeout(function () {

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

    }, 3000);


   

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
});