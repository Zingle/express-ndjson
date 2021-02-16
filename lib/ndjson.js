const {default: limit} = require("stream-size");
const ndjsonTransform = require("@zingle/ndjson")
const defaults = require("./defaults");
const Type = require("./type");

/**
 * @param {object|function} opts
 * @param {function}        opts.documentHandler
 * @param {function}        [opts.errorHandler]
 * @param {number}          [opts.maxSize]
 * @param {number}          [opts.maxDocuments]
 * @returns {function}
 */
function ndjson(opts={}) {
    if (typeof opts === "function") opts = {documentHandler: opts};

    opts = {...defaults, ...opts};

    // assign options to return value so they can be updated by caller
    ndjson.documentHandler = opts.documentHandler;
    ndjson.errorHandler = opts.errorHandler;
    ndjson.maxSize = opts.maxSize;
    ndjson.maxDocuments = opts.maxDocuments;

    // return ndjson middleware
    return ndjson;

    /**
     * Middleware function.  Accepts single JSON document or NDJSON stream of
     * documents and passes them to the document handler.
     */
    async function ndjson(req, res, next) {
        let documents = 0;

        // check for unacceptable request
        if (!(req.is(Type.json) || req.is(Type.ndjson))) {
            res.status(415);
            res.setHeader("content-type", Type.text);
            res.send(`Unsupported Media Type\n`);
            return;
        }

        // check for document stream
        if (req.is(Type.ndjson)) {
            let accepted = 0;
            let rejected = 0;

            try {
                await new Promise((resolve, reject) => {
                    const {maxSize} = ndjson;
                    const docs = req.pipe(ndjsonTransform({maxSize}));

                    docs.on("data", doc => { ndjson.documentHandler(doc); accepted++; });
                    docs.on("error", err => { rejected++; reject(err); });
                    docs.on("finish", resolve);
                });

                res.status(202);
                res.json({accepted, rejected});
            } catch (err) {
                res.status(err instanceof SyntaxError ? 400 : 500);
                res.setHeader("content-type", Type.json);
                res.json({accepted, rejected, error: err.message});
            }

            return;
        }

        // everything but JSON has been ruled out now
        try {
            // check for JSON which has already been parsed
            if (req.body && typeof req.body === "object") {
                ndjson.documentHandler(req.body);
            }

            // check for JSON which has not been parsed yet
            if (!(req.body && typeof req.body === "object")) {
                const body = await new Promise((resolve, reject) => {
                    const limited = req.pipe(limit(ndjson.maxSize));
                    const chunks = [];

                    limited.on("data", chunk => chunks.push(chunk));
                    limited.on("error", reject);
                    limited.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
                });

                ndjson.documentHandler(JSON.parse(body));
            }

            res.status(202);
            res.setHeader("content-type", Type.text);
            res.send("Accepted\n");
        } catch (err) {
            ndjson.errorHandler(err);
            res.status(500);
            res.setHeader("content-type", Type.text);
            res.send(`Internal Server Error: ${err.message}\n`);
        }
    }
}

module.exports = ndjson;
