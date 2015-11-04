
// Create new ViewModel with all navigationproperties. If Array then [] array.
function create(metadata, item) {
    var key = getKeyByValue(metadata, item);
    var nodeTree = [];

    var node = {
        key: key,
        siblings: [],
        parent: null
    };
    nodeTree.push(node);
    return parseMetadataToObject(metadata, key, nodeTree, node);
}

function parseMetadataToObject(metadata, key, nodeTree, parent) {
    if(hasSameParent(parent, key)){
        return '{circular: ' + key + '}';
    }

    var node = {
        key: key,
        siblings: [],
        parent: parent

    };
    parent.siblings.push(node);
    var item = metadata[key];

    if (item == undefined) {
        throw new Error('Object not found in Metadata: ' + key);
    }

    var type = _.extend({}, item);

    Object.keys(type).forEach(function (field) {
        if (field == 'Id') {
            type[field] = '00000000-0000-0000-0000-000000000000';
        }
        else {
            type[field] = getValueBasedOnType(metadata, type, field, nodeTree, node);
        }
    });
    return type;
}

function hasSameParent(node, key) {
    if(node.parent == undefined){
        return false;
    }
    if(node.parent.key == key){
        return true;
    }
    return hasSameParent(node.parent, key);
}

function getValueBasedOnType(metadata, type, field, nodes, node) {
    var fieldType = type[field].Type;
    switch (fieldType) {
        case 'DateTime?':
            return null;
        case 'DateTime':
            return new Date();
        case 'Guid?':
            return null;
        case 'Guid':
            return null;
        case 'String':
            return null;
        case 'Boolean':
            return false;
        case 'Boolean?':
            return null;
        case 'Decimal?':
            return null;
        case 'Decimal':
            return 0;
        case 'Int32?':
            return null;
        case 'Int32':
            return 0;
        case 'Int64?':
            return null;
        case 'Int64':
            return 0;
        case 'DateTimeOffset?':
            return null;
        case 'DateTimeOffset':
            return new Date();
        case 'Object':
            return null;
        case 'T':
            return null;
        default:
            if (fieldType.indexOf('[]') !== -1) {
                return [];
            }
            var matches = fieldType.match(/<(.*)>/);
            if (matches && matches.length > 0) {
                return parseMetadataToObject(metadata, matches[1], nodes, node);
            }

            return parseMetadataToObject(metadata, type[field].Type, nodes, node);
    }

    return null;
}

function getKeyByValue(object, key) {
    for (var prop in object) {
        if (object.hasOwnProperty(prop)) {
            if (object[prop] === key) {
                return prop;
            }
        }
    }
    return undefined;
}
