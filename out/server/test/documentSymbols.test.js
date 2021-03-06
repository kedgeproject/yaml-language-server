"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_languageserver_1 = require("vscode-languageserver");
const yamlLanguageService_1 = require("../src/languageService/yamlLanguageService");
const jsonSchemaService_1 = require("../src/languageService/services/jsonSchemaService");
const testHelper_1 = require("./testHelper");
const yamlParser_1 = require("../src/languageService/parser/yamlParser");
var assert = require('assert');
let languageService = yamlLanguageService_1.getLanguageService(testHelper_1.schemaRequestService, testHelper_1.workspaceContext, [], null);
let schemaService = new jsonSchemaService_1.JSONSchemaService(testHelper_1.schemaRequestService, testHelper_1.workspaceContext);
suite("Document Symbols Tests", () => {
    describe('Document Symbols Tests', function () {
        function setup(content) {
            return vscode_languageserver_1.TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
        }
        function parseSetup(content) {
            let testTextDocument = setup(content);
            let jsonDocument = yamlParser_1.parse(testTextDocument.getText());
            return languageService.findDocumentSymbols(testTextDocument, jsonDocument);
        }
        it('Document is empty', (done) => {
            let content = "";
            let symbols = parseSetup(content);
            assert.equal(symbols, null);
            done();
        });
        it('Simple document symbols', (done) => {
            let content = "cwd: test";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 1);
            done();
        });
        it('Document Symbols with number', (done) => {
            let content = "node1: 10000";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 1);
            done();
        });
        it('Document Symbols with boolean', (done) => {
            let content = "node1: False";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 1);
            done();
        });
        it('Document Symbols with object', (done) => {
            let content = "scripts:\n  node1: test\n  node2: test";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 3);
            done();
        });
        it('Document Symbols with null', (done) => {
            let content = "apiVersion: null";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 1);
            done();
        });
        it('Document Symbols with array of strings', (done) => {
            let content = "items:\n  - test\n  - test";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 1);
            done();
        });
        it('Document Symbols with array', (done) => {
            let content = "authors:\n  - name: Josh\n  - email: jp";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 3);
            done();
        });
        it('Document Symbols with object and array', (done) => {
            let content = "scripts:\n  node1: test\n  node2: test\nauthors:\n  - name: Josh\n  - email: jp";
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 6);
            done();
        });
        it('Document Symbols with multi documents', (done) => {
            let content = '---\nanalytics: true\n...\n---\njson: test\n...';
            let symbols = parseSetup(content);
            assert.equal(symbols.length, 2);
            done();
        });
    });
});
//# sourceMappingURL=documentSymbols.test.js.map