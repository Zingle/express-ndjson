export = ndjson;
/**
 * @param {object|function} opts
 * @param {function}        opts.documentHandler
 * @param {function}        [opts.errorHandler]
 * @param {number}          [opts.maxSize]
 * @param {number}          [opts.maxDocuments]
 * @returns {function}
 */
declare function ndjson(opts?: object | Function): Function;
