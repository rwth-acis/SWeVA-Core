/**
 * Performs a long-running process that takes a lot of CPU time.
 * @param {number} maxCount The maximum number to count up to.
 * @param {AbortSignal} signal An optional AbortSignal to allow the process to be aborted.
 * @returns {Promise} A promise that resolves when the process is complete.
 */
function longRunningProcess(maxCount, signal) {
    return new Promise((resolve, reject) => {
        doStuf();
        let count = 0;
        const interval = setInterval(() => {
            if (signal && signal.aborted) {
                clearInterval(interval);
                reject(new Error('Process aborted'));
            } else if (count === maxCount) {
                clearInterval(interval);
                resolve();
            } else {
                count++;
                console.log(`Count: ${count}`);
            }
        }, 1000);
    });
}

// Example usage with abort signal
const controller = new AbortController();
const signal = controller.signal;

// Start the long-running process
longRunningProcess(1000000, signal)
    .then(() => {
        console.log('Process complete');
    })
    .catch((err) => {
        console.log('stop');

        //console.error(err);

    });

// Abort the process after 5 seconds

function doStuf (){
    setTimeout(() => {
        controller.abort();

    }, 5000);
    console.log('HELLO');
}
