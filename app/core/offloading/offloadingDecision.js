

//Question: should i declare si outside or in the function?

// output format DMI = [cpu %,mem %,battery %]
const si = require('systeminformation');
async function deviceMonitoringIndex() {
        let listOfMetrics = [];


        const cpu = await si.currentLoad().catch((err) => {
            console.log('Error getting memory');
            console.error(err);
            reject();
        });

        const mem = await si.mem().catch((err) => {
            console.log('Error getting memory');
            console.error(err);
            reject();
        });

        const memRSS = process.memoryUsage();

        //Optional: const storage = await si.fsSize();
        const battery = await si.battery().catch((err) => {
            console.log('Error getting memory');
            console.error(err);
            reject();
        });
        listOfMetrics.push(cpu.avgLoad.toFixed(2), ((memRSS.rss/mem.available)*100).toFixed(2),battery.percent);
        //Optional: const status = battery.ischarging
        return listOfMetrics;

    //todo: error handling
    }

//while false continue executing pipeline
// if od = TRUE, aboard execution of promise and offload

//input offloadingDecisionList = [cpu %, mem %, battery %]

async function offloadingDecision2(odList) {
    if (odList[0] === 0 || odList[1] === 0 || odList[2] === 0) {
        return true
    } // case 1
    let dmiList = await deviceMonitoringIndex();
        console.log(dmiList);
        return (dmiList[0] < odList[0] ||
            dmiList[1] < odList[1] ||
            dmiList[2] < odList[2]); //case 2



}


// Optimized DMI function:
async function offloadingDecision(odList) {
    if (odList[0] === 0 || odList[1] === 0 || odList[2] === 0) {
        return true;
    }

    // OPTIMIZATION : Check if results are already cached
    /*const cacheKey = JSON.stringify(odList);
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }*/

    // Execute all async calls in parallel
    const [cpu, mem, battery] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.battery()
    ]).catch((err) => {
        console.log('Error occurred while monitoring device with package systeminformation: ' + err);
    });
    let memUsage;
    try{
        //nodeJS environment
        const memRSS = process.memoryUsage();
        memUsage = ((memRSS.rss / mem.available) * 100);
    }catch (e){
        //browser environment
        memUsage = (performance.memory.used / performance.memory.total) * 100;
    }
    // Calculate metrics
    const cpuLoad = cpu.avgLoad;
    const batteryPercent = battery.percent;

    // Store results in cache
    const offloading = cpuLoad < odList[0] || memUsage < odList[1] || batteryPercent < odList[2];
    //cache[cacheKey] = offloading;

    return offloading;
}

//for testing purposes

// USER Input odList = [Limit_cpu %, Limit_mem %, Limit_battery %]
/*
//let time =0;
let i=0;
let odList =[10,10,10];
let startTime = null;
let endTime =null;
let avgList=[] ;

startTime = process.hrtime();
offloadingDecision(odList).then((result) => {
    endTime = process.hrtime(startTime);
    console.log('### init')
    console.log(result);
    console.log('Elapsed time: '+(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)+ ' ms');
    avgList.push((endTime[0] * 1000 + endTime[1] / 1000000));
});
setInterval(()=>{
    startTime = process.hrtime();
    offloadingDecision(odList).then((result) => {
        endTime = process.hrtime(startTime);

        console.log('### '+i);
        i++;
        console.log(result);
        console.log('Elapsed time: '+(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)+ ' ms');
        avgList.push((endTime[0] * 1000 + endTime[1] / 1000000));
    });

},1500);
setInterval(()=>{
    let temp = 0;
    const l = avgList.length;
    //calculate average of avgList
    for (let j = 0; j < l; j++) {
        temp += avgList[j];
    }

    console.log('AVG value = ',temp/l);
},5000)
*/


module.exports = offloadingDecision