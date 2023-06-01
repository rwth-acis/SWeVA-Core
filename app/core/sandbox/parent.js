
//Parent.js
const { Worker } = require('worker_threads');

// Create a new worker
const worker = new Worker('./worker.js');

// Set a timeout to abort the worker after 5 seconds
const timeout = setTimeout(() => {
    console.log('Aborting worker...');
    worker.postMessage('abort');
}, 5000);

// Listen for messages from the worker
worker.on('message', (message) => {
    console.log(`Worker message: ${message}`);
    if (message === 'aborted') {
        clearTimeout(timeout);
        console.log('Worker aborted.');
    }
});

// Start the worker
worker.postMessage('start');
