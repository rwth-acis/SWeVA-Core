let peer = null;
let peerId = null;
let conn = null;

let broadcastPeers = [];
let lastConnectedPeer = null;

initialiseConnection();
peer.on('connection', function(conn) {
    console.log('Connection established with peer ID: ' + conn.peer);

    //when a data message is received from the other peer, log it
    conn.on('data', function(data) {
        console.log('Received data from peer ID ' + conn.peer + ': ' + data);

    });

    conn.on('close', function(id){
            console.log("connection closed with ID " + id);
        }
    );});


function initialiseConnection(){
    peer = new Peer(
        {
            host: "localhost",
            port: 9000,
            path: "/myapp",
        });
    peer.on("open", function (id) {
        peerId =id;
        console.log("Peer ID: " + id);
    });
    peer.on("error", function (err) {
        console.log("Error: " + err);
    });
}

function askPeer(destId,data) {


    conn = peer.connect(destId, {
        reliable: true
    });
    peer.on("connection", function (c) {

        console.log('Connection established with peer ID: ' + conn.peer);
        conn.send(data);
        console.log(`Data '${data}' sent to peer ${destId}`);
        callCenter();

    });
}
function callCenter (){
    conn.on('data', function(data) {
        console.log('Received data from peer ID ' + conn.peer + ': ' + data);
        return processCall().then(result => {
            console.log(result);
            console.log('Finished.');

        }).catch(error => {
            console.error(error);
        });

    });
    conn.on('close', function (){
        console.log('Connection closed with peer ID ' + conn.peer);
        peer.on("error", function (err) {
            console.log("Error: " + err);
        });

    })
}
async function processCall() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let r = 'Timer finished after 5 seconds';
            resolve(r);
        }, 5000); // 5000 milliseconds = 5 seconds
    });
}
