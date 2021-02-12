/**
 * Create a function to pipe chunks of data to a writable stream.
 * @param {...string} chunks
 * @returns {Stream}
 */
function pipe(...chunks) {
    return function pipe(writable) {
        setTimeout(writeChunk, 0);
        return writable;

        function writeChunk() {
            if (chunks.length === 0) return writable.end();
            writable.write(chunks.shift());
            setTimeout(writeChunk, 0);
        }
    }
}

module.exports = pipe;
