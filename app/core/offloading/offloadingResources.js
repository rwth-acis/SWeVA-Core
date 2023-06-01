

//input orl: offloading Resources Limits = [ORcpu % ,ORmem % ,ORbattery %, isCharging (binary)]

const si = require("systeminformation");

async function availableOffloadingResources(orList) {
    if (orList[0] === 0 || orList[1] === 0 || orList[2] === 0) {
        return NaN;
    }
    let listOfMetrics =[];


    const [cpu, mem, battery] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.battery()
    ]).catch((err) => {
        console.log('Error occurred while monitoring device with package systeminformation: ' + err);
    });

    const cpuLoad = cpu.avgLoad;

    const freeMem =  (1-(mem.available/mem.total))*100; //free memory in percent
    const batteryUsage = battery.percent; // battery usage in percent
    const batteryIsCharging = battery.acConnected; //battery is charging when TRUE

    if ( cpuLoad < orList[0] || //current cpu load is less than user input
        freeMem >=orList[1] || // current free memory is bigger than user input
        batteryUsage >= orList[2] || // current battery is bigger than user input
        batteryIsCharging === orList[3]
    )
    {
        //Output metrics in percent %
        listOfMetrics.push(cpuLoad,freeMem,batteryUsage,batteryIsCharging);
        return(listOfMetrics);
    }else{
        return NaN
    }


}

//for testing purposes

// USAGE example: input is odList

/*

const startTime = process.hrtime;
availableOffloadingResources([10,10,10,true]).then((result) => {
    const endTime = process.hrtime(startTime);
    console.log(result);
    console.log('Elapsed time: '+(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)+ ' ms');

});

*/
module.exports = availableOffloadingResources