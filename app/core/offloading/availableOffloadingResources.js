

//USER input orList (offloading Resources Limits) = [cpu%, mem%, battery%, isCharging (binary)]

async function availableOffloadingResources(orList) {
    if (orList[0] === 0 || orList[1] === 0 || orList[2] === 0) {
        return NaN;
    }

    let cpuLoad = 0;
    let memUsage = 0;
    let batteryPercent = 0;
    let batteryIsCharging = false;

    let listOfMetrics =[];
    if (typeof window !== 'undefined') {

        //Browser environment
        memUsage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        let battery = await navigator.getBattery();
        batteryPercent = battery.level * 100;
        batteryIsCharging = battery.charging;
        console.log('cpu = ',cpuLoad, 'memUsage = ',memUsage,'battery = ',batteryPercent, 'isCharging = ',batteryIsCharging);

    }else{
        //NodeJS environment
        let si = require('systeminformation');

        await Promise.all ([
            si.currentLoad(),
            si.mem(),
            si.battery()
        ]).then(([cpu, mem, battery]) => {
            let memRSS = process.memoryUsage();
            memUsage =  (memRSS.rss / mem.available) * 100;
            cpuLoad = cpu.avgLoad;
            batteryPercent = battery.percent;
            batteryIsCharging = battery.acConnected;
            console.log('cpu = ',cpuLoad, 'memUsage = ',memUsage,'battery = ',batteryPercent, 'isCharging = ',batteryIsCharging);
        }).catch((err) => {
            console.log('Error occurred extracting metrics in the NodeJS environment. ERROR = ' + err);
        });
    }

    if ( cpuLoad < orList[0] && //current cpu load is less than user input
        memUsage < orList[1] && // current free memory is bigger than user input
        orList[2] < batteryPercent && // current battery is bigger than user input
        batteryIsCharging === orList[3]
    )
    {  //Output metrics in percent %
        listOfMetrics.push(cpuLoad,(100-memUsage),batteryPercent,batteryIsCharging);
        return listOfMetrics;
    }else{
        return NaN
    }

}
module.exports = availableOffloadingResources

// TEST function for Node.js environment
setInterval(() =>{
const startTime = process.hrtime();
availableOffloadingResources([0,10,10,true]).then((result) => {
    const endTime = process.hrtime(startTime);
    console.log(result);
    console.log('Elapsed time: '+(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)+ ' ms');

});},3000);


