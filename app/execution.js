'use strict';


var now = Date.now();
var manager = new sweva.ExecutionManager();
console.log("starting...")
manager.setup(
  {"type":"composition",
    "name":"composition1",
    "dataInNames":[],
    "dataInSchema":{},
    "dataOutNames":["result"],
    "dataOutSchema":{},
    "inputNames":[],
    "inputSchema":{},
    "mapDataIn":[
      "function (data, composableName, composables, libs) {"
      ,"if (data.hasOwnProperty(composableName)) {"
      ,"return libs.get(data, composableName);","}","return null;","}"],"mapDataOut":["function (output, libs) {","return output;","}"],"mapInput":["function (input, moduleName, modules, libs) {","if (input.hasOwnProperty(moduleName)) {","return libs.get(input, moduleName);","}","return null;","}"],"composables":{"Node40":{"type":"module","name":"code_frequency","description":"A simple module template.","dataInNames":[],"dataInSchema":{},"dataOutNames":["code_frequency"],"dataOutSchema":{},"inputNames":["repository"],"inputSchema":{},"request":[
        "function (data, input, libs) {","","var repo = 'LAS2peer';",
    "","if(input.repository){","repo = input.repository;","}","",
  "  var client =  libs.mqttclient();","",
    "return libs.mqttsubscribe(client)","",
// "return libs.axios.get('https://api.github.com/repos/rwth-acis/'+repo+'/stats/code_frequency');","",
    // "client = new libs.mqtt.Client(\"broker.mqttdashboard.com\", Number(8000), \"myclientid_\" + parseInt(Math.random() * 100, 10));","",
 //   "// set callback handlers","libs.mqtt.onConnectionLost = onConnectionLost;","libs.mqtt.onMessageArrived = onMessageArrived;","","// connect the client",
  //   "libs.mqtt.connect({onSuccess:onConnect});","",
 //    "// called when the client connects","function onConnect() {","// Once a connection has been made, make a subscription and send a message.","console.log(\"Connected to MQTT via Websockets\");","libs.mqtt.subscribe(\"sweva/test\", {qos: 0});","}","","console.log(repo)","","// called when the client loses its connection","function onConnectionLost(responseObject) {","if (responseObject.errorCode !== 0) {","console.log(responseObject);","}","}","","var message = \"TEST Failed\"","// called when a message arrives","function onMessageArrived(message) {","message = \"Message Arrived:\"+message.payloadString;","}","return message;",
    "}    "],"response":["function (response, input, libs) {","return { code_frequency:response }","}"]}},"links":{},"controls":[{"label":"Section1","controls":[]}],"visualization":"sweva-visualization-raw/dist/sweva-visualization-raw.min.html"}
);
manager.onProgress(function (progress) {
    //console.log(progress);
});


manager.execute({
    
},
{
    "Filter1": {
        "minRating": 1
    }
})
.then(function (result) {
    console.log('time ' + (Date.now() - now) + 'ms');
    console.log(result);
    
});

