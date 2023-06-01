
// TODO: Must create a global variable ROLE that changes to source if offloading is needed


//const Peer = require('peerjs'); //comment this line when testing on the web
// Role distribution network

//pipeline is created using const mergedObj = Object.assign({}, obj1, obj2);
function setOffloadingRole (role, pipeline) { //must be 'source' for offloading source or 'peer' for offloading destination

    if (role === 'source') {
        return dataProcessingDevice('source',pipeline); //returns pipeline result
    } else {
        potentialOffloadingTarget(); //returns either null or Pipeline

    }
}

function createPeer(id, callback = () => {
}) {
    let peer = new Peer(id, {
        host: "localhost",
        port: 9000,
        path: "/myapp",
    });
    peer.on('open', function (ID) {
        console.log('My peer ID is: ' + ID);
        callback();
    });
    peer.on("error", function (err) {
        console.log("Error: " + err);
    });
    peer.on('disconnected', function (ID) {
        console.log('peer ID ' + ID+' disconnected');
        callback();
    });

    return peer;
}

function dataProcessingDevice(id,pipeline) {
    let idAndDMIpairs = {};
    let connections = {};
    let allReceived = false;
    let peer = createPeer('id', () => {

        peer.on('connection', (connection) => {
            connections[connection.peer]=false;
            console.log('connected to peer : '+connection.peer);
            console.log(connections);
            connection.on('data', (data) => {

                //TODO: DMI format probe
                if (Array.isArray(data) &&
                    data.length > 0 &&
                    data[data.length-1]==='dmi')
                {
                    console.log('received DMI from: ',connection.peer);
                    console.log(data);
                    //delete the flag
                    connections[connection.peer]=true;
                    console.log(connections);
                    idAndDMIpairs[connection.peer]= data;

                    allReceived= Object.values(connections).every(value => value === true);
                    console.log(allReceived);

                    if (allReceived){
                        //connection.close();
                        //doStuff(); //TODO: change to callback
                        return processMsgs();
                    }


                }else{
                    console.log("Error encountered while receiving the dmi");
                    //TODO: error handling
                }


            });
        });
        function processMsgs () {
            console.log('entered processMsgs functions');
            let potId = chooseBestPOT(idAndDMIpairs); //TODO: change processList to chooseBestPOT
            console.log('chosen potID for offloading: ' + potId);

            const conn = peer.connect(potId);
                conn.on('open', () => {
                    console.log('connection opened');
                    conn.send(pipeline); //send pipeline here
                });
                conn.on('data', (data) => {
                        console.log('Pipeline result: '+data); //receive pipeline results here
                        //peer.destroy();
                        return data;
                        //c.send('good day!');
                        //TODO: disconnect/destroy peer after receiving pipeline results
                });


        }
    });

}

/*function processList(list){
    //careful with async returns
    let i = 0;
    setTimeout(() => {
        list.forEach((item)=>{
            i++;
            console.log('list '+i+' item: '+item);
        });

    }, 5000);
    return list[0];
    }
*/
function potentialOffloadingTarget() {
    let peer = this.createPeer('', () => {
        peer.on('connection', (co)=>{
            // Peer is chosen !
            co.on('data', (data)=>{
                // Process Pipeline and send result
                console.log(data);
                //TODO: is there a way to check if received date is really a pipeline ? yes
                //TODO: user input ?

                    // setup and process the pipeline
                    processPipeline().then((result)=>{
                        //send pipeline result
                        co.send(result);
                    }).catch(error => {
                        console.error(error);
                    });
            });
        });

        const connection = peer.connect('source');
        connection.on('open', () => {
            console.log('connected to peer: '+connection.peer);


            //input offloading resources limits MUST be global value from user input (frontend)
            availableOffloadingResources(orList).then(result => {
                if(!isNaN(result)){
                //push string 'dmi' as last entry in the array
                result.push('dmi');
                console.log(result);
                //send dmi as array
                connection.send(result);}
                else{
                    //Todo : close connection
                }
            }).catch(error => {
                console.error(error);
            });
        });
    });
}

async function processPipeline(receivedPipeline){
    let input = receivedPipeline.input;
    let pipeline = receivedPipeline.pipeline;

    let manager = new sweva.ExecutionManager();
    manager.setup(pipeline);
    return await manager.execute(input,{});
}

module.exports =setOffloadingRole

/*async function calculateDMI() {

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('DMI');
        }, 5000); // 5000 milliseconds = 5 seconds
    });
}*/
///// OLD /////
/*

let  peer = new Peer(

    {
        host: "localhost",
        port: 9000,
        path: "/myapp",
    });

let callbackConnection = null;



//Connect peer to the PeerJS Signaling server
peer.on("open", function (id) {
    console.log('Connection established with PeerServer on port 9000')
    console.log("My Peer ID: " + id);
});
peer.on("error", function (err) {
    console.log("Error: " + err);
});

// Connection with another peer
peer.on('connection', function(conn) {
    console.log('Connection established with peer ID: ' + conn.peer);

    //when a data message is received from the other peer, log it
    conn.on('data', function(data) {
        //sync callback
        //callBack(conn.peer,data);



        console.log('Received data from peer ID: ' + conn.peer + ': ' + data);

    });

    //Connection lost with peer
    conn.on('close', function(id){
            console.log("connection lost with peer ID: " + id);
        }
    );});

function tfouh (callbackConnection) {
    callbackConnection.send('tfouh');
}
function callBack(sender,data){
    console.log("CALLBACK from peer ID " + sender + ": " + data);
    processCall().then(result => {
        console.log(result);
        console.log('Finished.');
    callbackConnection = peer.connect(sender);

    }).catch(error => {
        console.error(error);
    });
}



//get an actual list of connected peers
function listOfActivePeers() {
    let connectedPeers = [];
    peer.listAllPeers((peerIds) => {
        peerIds
            .filter((peerId) => peerId !== peer.id) // Filter out your own peer ID
            .forEach((peerId) => {
                connectedPeers.push(peerId);
            });
    });
    return connectedPeers;
}

function broadcastData(data) {
    let listofPeers= [];
    peer.listAllPeers((peerIds) => {
        const targetPeerIds = peerIds.filter((peerId) => peerId !== peer.id);
        targetPeerIds.map((peerId) => {
            const conn = peer.connect(peerId);
            listofPeers.push(conn.peer);
            //console.log('Connection established with peer ID: ' + peerId);
            conn.on('open', () => {
                // The connection is now open, so we can send the data
                conn.send(data);
                console.log(`Data '${data}' sent to peer ${peerId}`);
            });
            conn.on('error', (err) => {
                console.error(`Error connecting to ${peerId}: ${err}`);
            })
        });
    });
    return listofPeers;
}

function sendData (peerId,data) {

    const conn = peer.connect(peerId);
    console.log('Connection established with peer ID: ' + peerId);
    // Handle connection errors
    conn.on('error', (err) => {
        console.error(`Error connecting to ${peerId}: ${err}`);
    });
    conn.send(data);
    console.log('Data '+data+' sent to: ' + peerId);
}

function callCenter(peerId, msg) {
    let conn = peer.connect(peerId);
    conn.send('response from call center');

}
//console.log('Call Center activated for ' + peerId + ' with message: ' + msg);

 */


/// TEST ZONE
/*function sendAndListenForAnswer(peerId, message, callback) {
    // Create a new connection to the peer
    const conn = peer.connect(peerId);

    // Handle errors that occur while connecting
    conn.on('error', (error) => {
        console.error(error);
        //callback(error, null);
    });

    // Wait for the connection to open
    conn.on('open', () => {
        // Send the message
        conn.send(message);

        // Listen for the response
        conn.on('data', (response) => {
            // Call the callback with the response
            //callback(null, response);

            // Close the connection
           // conn.close();
        });
    });
}


// Connect to the PeerJS server
peer.on('open', () => {
    console.log(`Connected with ID ${peer.id}`);

    // Send a message to a peer and listen for the response

});

peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
});
peer.on('error', (error) => {
    console.error(error);
});

// Handle incoming data connection
peer.on('connection', (conn) => {
    console.log('incoming peer connection!');
    conn.on('data', (data) => {
        console.log(`received: ${data}`);
    });
    conn.on('open', () => {
        conn.send('hello!');
    });
});
// Initiate outgoing connection
let connectToPeer = () => {
    let peerId = 'dev2';
    console.log(`Connecting to ${peerId}...`);

    let conn = peer.connect(peerId);
    conn.on('data', (data) => {console.log(`received: ${data}`);
    });
    conn.on('open', () => {
        conn.send('hi!');
    });

};*/

//window.connectToPeer = connectToPeer;

