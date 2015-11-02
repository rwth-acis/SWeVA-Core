'use strict';

var composition1 = new sweva.Composition(

    {
        name: 'composition1',
        modules: {
            'add1': addModule,
            'add2': addModule,
            'add3': addModule,
            'sub1': subModule,
            'sub2': subModule,
            'clone1': cloneModule
        },
        links: {
            'add1': [
                {
                    to: 'sub1'
                }
            ],
            'clone1': [
                {
                    to: 'sub1',
                    parameter: 1
                },
                {
                    to: 'sub2'
                }
            ],
            'add2': [
                {
                    to: 'sub2',
                    parameter: 1
                }
            ],
            'sub1': [
                {
                    to: 'add3'
                }
            ],
            'sub2': [
                {
                    to: 'add3',
                    parameter: 1
                }
            ]
        }
    }
    
    );



/*s
var now = Date.now();

composition1.execute([
    [10, 50],
    [15, 5],
    [20, 10]
], [
    [0, false],
    [0, false],
    [0, true],
    [0, false],
    [0, false],
    []
]).then(function (output) {
    
    console.log('time ' + (Date.now() - now) + 'ms');
    console.log(output);
});*/