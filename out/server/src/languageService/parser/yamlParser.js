'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const jsonParser_1 = require("./jsonParser");
const nls = require("vscode-nls");
const localize = nls.loadMessageBundle();
const Yaml = require("yaml-ast-parser");
const documentPositionCalculator_1 = require("../utils/documentPositionCalculator");
class SingleYAMLDocument extends jsonParser_1.JSONDocument {
    constructor(lines) {
        super(null, []);
        this.getNodeByIndent = (lines, offset, node) => {
            const { line, column: indent } = documentPositionCalculator_1.getPosition(offset, this.lines);
            const children = node.getChildNodes();
            function findNode(children) {
                for (var idx = 0; idx < children.length; idx++) {
                    var child = children[idx];
                    const { line: childLine, column: childCol } = documentPositionCalculator_1.getPosition(child.start, lines);
                    if (childCol > indent) {
                        return null;
                    }
                    const newChildren = child.getChildNodes();
                    const foundNode = findNode(newChildren);
                    if (foundNode) {
                        return foundNode;
                    }
                    // We have the right indentation, need to return based on line
                    if (childLine == line) {
                        return child;
                    }
                    if (childLine > line) {
                        // Get previous
                        (idx - 1) >= 0 ? children[idx - 1] : child;
                    }
                    // Else continue loop to try next element
                }
                // Special case, we found the correct
                return children[children.length - 1];
            }
            return findNode(children) || node;
        };
        this.lines = lines;
        this.root = null;
        this.errors = [];
        this.warnings = [];
    }
    getSchemas(schema, doc, node) {
        let matchingSchemas = [];
        doc.validate(schema, matchingSchemas, node.start);
        return matchingSchemas;
    }
    getNodeFromOffset(offset) {
        return this.getNodeFromOffsetEndInclusive(offset);
    }
}
exports.SingleYAMLDocument = SingleYAMLDocument;
function recursivelyBuildAst(parent, node) {
    if (!node) {
        return;
    }
    switch (node.kind) {
        case Yaml.Kind.MAP: {
            const instance = node;
            const result = new jsonParser_1.ObjectASTNode(parent, null, node.startPosition, node.endPosition);
            result.addProperty;
            for (const mapping of instance.mappings) {
                result.addProperty(recursivelyBuildAst(result, mapping));
            }
            return result;
        }
        case Yaml.Kind.MAPPING: {
            const instance = node;
            const key = instance.key;
            // Technically, this is an arbitrary node in YAML
            // I doubt we would get a better string representation by parsing it
            const keyNode = new jsonParser_1.StringASTNode(null, null, true, key.startPosition, key.endPosition);
            keyNode.value = key.value;
            const result = new jsonParser_1.PropertyASTNode(parent, keyNode);
            result.end = instance.endPosition;
            const valueNode = (instance.value) ? recursivelyBuildAst(result, instance.value) : new jsonParser_1.NullASTNode(parent, key.value, instance.endPosition, instance.endPosition);
            valueNode.location = key.value;
            result.setValue(valueNode);
            return result;
        }
        case Yaml.Kind.SEQ: {
            const instance = node;
            const result = new jsonParser_1.ArrayASTNode(parent, null, instance.startPosition, instance.endPosition);
            let count = 0;
            for (const item of instance.items) {
                if (item === null && count === instance.items.length - 1) {
                    break;
                }
                // Be aware of https://github.com/nodeca/js-yaml/issues/321
                // Cannot simply work around it here because we need to know if we are in Flow or Block
                var itemNode = (item === null) ? new jsonParser_1.NullASTNode(parent, null, instance.endPosition, instance.endPosition) : recursivelyBuildAst(result, item);
                itemNode.location = count++;
                result.addItem(itemNode);
            }
            return result;
        }
        case Yaml.Kind.SCALAR: {
            const instance = node;
            const type = Yaml.determineScalarType(instance);
            // The name is set either by the sequence or the mapping case.
            const name = null;
            const value = instance.value;
            //This is a patch for redirecting values with these strings to be boolean nodes because its not supported in the parser.
            let possibleBooleanValues = ['y', 'Y', 'yes', 'Yes', 'YES', 'n', 'N', 'no', 'No', 'NO', 'on', 'On', 'ON', 'off', 'Off', 'OFF'];
            if (possibleBooleanValues.indexOf(value.toString()) !== -1) {
                return new jsonParser_1.BooleanASTNode(parent, name, value, node.startPosition, node.endPosition);
            }
            switch (type) {
                case Yaml.ScalarType.null: {
                    return new jsonParser_1.NullASTNode(parent, name, instance.startPosition, instance.endPosition);
                }
                case Yaml.ScalarType.bool: {
                    return new jsonParser_1.BooleanASTNode(parent, name, Yaml.parseYamlBoolean(value), node.startPosition, node.endPosition);
                }
                case Yaml.ScalarType.int: {
                    const result = new jsonParser_1.NumberASTNode(parent, name, node.startPosition, node.endPosition);
                    result.value = Yaml.parseYamlInteger(value);
                    result.isInteger = true;
                    return result;
                }
                case Yaml.ScalarType.float: {
                    const result = new jsonParser_1.NumberASTNode(parent, name, node.startPosition, node.endPosition);
                    result.value = Yaml.parseYamlFloat(value);
                    result.isInteger = false;
                    return result;
                }
                case Yaml.ScalarType.string: {
                    const result = new jsonParser_1.StringASTNode(parent, name, false, node.startPosition, node.endPosition);
                    result.value = node.value;
                    return result;
                }
            }
            break;
        }
        case Yaml.Kind.ANCHOR_REF: {
            const instance = node.value;
            return recursivelyBuildAst(parent, instance) ||
                new jsonParser_1.NullASTNode(parent, null, node.startPosition, node.endPosition);
        }
        case Yaml.Kind.INCLUDE_REF: {
            const result = new jsonParser_1.StringASTNode(parent, null, false, node.startPosition, node.endPosition);
            result.value = node.value;
            return result;
        }
    }
}
function convertError(e) {
    return { message: `${e.reason}`, location: { start: e.mark.position, end: e.mark.position + e.mark.column, code: jsonParser_1.ErrorCode.Undefined } };
}
function createJSONDocument(yamlDoc, startPositions) {
    let _doc = new SingleYAMLDocument(startPositions);
    _doc.root = recursivelyBuildAst(null, yamlDoc);
    if (!_doc.root) {
        // TODO: When this is true, consider not pushing the other errors.
        _doc.errors.push({ message: localize('Invalid symbol', 'Expected a YAML object, array or literal'), code: jsonParser_1.ErrorCode.Undefined, location: { start: yamlDoc.startPosition, end: yamlDoc.endPosition } });
    }
    const duplicateKeyReason = 'duplicate key';
    const errors = yamlDoc.errors.filter(e => e.reason !== duplicateKeyReason && !e.isWarning).map(e => convertError(e));
    const warnings = yamlDoc.errors.filter(e => e.reason === duplicateKeyReason || e.isWarning).map(e => convertError(e));
    errors.forEach(e => _doc.errors.push(e));
    warnings.forEach(e => _doc.warnings.push(e));
    return _doc;
}
class YAMLDocument {
    constructor(documents) {
        this.documents = documents;
        this.errors = [];
        this.warnings = [];
    }
}
exports.YAMLDocument = YAMLDocument;
function parse(text) {
    const startPositions = documentPositionCalculator_1.getLineStartPositions(text);
    // This is documented to return a YAMLNode even though the
    // typing only returns a YAMLDocument
    const yamlDocs = [];
    Yaml.loadAll(text, doc => yamlDocs.push(doc), {});
    return new YAMLDocument(yamlDocs.map(doc => createJSONDocument(doc, startPositions)));
}
exports.parse = parse;
//# sourceMappingURL=yamlParser.js.map