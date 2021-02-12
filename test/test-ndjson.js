const Request = require("mock-express-request");
const Response = require("mock-express-response");
const expect = require("expect.js");
const sinon = require("sinon");
const ndjson = require("..");
const Type = require("../lib/type");

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
    let middleware;

    beforeEach(() => {
        middleware = ndjson(documentHandler);
    });

    describe("client errors", () => {
        it("should send 415 response if content-type is not supported", async () => {
            const req = new Request({headers: {"content-type": "text/x-foo"}});
            const res = new Response({request: req});
            const next = sinon.spy();

            sinon.spy(res, "status");

            await middleware(req, res, next);

            expect(res.status.calledOnce).to.be(true);
            expect(res.status.calledWith(415)).to.be(true);
            expect(next.called).to.be(false);
        });
    });

    describe("with parsed JSON body", () => {
        const body = JSON.stringify({foo:13});
        let req, res, next;

        beforeEach(() => {
            middleware.documentHandler = sinon.spy();
            req = new Request({headers: {"content-type": Type.json}});
            res = new Response({request: req});
            next = sinon.spy();
            req.body = JSON.parse(body);
            sinon.spy(res, "status");
        });

        it("should send 202 response", async () => {
            await middleware(req, res, next);

            expect(res.status.calledOnce).to.be(true);
            expect(res.status.calledWith(202)).to.be(true);
            expect(next.called).to.be(false);
        });

        it("should pass body to documentHandler", async () => {
            await middleware(req, res, next);

            expect(middleware.documentHandler.calledOnce).to.be(true);
            expect(middleware.documentHandler.calledWith(req.body)).to.be(true);
        });
    });

    it("should pass parsed JSON body to handler", async () => {
        const req = new Request({headers: {"content-type": Type.json}});
        const res = new Response({request: req});
        const next = sinon.spy();

        sinon.spy(res, "status");
        req.body = {};

        await middleware(req, res, next);

        expect(res.status.calledOnce).to.be(true);
        expect(res.status.calledWith(202)).to.be(true);
        expect(next.called).to.be(false);
    });

    it("should pass parsed JSON body to documentHandler", () => {
        const req = new Request({headers: {"content-type": Type.json}});
        const res = new Response({request: req});
        const next = sinon.spy();
    });
});

function documentHandler(doc) {
    // do nothing
}

function errorHandler(err) {
    // do nothing
}
