var sweva = require('./app/core/core.js');
const http = require("http");

const host = 'localhost';
const port = 5005;

var manager = new sweva.ExecutionManager();

/** USAGE:
 * HTTP post request to /executeModule containing JSON with module: SWEVA module, data: input data object, input user input data object
 * returns: result of the module with the specified parameters as JSON
 * */

const requestListener = function (req, res) {

    if ((req.url === '/executeModule' || req.url === '/executePipeline' )&& req.method === "POST") {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);

        var data = [];
        req.on('data', function(chunk) {
            data.push(chunk);
        }).on('end', function() {
            try {
                var httpPostData = JSON.parse(Buffer.concat(data).toString());

                if(req.url === '/executeModule') {
                    //execute module
                    sweva.runners.typescript.exec(httpPostData.module, httpPostData.data, httpPostData.input).then(result => {
                        res.then(r => console.log(r));
                        res.end(JSON.stringify(result));
                    });
                }else {
                    //execute pipeline
                    manager.setup(simpleAssemblyScriptPipeline);
                    manager.execute(httpPostData.module, httpPostData.data, httpPostData.input).then(result => {
                        res.then(r => console.log(r));
                        res.end(JSON.stringify(result));
                    });
                }
            }catch {
                res.end("Invalid module or parameters");
            }
            if (body) console.log(JSON.parse(body));
            res.end('It Works!!');
        });
    } else {
        res.writeHead(404);
        res.end('Invalid Request!');
    }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log("SWEVA execution service is running on http://"+host+":"+port);
});