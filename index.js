$app = null

Node.prototype.createChildElement = function (name, attributes, callback) {
    var element = document.createElement(name)
    this.appendChild(element)
    if (attributes) {
        Object.keys(attributes).forEach(function (key) {
            element[key] = attributes[key]
        })
    }
    if (callback) {
        callback(element)
    }
    return this
}

function onLoad() {
    if ($app) return
    $app = {
        hierarchy: {},
    }

    function scanObject(blockNode, name, obj, maxDepth, callback) {
        this.blockNode = blockNode
        this.scannedObjects = {}
        this.scannedCount = 0
        this.depth = 0
        this.maxDepth = maxDepth
        this.callback = callback
        scanRecursive(this, name, obj)
    }

    function scanRecursive(_this, name, obj) {
        if (_this.maxDepth > 0 && _this.depth > _this.maxDepth) return
        if (_this.scannedObjects[obj] == obj) return
        _this.scannedObjects[obj] = obj

        var type = typeof obj
        var objectType = obj != null ? obj.__proto__[Symbol.toStringTag] : null
        if (_this.callback(_this, name, obj, type, objectType)) {
            if (type !== 'string') {
                _this.depth++
                var isArray = isArrayObject(obj)
                if (isArray) {
                    for (var k in obj) {
                        var n = k === parseInt(k).toString() ? name + '[' + k + ']' : name + '.' + k
                        scanRecursive(_this, n, obj[k])
                    }
                } else {
                    for (var k in obj) {
                        var n = name + '.' + k
                        scanRecursive(_this, n, obj[k])
                    }
                }
                _this.depth--
            }
        }
    }

    function isArrayObject(obj) {
        if (obj == null) return false
        // if (Array.isArray(obj)) return true
        var keys = Object.keys(obj)
        if (keys.length == 0) return false
        if (keys.some(function (value) {
            return value !== parseInt(value).toString()
        })) return false
        return true
    }

    function scanCallback(_this, name, obj, type, objectType, hierarchy) {
        function escapeHTML(html) {
            var elem = document.createElement('div');
            elem.appendChild(document.createTextNode(html));
            return elem.innerHTML;
        }

        var colorText = 'black'
        if (type === 'function') {
            colorText = 'blue'
        } else if (type === 'string') {
            colorText = 'maroon'
        } else if (type === 'number') {
            colorText = 'teal'
        } else if (type === 'boolean') {
            colorText = 'olive'
        }

        var typeText = objectType != null ? objectType : type
        var valueText = obj != null && type !== 'function' ? escapeHTML(obj.toString()) : ''
        _this.blockNode
            .createChildElement('div', {
                style:
                    ' color: ' + colorText + ';' +
                    ' background-color: ' + (_this.scannedCount % 2 == 0 ? '#F0F0F0' : 'white') + ';' +
                    '',
                innerText: name + ' : ' + typeText + ' = `' + valueText + '`',
            })
        _this.scannedCount++

        hierarchy[name] = {
            name: name,
            type: typeText,
            value: valueText,
        }
    }

    var innerDivNode = document.createElement('div')
    var listDivNode = null
    innerDivNode
        //.createChildElement('input', { type: 'button', })
        .createChildElement('h1', {
            innerText: 'window',
            onclick: function () {
                var div = document.getElementById(this.innerText)
                div.style.display = div.style.display !== 'none' ? 'none' : 'block'
            },
        })
        .createChildElement('div', { id: 'window' }, function (div) { listDivNode = div })
    $app.hierarchy['window'] = {}
    var rootObjects = {}
    new scanObject(listDivNode, 'window', window, 1, function (_this, name, obj, type, objectType) {
        if (type === 'object' && objectType !== 'Window') {
            if (objectType) {
                var n = name.substring(name.lastIndexOf('.') + 1)
                rootObjects[n] = obj
            } else {
                console.log('ignore ' + name + ' : ' + type + '(' + objectType + ')')
            }
        } else {
            scanCallback(_this, name, obj, type, objectType, $app.hierarchy['window'])
        }
        return true
    })
    for (var k in rootObjects) {
        innerDivNode
            .createChildElement('h1', {
                innerText: k,
                onclick: function () {
                    var div = document.getElementById(this.innerText)
                    div.style.display = div.style.display !== 'none' ? 'none' : 'block'
                },
            })
            .createChildElement('div', { id: k }, function (div) { listDivNode = div })
        $app.hierarchy[k] = {}
        new scanObject(listDivNode, k, rootObjects[k], 0, function (_this, name, obj, type, objectType) {
            scanCallback(_this, name, obj, type, objectType, $app.hierarchy[k])
            var n = name.substring(name.lastIndexOf('.') + 1)
            if (type === 'object' && objectType != null && (objectType === 'Window' || (objectType === 'Location' && _this.depth > 0) || objectType.match(/^HTML[A-Z][a-z]+Element$/))) {
                console.log('ignore ' + name + ' : ' + type + '(' + objectType + ') and children')
                return false
            }
            return true
        })
    }

    document.getElementById('body')
        //.createChildElement('p', { innerText: JSON.stringify($app.hierarchy) })
        .appendChild(innerDivNode)
}

document.addEventListener('DOMContentLoaded', function () { onLoad() }, false)
document.addEventListener('deviceready', function () { onLoad() }, false)
