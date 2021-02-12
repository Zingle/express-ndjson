const readline = require("readline");
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

        try {
            // check for JSON which has already been parsed
            if (req.is(Type.json) && req.body) {
                ndjson.documentHandler(req.body);
            }

            // check for JSON which has not been parsed yet
            if (req.is(Type.json) && !req.body) {
                // should do something useful
            }

            // check for document stream
            if (req.is(Type.ndjson)) {
                // should do something useful
            }

            res.status(202);
            res.setHeader("content-type", Type.text);
            res.send(`Accepted\n`);
        } catch (err) {
            ndjson.errorHandler(err);
            res.status(500);
            res.setHeader("content-type", Type.text);
            res.send(`Internal Server Error: ${err.message}\n`);
        }
    }
}

module.exports = ndjson;
