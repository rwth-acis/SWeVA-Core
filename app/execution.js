'use strict';


var now = Date.now();
var manager = new sweva.ExecutionManager();
console.log("starting...")
manager.setup(
  {"type":"composition","name":"composition1","dataInNames":[],"dataInSchema":{},"dataOutNames":["result"],"dataOutSchema":{},"inputNames":[],"inputSchema":{},"mapDataIn":["function (data, composableName, composables, libs) {","if (data.hasOwnProperty(composableName)) {","return libs.get(data, composableName);","}","return null;","}"],"mapDataOut":["function (output, libs) {","return output;","}"],"mapInput":["function (input, moduleName, modules, libs) {","if (input.hasOwnProperty(moduleName)) {","return libs.get(input, moduleName);","}","return null;","}"],
    "composables":{"Node266":{
      "type":"module",
      "name":"Name",
      "description":"A simple module template.",
      "dataInNames":[],"dataInSchema":{},
      "dataOutNames":["code_frequency"],
      "dataOutSchema":{},"inputNames":["repository"],
      "inputSchema":{},"request":[
        "function (data, input, libs) {","","var repo = 'LAS2peer';",
       // "client = libs.mqtt.connect('broker.mqttdashboard.com')",
        "client.subscribe('presence')","client.publish('presence', 'Hello mqtt')"
        ,"console.log(repo)",
        "return libs.axios.get('https://api.github.com/repos/rwth-acis/'+repo+'/stats/code_frequency');"
        ,"}    "],
      "response":["function (response, input, libs) {"
        ,"return { code_frequency:response.data }","}"]}},"links":{},"controls":[{"label":"Section1","controls":[]}],"visualization":"sweva-visualization-raw/dist/sweva-visualization-raw.min.html"}
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

