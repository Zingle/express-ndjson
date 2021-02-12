const expect = require("expect.js");
const ndjson = require("..");

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

function documentHandler(doc) {
    // do nothing
}

function errorHandler(err) {
    // do nothing
}
