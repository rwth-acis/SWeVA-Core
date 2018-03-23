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
        "function (data, input, libs, callback) {","","var repo = 'LAS2peer';",
    "","if(input.repository){","repo = input.repository;","}","",
  //mqtt code
  "  var client =  libs.mqttclient('ws://broker.mqttdashboard.com:8000/mqtt');","",
    "return libs.mqttsubscribe(client, 'sweva', callback, libs);","",

    "}    "],"response":["function (response, input, libs) {","return { code_frequency:response }","}"]


    ,"mqttcallback":[" function (topic, message) {",
      "console.log(message.toString());",
      " //libs.adddata(1, topic, message);"
      ,"}"]


  }},"links":{},"controls":[{"label":"Section1","controls":[]}],"visualization":"sweva-visualization-raw/dist/sweva-visualization-raw.min.html"}
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
  //   result.code_frequency.on('message', function (topic, message) {
  //   // message is Buffer
  //   console.log(message.toString())
  //     result.code_frequency.end()
  // });
    console.log(result);
});

