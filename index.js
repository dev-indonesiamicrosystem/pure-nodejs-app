/*
 * Primary file for the API
 *
 */

// Dependencies
const http = require('http');
const https = require('https');
const url  = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiate the HTTP server
const httpServer = http.createServer((request, response) => {
    unifiedServer(request, response);
});

// Start the server
httpServer.listen(config.httpPort, () => {
    console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
});

// Instantiate the HTTP server
const httpsServerOptions = {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (request, response) => {
    unifiedServer(request, response);
});

// Start the server
httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
});

// All the server logic for both http and https server
const unifiedServer = (request, response) => {
    // Get the URL and parse it
    const parseUrl = url.parse(request.url, true);

    // Get the path
    const path = parseUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    const queryStringObject = parseUrl.query;

    // Get the HTTP Method
    const method = request.method.toLowerCase();

    // Get the headers as an object
    const headers = request.headers

    // Get the payload, if any
    let decoder = new StringDecoder('utf-8');
    let buffer  = '';
    request.on('data', (data) => {
        buffer += decoder.write(data);
    });
    request.on('end', () => {
        buffer += decoder.end();

        // Choose the handler this request should go to. If one is not found, use the notFound handler.
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Construct the data object to send to the handler
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        }

        // Route the request to the handler specified in the router

        chosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, or default to empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert the payload to a string
            const payloadString = JSON.stringify(payload);

            // return the response
            response.setHeader('Content-Type', 'application/json');
            response.writeHead(statusCode);
            response.end(payloadString);

            console.log('Returning this response:', statusCode, payloadString);
        });
    });
}

// Define a request router
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}
