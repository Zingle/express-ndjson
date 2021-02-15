const expect = require("expect.js");
const sinon = require("sinon");
const bodyParser = require("body-parser");
const ndjson = require("..");
const Type = require("../lib/type");
const pipe = require("./lib/pipe");
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
});
