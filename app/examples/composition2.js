﻿'use strict';

var composition2 = new sweva.Composition(

    {
        name: 'composition2',
        modules: {
            'composition1': composition1,
            'sub5': subModule,
            'add5': addModule
        },
        links: {
            'composition1': [
                {
                    to: 'add5'
                }
            ],
            'sub5': [
                {
                    to: 'add5',
                    parameter:1
                }
            ]


        },
        dataBlocksIn: 2,
        dataBlocksOut: 1,
        inputBlocks: 0
    }

    );
var now = Date.now();

composition2.execute([
    [
        [10, 50],
        [15, 5],
        [20, 10]
    ],
    [10, 5]
], [
    [
        [0, false],
        [0, false],
        [0, false],
        [0, false],
        [0, false],
        []
    ],
    [0, false],
    [0, false]

]).then(function (output) {
    console.log('time ' + (Date.now() - now) + 'ms');
    console.log(output);
});