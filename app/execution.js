'use strict';


var now = Date.now();
var manager = new sweva.ExecutionManager();
manager.setup('composition3');
manager.onProgress(function (progress) {
    //console.log(progress);
});


manager.execute({
    
},
    {
        "Provider": {},
        "RangeFilter": {},
       
        "view": {
            "lines": true
        }
        
    })
.then(function (result) {
    console.log('time ' + (Date.now() - now) + 'ms');
    console.log(result);
    
});

