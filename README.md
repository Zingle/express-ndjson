The **@zingle/express-ndjson** library provides Express.js middleware to handle
incoming ND-JSON streams of JSON documents.

Usage
=====

Basic Usage
-----------
For simple usage with default behavior, you can pass a document handler function
to the middleware.  This middleware will accept requests as JSON or ND-JSON and
pass parsed documents to the document handler.

```js
const express = require("express");
const ndjson = require("@zingle/express-ndjson");
const app = express();

app.post("_bulk", ndjson(doc => {
    // handle parsed JSON document
}));
```

Custom Usage
------------
You can pass several options to the middleware to customize the behavior.  When
passing options, pass the document handler as an option named "documentHandler".

```js
const express = require("express");
const ndjson = require("@zingle/express-ndjson");
const app = express();

app.post("_bulk", ndjson({
    maxSize: 102400,                // max size of document in bytes
    maxDocuments: 500,              // max number of documents in stream
    errorHandler: console.error,    // pass errors to handler
    documentHandler: doc => {       // pass parsed documents to handler
        // handle parsed JSON document
    }
}));
```
