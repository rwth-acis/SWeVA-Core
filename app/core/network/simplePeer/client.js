// Connect to server
const socket = io('http://localhost:8888');

// Listen for connection events
socket.on('connect', () => {
    console.log('Connected to server!');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server!');
})

const peer = new SimplePeer({
    initiator: location.hash === '#initiator',
    trickle: false,
});

peer.on('signal', (data) => {
    socket.emit('signal', data);
});

socket.on('signal', (data) => {
    peer.signal(data);
});

peer.on('connect', () => {
    console.log('Peer connection established');
});

peer.on('data', (data) => {
    console.log(`Received data: ${data}`);
    handleMessage(data.toString());
});

function handleMessage(message) {
    console.log(`Received message: ${message}`);
    if (message === 'start') {
        console.log('Starting dialog...');
        startDialog();
    } else if (message === 'end') {
        console.log('Ending dialog...');
        endDialog();
    } else {
        console.log('Unknown message');
    }
}

function startDialog() {
    // Start the dialog
}

function endDialog() {
    // End the dialog
}

// Send a message to start the dialog
peer.send('start');