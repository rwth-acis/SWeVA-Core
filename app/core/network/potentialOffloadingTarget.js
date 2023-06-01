
const availableOffloadingResources = require("../offloading/offloadingResources.js");

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

function potentialOffloadingTarget() {
    let peer = createPeer('', () => {
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

            //TODO: get input from execution manager GET frontend.
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

//TODO: process pipeline in exe
async function processPipeline(receivedPipeline){
    //TODO: extract intermediate result from pipeline with a new key in the object
    //input = receivedPipeline.
    let manager = new sweva.ExecutionManager();
    manager.setup(receivedPipeline);
    return await manager.execute(input,{});
}

module.exports = potentialOffloadingTarget