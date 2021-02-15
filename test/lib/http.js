const http = require("http");
const fetch = require("node-fetch");
const express = require("express");

/**
 * Create test express server.
 * @returns {http.Server}
 */
function createExpressServer() {
    const app = express();
    const server = http.createServer(app);

    app.httpServer = server;
    app.listen = listen;
    app.close = () => server.close();
    app.fetch = (res, init) => fetch(new URL(res, app.url), init);

    return app;

    async function listen() {
        return new Promise((resolve, reject) => {
            server.listen(() => {
                const {port} = server.address();
                app.url = new URL(`http://localhost:${port}/`);
                resolve(app.url);
            });
        });
    }
}

module.exports = {createExpressServer};
