//TODO
let  peer = new Peer(
    {
        host: "localhost",
        port: 9000,
        path: "/myapp",
    });

peer.listAllPeers((peerIds) => {
    peerIds
        .filter((peerId) => peerId !== peer.id) // Filter out your own peer ID
        .forEach((peerId) => {
           peer.connect(peerId)
        });
});

