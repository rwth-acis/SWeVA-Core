const { parentPort } = require('worker_threads');

// A long-running process
function longRunningProcess() {
    let i = 0;
    while (true) {
        i++;
        if (i % 100000000 === 0) {
            console.log(`Iteration ${i}`);
        }
    }
}

// Listen for messages from the parent process
parentPort.on('message', (message) => {
    if (message === 'start') {
        longRunningProcess();
    } else if (message === 'abort') {
        console.log('Aborting worker...');
        parentPort.postMessage('aborted');
        process.exit(1);
    }
});

