/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const kubernetesTransformer_1 = require("../kubernetesTransformer");
class YAMLValidation {
    constructor(jsonSchemaService, promiseConstructor) {
        this.jsonSchemaService = jsonSchemaService;
        this.promise = promiseConstructor;
        this.validationEnabled = true;
    }
    configure(shouldValidate) {
        if (shouldValidate) {
            this.validationEnabled = shouldValidate.validate;
        }
    }
    doValidation(textDocument, yamlDocument, isKubernetes) {
        if (!this.validationEnabled) {
            return this.promise.resolve([]);
        }
        return this.jsonSchemaService.getSchemaForResource(textDocument.uri).then(function (schema) {
            if (schema) {
                if (isKubernetes) {
                    schema.schema = kubernetesTransformer_1.KubernetesTransformer.doTransformation(schema.schema);
                }
                for (let currentYAMLDoc in yamlDocument.documents) {
                    let currentDoc = yamlDocument.documents[currentYAMLDoc];
                    let diagnostics = currentDoc.getValidationProblems(schema.schema);
                    for (let diag in diagnostics) {
                        let curDiagnostic = diagnostics[diag];
                        currentDoc.errors.push({ location: { start: curDiagnostic.location.start, end: curDiagnostic.location.end }, message: curDiagnostic.message });
                    }
                }
            }
            var diagnostics = [];
            var added = {};
            for (let currentYAMLDoc in yamlDocument.documents) {
                let currentDoc = yamlDocument.documents[currentYAMLDoc];
                currentDoc.errors.concat(currentDoc.warnings).forEach(function (error, idx) {
                    // remove duplicated messages
                    var signature = error.location.start + ' ' + error.location.end + ' ' + error.message;
                    if (!added[signature]) {
                        added[signature] = true;
                        var range = {
                            start: textDocument.positionAt(error.location.start),
                            end: textDocument.positionAt(error.location.end)
                        };
                        diagnostics.push({
                            severity: idx >= currentDoc.errors.length ? vscode_languageserver_types_1.DiagnosticSeverity.Warning : vscode_languageserver_types_1.DiagnosticSeverity.Error,
                            range: range,
                            message: error.message
                        });
                    }
                });
            }
            return diagnostics;
        });
    }
}
exports.YAMLValidation = YAMLValidation;
//# sourceMappingURL=yamlValidation.js.map