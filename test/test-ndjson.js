const {Transform} = require("stream");
const expect = require("expect.js");
const sinon = require("sinon");
const bodyParser = require("body-parser");
const ndjson = require("..");
const Type = require("../lib/type");
const {createExpressServer} = require("./lib/http");

describe("ndjson module", () => {
    it("should export the ndjson function", () => {
        expect(ndjson).to.be.a("function");
        expect(ndjson.name).to.be("ndjson");
    });

    it("should export the defaults object", () => {
        expect(ndjson.defaults).to.be.an("object");
        expect(ndjson.defaults.documentHandler).to.be(undefined);
        expect(ndjson.defaults.errorHandler).to.be.a("function");
        expect(ndjson.defaults.maxDocuments).to.be.a("number");
        expect(ndjson.defaults.maxSize).to.be.a("number");
    });
});

describe("ndjson(function)", () => {
    const documentHandler = () => {};
    let result;

    beforeEach(() => {
        result = ndjson(documentHandler);
    });

    it("should return middleware", () => {
        expect(result).to.be.a("function");
        expect(result.length).to.be(3);
    });

    it("should set the .documentHandler property on middleware", () => {
        expect(result.documentHandler).to.be(documentHandler);
    });

    it("should set default options on middleware", () => {
        // iterate over default values and verify they all match
        Object.keys(ndjson.defaults).forEach(option => {
            if (option === "documentHandler") return;
            expect(result[option]).to.be(ndjson.defaults[option]);
        });
    });
});

describe("ndjson(object)", () => {
    const documentHandler = () => {};
    const errorHandler = () => {};
    const maxDocuments = 100;
    const maxSize = 3000;
    let result;

    beforeEach(() => {
        result = ndjson({documentHandler, errorHandler, maxDocuments, maxSize});
    });

    it("should return middleware", () => {
        expect(result).to.be.a("function");
        expect(result.length).to.be(3);
    });

    it("should set options on middleware", () => {
        expect(result.documentHandler).to.be(documentHandler);
        expect(result.errorHandler).to.be(errorHandler);
        expect(result.maxSize).to.be(maxSize);
        expect(result.maxDocuments).to.be(maxDocuments);
    });

    it("should set default options on middleware", () => {
        const result = ndjson(documentHandler);

        // iterate over default values and verify they all match
        Object.keys(ndjson.defaults).forEach(option => {
            if (option === "documentHandler") return;
            expect(result[option]).to.be(ndjson.defaults[option]);
        });
    });
});

describe("ndjson middleware", () => {
    let express, middleware;

    beforeEach(async () => {
        middleware = ndjson(sinon.spy());
        express = createExpressServer();
        await express.listen();
    });

    afterEach(() => {
        express.close();
    });

    describe("client errors", () => {
        beforeEach(() => {
            express.use(middleware);
        })

        it("should send 415 response when content-type is unsupported", async () => {
            const headers = {"content-type": Type.text};
            const res = await express.fetch("/", {headers});
            expect(res.status).to.be(415);
        });
    });

    describe("with unparsed JSON body", () => {
        const method = "PUT";
        const headers = {"content-type": Type.json};
        const body = JSON.stringify({foo:13});
        let res;

        beforeEach(async () => {
            express.use(middleware);
            res = await express.fetch("/", {method, headers, body});
        });

        it("should send 202 response", async () => {
            expect(res.status).to.be(202);
        });

        it("should pass body to documentHandler", async () => {
            expect(middleware.documentHandler.calledOnce).to.be(true);
            expect(JSON.stringify(middleware.documentHandler.args[0][0])).to.be(body);
        });
    });

    describe("with parsed JSON body", () => {
        const method = "PUT";
        const headers = {"content-type": Type.json};
        const body = JSON.stringify({foo:13});
        let res;

        beforeEach(async () => {
            express.use(bodyParser.json());
            express.use(middleware);
            res = await express.fetch("/", {method, headers, body});
        });

        it("should send 202 response", async () => {
            expect(res.status).to.be(202);
        });

        it("should pass body to documentHandler", async () => {
            expect(middleware.documentHandler.calledOnce).to.be(true);
            expect(JSON.stringify(middleware.documentHandler.args[0][0])).to.be(body);
        });
    });

    describe("with ND-JSON stream", () => {
        const method = "POST";
        const headers = {"content-type": Type.ndjson};
        const bodyA = JSON.stringify({A:"foo"});
        const bodyB = JSON.stringify({B:"foo"});
        const bodyC = JSON.stringify({C:"foo"});

        beforeEach(async () => {
            express.use(middleware);
        });

        it("should send 202 response", async () => {
            const body = [bodyA, bodyB, bodyC].map(s => s + "\n").join("");
            const res = await express.fetch("/", {method, headers, body});
            expect(res.status).to.be(202);
        });

        it("should pass each body to documentHandler", async () => {
            const body = [bodyA, bodyB, bodyC].map(s => s + "\n").join("");
            const res = await express.fetch("/", {method, headers, body});
            expect(middleware.documentHandler.calledThrice).to.be(true);
            expect(JSON.stringify(middleware.documentHandler.args[0][0])).to.be(bodyA);
            expect(JSON.stringify(middleware.documentHandler.args[1][0])).to.be(bodyB);
            expect(JSON.stringify(middleware.documentHandler.args[2][0])).to.be(bodyC);
        });

        it("should support streaming requests", async () => {
            const body = new Transform({transform(c,e,f) {this.push(c); f();}});
            const req = express.fetch("/", {method, headers, body});

            // iterate over bodies, testing each one before continuing
            for (const docBody of [bodyA, bodyB, bodyC]) {
                // wrap up middleware handlers in Promise of next doc result
                const doc = new Promise((documentHandler, errorHandler) => {
                    Object.assign(middleware, {documentHandler, errorHandler});
                });

                // now write document, which should resolve doc above
                body.write(docBody + "\n");

                // check resolved doc against expected result
                expect(JSON.stringify(await doc)).to.be(docBody);
            }

            body.end();
        });

        it("should send summary of results on success", async () => {
            const body = [bodyA, bodyB, bodyC].map(s => s + "\n").join("");
            const res = await express.fetch("/", {method, headers, body});
            const summary = await res.json();

            expect(summary).to.be.an("object");
            expect(summary.accepted).to.be(3);
            expect(summary.rejected).to.be(0);
        });

        it("should send summary of results on failure", async () => {
            const body = [bodyA, bodyB, bodyC.slice(1,-1)].map(s => s + "\n").join("");
            const res = await express.fetch("/", {method, headers, body});
            const summary = await res.json();

            expect(summary).to.be.an("object");
            expect(summary.accepted).to.be(2);
            expect(summary.rejected).to.be(1);
            expect(summary.error).to.be.ok();
        });
    });
});
