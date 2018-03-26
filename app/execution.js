﻿'use strict';

var simpleHTTPRequest = {
  "type": "composition",
  "name": "composition1",
  "dataInNames": [],
  "dataInSchema": {},
  "dataOutNames": [
    "result"
  ],
  "dataOutSchema": {},
  "inputNames": [],
  "inputSchema": {},
  "mapDataIn": [
    "function (data, composableName, composables, libs) {",
    "if (data.hasOwnProperty(composableName)) {",
    "return libs.get(data, composableName);",
    "}",
    "return null;",
    "}    "
  ],
  "mapDataOut": [
    "function (output, libs) {",
    "return output;",
    "}    "
  ],
  "mapInput": [
    "function (input, moduleName, modules, libs) {",
    "if (input.hasOwnProperty(moduleName)) {",
    "return libs.get(input, moduleName);",
    "}",
    "return null;",
    "}"
  ],
  "composables": {
    "Node121": {
      "type": "module",
      "name": "code_frequency",
      "description": "A simple module template.",
      "dataInNames": [],
      "dataInSchema": {},
      "dataOutNames": [
        "code_frequency"
      ],
      "dataOutSchema": {},
      "inputNames": [],
      "inputSchema": {},
      "request": [
        "function (data, input, libs) {",
        "return libs.axios.get('https://api.github.com/repos/rwth-acis/LAS2peer/stats/code_frequency');",
        "}    "
      ],
      "response": [
        "function (response, input, libs) {",
        "return { code_frequency:response.data }",
        "}"
      ]
    }
  },
  "links": {},
  "controls": [],
  "visualization": "string"
};

var simpleMQTTSubscribe = {
  "type": "composition",
  "name": "composition1",
  "dataInNames": [],
  "dataInSchema": {},
  "dataOutNames": [
    "result"
  ],
  "dataOutSchema": {},
  "inputNames": [],
  "inputSchema": {},
  "mapDataIn": [
    "function (data, composableName, composables, libs) {",
    "if (data.hasOwnProperty(composableName)) {",
    "return libs.get(data, composableName);",
    "}",
    "return null;",
    "}    "
  ],
  "mapDataOut": [
    "function (output, libs) {",
    "return output;",
    "}    "
  ],
  "mapInput": [
    "function (input, moduleName, modules, libs) {",
    "if (input.hasOwnProperty(moduleName)) {",
    "return libs.get(input, moduleName);",
    "}",
    "return null;",
    "}"
  ],
  "composables": {
    "Node121": {
      "type": "module",
      "name": "code_frequency",
      "description": "A simple module template.",
      "dataInNames": [],
      "dataInSchema": {},
      "dataOutNames": [
        "code_frequency"
      ],
      "dataOutSchema": {},
      "inputNames": [],
      "inputSchema": {},
      "subscribe": [
        "function(data, input, libs) {",
        "  return libs.mqtt.connect('ws://broker.mqttdashboard.com:8000/mqtt');",
        "}"
      ],
      "onConnect": [
        "function(client, input, libs) {",
        "  client.subscribe('test');",
        "}"
      ],
      "onSubscription": [
        "function (data, input, libs) {",
        "  return 1;",
        "}"
      ],
      "onMessageReceived": [
        "function(data, topic, message) {",
        "  console.log('data: ' + data + ', message received: ' + message.toString());",
        "  return data + 1;",
        "}"
      ]
    }
  },
  "links": {},
  "controls": [],
  "visualization": "string"
};

/**
 * This composition is about an IMDB movie rating.
 *
 * @type {{type: string, name: string, dataInNames: Array, dataInSchema: {}, dataOutNames: string[], dataOutSchema: {}, inputNames: Array, inputSchema: {}, mapDataIn: string[], mapDataOut: string[], mapInput: string[], composables: {"movie list": {type: string, name: string, description: string, dataInNames: Array, dataInSchema: {}, dataOutNames: string[], dataOutSchema: {type: string, properties: {"movie list": {type: string}}}, inputNames: Array, inputSchema: {}, compute: string[]}, "OMDb Data": {type: string, name: string, description: string, dataInNames: string[], dataInSchema: {type: string, properties: {"movie list": {type: string}}}, dataOutNames: string[], dataOutSchema: {type: string, properties: {movies: {type: string, items: {type: string, properties: {Title: {type: string}, Genre: {type: string}, Director: {type: string}, Actors: {type: string}, imdbRating: {type: string}}}}}}, inputNames: Array, inputSchema: {}, request: string[], response: string[]}, "movie nodes": {type: string, name: string, description: string, dataInNames: string[], dataInSchema: {type: string, properties: {movies: {type: string, items: {type: string, properties: {Title: {type: string}, Genre: {type: string}, Director: {type: string}, Actors: {type: string}, imdbRating: {type: string}}}}}}, dataOutNames: string[], dataOutSchema: {type: string, properties: {nodes: {type: string, items: {type: string, properties: {label: {type: string}, id: {type: string}, color: {type: string}, size: {type: string}, attributes: {type: string}}}}}}, inputNames: Array, inputSchema: {}, compute: string[]}, graph: {type: string, name: string, description: string, dataInNames: string[], dataInSchema: {type: string, properties: {nodes: {type: string, items: {type: string, properties: {label: {type: string}, id: {type: string}, color: {type: string}, size: {type: string}, attributes: {type: string}}}}, edges: {type: string, items: {type: string, properties: {id: {type: string}, target: {type: string}, source: {type: string}, color: {type: string}}}}}}, dataOutNames: string[], dataOutSchema: {}, inputNames: Array, inputSchema: {}, compute: string[]}, Filter1: {type: string, name: string, description: string, dataInNames: string[], dataInSchema: {type: string, properties: {movies: {type: string, items: {type: string, properties: {Title: {type: string}, Genre: {type: string}, Director: {type: string}, Actors: {type: string}, imdbRating: {type: string}}}}}}, dataOutNames: string[], dataOutSchema: {type: string, properties: {movies: {type: string, items: {type: string, properties: {Title: {type: string}, Genre: {type: string}, Director: {type: string}, Actors: {type: string}, imdbRating: {type: string}}}}}}, inputNames: string[], inputSchema: {}, compute: string[]}}, links: {Filter1: {movies: {"movie nodes": string}}, "OMDb Data": {movies: {Filter1: string}}, "movie list": {"movie list": {"OMDb Data": string}}, "movie nodes": {nodes: {graph: string}}}, controls: *[], visualization: string}}
 */
var movieRatingComposition = {
  "type": "composition",
  "name": "composition1",
  "dataInNames": [],
  "dataInSchema": {},
  "dataOutNames": [
    "result"
  ],
  "dataOutSchema": {},
  "inputNames": [],
  "inputSchema": {},
  "mapDataIn": [
    "function (data, composableName, composables, libs) {",
    "if (data.hasOwnProperty(composableName)) {",
    "return libs.get(data, composableName);",
    "}",
    "return null;",
    "}    "
  ],
  "mapDataOut": [
    "function (output, libs) {",
    "return output;",
    "}    "
  ],
  "mapInput": [
    "function (input, moduleName, modules, libs) {",
    "if (input.hasOwnProperty(moduleName)) {",
    "return libs.get(input, moduleName);",
    "}",
    "return null;",
    "}"
  ],
  "composables": {
    "movie list": {
      "type": "module",
      "name": "def_movies",
      "description": "Provides an array of movie titles.",
      "dataInNames": [],
      "dataInSchema": {},
      "dataOutNames": [
        "movie list"
      ],
      "dataOutSchema": {
        "type": "object",
        "properties": {
          "movie list": {
            "type": "array"
          }
        }
      },
      "inputNames": [],
      "inputSchema": {},
      "compute": [
        "function (data, input, libs) {",
        "var movies =",
        "\"Avengers: Age of Ultron\" + \"\\n\" +",
        "\"The Hateful Eight\" + \"\\n\" +",
        "\"Django Unchained\" + \"\\n\" +",
        "\"Pulp Fiction\" + \"\\n\" +",
        "\"Thor\" + \"\\n\" +",
        "\"Iron Man\" + \"\\n\" +",
        "\"Spectre\" + \"\\n\" +",
        "\"Skyfall\" + \"\\n\" +",
        "\"Inglourious Basterds\" + \"\\n\" +",
        "\"Fight Club\" + \"\\n\" +",
        "\"Taken\" + \"\\n\" +",
        "\"Stargate\" + \"\\n\" +",
        "\"Tron\" + \"\\n\" +",
        "\"The Incredible Hulk\";",
        "",
        "return {\"movie list\": movies.split(\"\\n\") };",
        "}"
      ]
    },
    "OMDb Data": {
      "type": "module",
      "name": "fetch_movies",
      "description": "Retrieves full movie information from OMDb for a given array of movie titles.",
      "dataInNames": [
        "movie list"
      ],
      "dataInSchema": {
        "type": "object",
        "properties": {
          "movie list": {
            "type": "array"
          }
        }
      },
      "dataOutNames": [
        "movies"
      ],
      "dataOutSchema": {
        "type": "object",
        "properties": {
          "movies": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "Title": {
                  "type": "string"
                },
                "Genre": {
                  "type": "string"
                },
                "Director": {
                  "type": "string"
                },
                "Actors": {
                  "type": "string"
                },
                "imdbRating": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "inputNames": [],
      "inputSchema": {},
      "request": [
        "function (data, input, libs) {",
        "",
        "var requests = new Array();",
        "libs.get(data,\"movie list\").forEach(function(element) {",
        "requests.push(",
        "libs.axios.get(\"http://www.omdbapi.com/?t=\" + element.replace(\" \",\"+\") + \"&y=&plot=short&r=json\")",
        ");",
        "});",
        "",
        "return  Promise.all(",
        "requests",
        ");",
        "",
        "}    "
      ],
      "response": [
        "function (response, input, libs) {",
        "",
        "var responseData = new Array();",
        "response.forEach(function(element){",
        "if(element.data.Response==\"True\"){",
        "responseData.push(element.data);",
        "}",
        "});",
        "return {movies: responseData}",
        "}"
      ]
    },
    "movie nodes": {
      "type": "module",
      "name": "movie_nodes",
      "description": "Creates nodes for the graph representing the movies.",
      "dataInNames": [
        "movies"
      ],
      "dataInSchema": {
        "type": "object",
        "properties": {
          "movies": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "Title": {
                  "type": "string"
                },
                "Genre": {
                  "type": "string"
                },
                "Director": {
                  "type": "string"
                },
                "Actors": {
                  "type": "string"
                },
                "imdbRating": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "dataOutNames": [
        "nodes"
      ],
      "dataOutSchema": {
        "type": "object",
        "properties": {
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "label": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "color": {
                  "type": "string"
                },
                "size": {
                  "type": "number"
                },
                "attributes": {
                  "type": "object"
                }
              }
            }
          }
        }
      },
      "inputNames": [],
      "inputSchema": {},
      "compute": [
        "function (data, input, libs) {",
        "var nodes = new Array();",
        "var movieHash = {};",
        "data.movies.forEach(function(movie){",
        "var rating = parseFloat(movie.imdbRating);",
        "var node = {",
        "label: movie.Title,",
        "id: movie.Title,",
        "size: rating,",
        "attributes: {",
        "Type: \"Movie\",",
        "}",
        "}",
        "",
        "if(rating < 3){",
        "node.color = \"#FF5500\";",
        "}",
        "else if ( rating < 6){",
        "node.color = \"#FF9D00\";",
        "}",
        "else {",
        "node.color = \"#FFE100\";",
        "}",
        "",
        "if(!libs.get(movieHash, movie.Title)) {",
        "nodes.push(node);",
        "libs.set(movieHash, movie.Title, true);",
        "}",
        "});",
        "",
        "return {nodes: nodes};",
        "}"
      ]
    },
    "graph": {
      "type": "module",
      "name": "graph_creator",
      "description": "Combines nodes and edges into a graph.",
      "dataInNames": [
        "nodes",
        "edges"
      ],
      "dataInSchema": {
        "type": "object",
        "properties": {
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "label": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "color": {
                  "type": "string"
                },
                "size": {
                  "type": "number"
                },
                "attributes": {
                  "type": "object"
                }
              }
            }
          },
          "edges": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "target": {
                  "type": "string"
                },
                "source": {
                  "type": "string"
                },
                "color": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "dataOutNames": [
        "result"
      ],
      "dataOutSchema": {},
      "inputNames": [],
      "inputSchema": {},
      "compute": [
        "function (data, input, libs) {",
        "var config = {",
        "label: \"Movies\"",
        "};",
        "",
        "var graph = {",
        "nodes: data.nodes,",
        "edges: data.edges || new Array()",
        "}",
        "return {config: config, data: graph};",
        "}"
      ]
    },
    "Filter1": {
      "type": "module",
      "name": "movie_filter1",
      "description": "Filters movie array based on various criteria.",
      "dataInNames": [
        "movies"
      ],
      "dataInSchema": {
        "type": "object",
        "properties": {
          "movies": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "Title": {
                  "type": "string"
                },
                "Genre": {
                  "type": "string"
                },
                "Director": {
                  "type": "string"
                },
                "Actors": {
                  "type": "string"
                },
                "imdbRating": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "dataOutNames": [
        "movies"
      ],
      "dataOutSchema": {
        "type": "object",
        "properties": {
          "movies": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "Title": {
                  "type": "string"
                },
                "Genre": {
                  "type": "string"
                },
                "Director": {
                  "type": "string"
                },
                "Actors": {
                  "type": "string"
                },
                "imdbRating": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "inputNames": [
        "minRating"
      ],
      "inputSchema": {},
      "compute": [
        "function (data, input, libs) {",
        "var minRating = input.minRating || 0;",
        "minRating = parseFloat(minRating);",
        "var movies = data.movies.filter(function(movie) {",
        "return +movie.imdbRating >= +minRating;",
        "});",
        "return {movies: movies};",
        "}"
      ]
    }
  },
  "links": {
    "Filter1": {
      "movies": {
        "movie nodes": "movies"
      }
    },
    "OMDb Data": {
      "movies": {
        "Filter1": "movies"
      }
    },
    "movie list": {
      "movie list": {
        "OMDb Data": "movie list"
      }
    },
    "movie nodes": {
      "nodes": {
        "graph": "nodes"
      }
    }
  },
  "controls": [
    {
      "label": "Filter",
      "controls": [
        {
          "type": "slider",
          "label": "Min Rating",
          "description": "",
          "value": "1",
          "min": "0",
          "max": "10",
          "map": [
            "input.Filter1.minRating"
          ]
        }
      ]
    }
  ],
  "visualization": "http://localhost:8021/sweva-visualization-graph/dist/sweva-visualization-graph.html"
};

/**
 * This composition tries an MQTT connection.
 *
 * @type {{type: string, name: string, dataInNames: Array, dataInSchema: {}, dataOutNames: string[], dataOutSchema: {}, inputNames: Array, inputSchema: {}, mapDataIn: string[], mapDataOut: string[], mapInput: string[], composables: {Node40: {type: string, name: string, description: string, dataInNames: Array, dataInSchema: {}, dataOutNames: string[], dataOutSchema: {}, inputNames: string[], inputSchema: {}, request: string[], response: string[], mqttcallback: string[]}}, links: {}, controls: *[], visualization: string}}
 */
var mqttComposition = {"type":"composition",
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
        " //adddata(1, topic, message);"
        ,"}"]


    }},"links":{},"controls":[{"label":"Section1","controls":[]}],"visualization":"sweva-visualization-raw/dist/sweva-visualization-raw.min.html"
};


var now = Date.now();
var manager = new sweva.ExecutionManager();
manager.addReexecutionListener(function(result) {
  console.log('the demo has a new result: ' + result);
});
console.log("starting...");
manager.setup(simpleMQTTSubscribe);
manager.onProgress(function (progress) {
  //console.log(progress);
});


manager.execute({}, {
    "Filter1": {
      "minRating": 1
    }
  }).then(function (result) {
    console.log('time ' + (Date.now() - now) + 'ms');
    console.log(result);
  });

