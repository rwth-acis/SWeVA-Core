const controller = new AbortController();
setTimeout(() => {
    console.log('Abort');
    controller.abort();
}, 600);
async function test () {
    try {
        const result = await somethingAsync({signal: controller.signal});
        console.log(result);
    } catch (e) {
        console.log('ABORT');
    }
}

function somethingAsync({signal}){
    if (signal?.aborted){
        return Promise.reject(
        );
    }
    return new Promise((resolve, reject) => {
        console.log("Promise Started");
        let timeout;
        const abortHandler = () => {
            clearTimeout(timeout);
            reject();
        }
        // start async operation
        timeout = setTimeout(() => {
            resolve("Promise Resolved");
            signal?.removeEventListener("abort", abortHandler);
        }, 500);
        signal?.addEventListener("abort", abortHandler);
    });
}
test()