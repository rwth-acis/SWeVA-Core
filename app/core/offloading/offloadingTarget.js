
// orList = [cpu%, mem%, battery%, isCharging (binary)]

function decisionValueOfPOT(offloadingResourcesList){
    let advantageCPU = 100-offloadingResourcesList[0]; //Node.js env. only

    let advantageMem = offloadingResourcesList[1]; // free memory in %

    //battery is charging= MAX advantage !
    let advantageBattery = 0;
    //battery is not charging
    if (!offloadingResourcesList[3]){
        advantageBattery = 100-offloadingResourcesList[2];
    }
    //return advantageCPU + advantageMem - advantageBattery;
    return advantageCPU + advantageMem - advantageBattery;
}


//We qualify by "best" the peer with highest current computation and battery

//input iDandORpairs= { id : [ or list ] }
function offloadingTarget (iDandORpairs){
    let bestPOTId=null;
    let temp = 0;
    for ( let key in iDandORpairs ){

        let dpot = decisionValueOfPOT(iDandORpairs[key]);
        console.log('PEER = '+key+' DPOD = '+dpot);
        if ( dpot>temp){
            temp=dpot;
            bestPOTId=key;
        }
    }
    return bestPOTId;
}
module.exports = offloadingTarget

/*
//for testing purposes (Node.js env.)
let pairs = {
    'id1' : [100,15,40,false],
    'id2' : [100,70,5,false],
    'id3' : [100,50,30,true]
}
offloadingTarget(pairs);
*/