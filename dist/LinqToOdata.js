!function(BoostJS, angular) {
    function replaceDotWithSlash(str) {
        return str.replace(/\./g, "/");
    }
    function replaceDotWithInnerKeys(string, key) {
        var wholeArray = string.split(",");
        return wholeArray.forEach(function(e, eIndex, eArray) {
            var result = "", array = e.split(".");
            array.forEach(function(item, index) {
                if (array.length - 1 !== index) result += item + "(" + key + "="; else {
                    result += item;
                    for (var i = 1; i < array.length; i++) result += ")";
                }
            }), eArray[eIndex] = result;
        }), wholeArray.join(",");
    }
    String.prototype.format || (String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return "undefined" != typeof args[number] ? args[number] : match;
        });
    });
    var extend = function(d, b) {
        function __() {
            this.constructor = d;
        }
        __.prototype = b.prototype, d.prototype = new __();
    }, emptyFn = function() {}, assertInstance = function(Type, instance) {
        if (!(instance instanceof Type)) throw new Error("Constructor run in the context of the window.");
    }, isValidGuid = function(value) {
        var validGuid = /^(\{|\(|\')?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}(\}|\)|\')?$/;
        return validGuid.test(value);
    }, Observable = function() {
        var self = this;
        assertInstance(Observable, self);
        var _listeners = {};
        self.observe = function(eventName, callback) {
            return _listeners[eventName] || (_listeners[eventName] = []), _listeners[eventName].push(callback), 
            self;
        }, self.unobserve = function(eventName, callback) {
            var listeners = _listeners[eventName] || [], index = listeners.indexOf(callback);
            return index >= 0 && listeners.splice(index, 1), self;
        }, self.notify = function(event) {
            var listeners = _listeners[event.type] || [];
            return listeners.forEach(function(callback) {
                callback(event);
            }), self;
        };
    }, Future = function(getValue) {
        var self = this;
        assertInstance(Future, self);
        var observers = new Observable(), defaultState = {
            get: function() {
                _state = retrievingState, getValue(function(value) {
                    _state === retrievingState && (self.isComplete = !0, self.value = value, _state = completeState, 
                    observers.notify({
                        type: "then",
                        value: value
                    }));
                }, function(error) {
                    _state === retrievingState && (self.isComplete = !0, self.error = error, _state = errorState, 
                    observers.notify({
                        type: "ifError",
                        error: error
                    }));
                });
            },
            then: function(callback) {
                var listener = function(e) {
                    callback(e.value);
                };
                observers.observe("then", listener);
            },
            success: function(callback) {
                var listener = function(e) {
                    callback(e.value);
                };
                observers.observe("then", listener);
            },
            "catch": function(callback) {
                var listener = function(e) {
                    callback(e.error);
                };
                observers.observe("ifError", listener);
            },
            error: function(callback) {
                var listener = function(e) {
                    callback(e.error);
                };
                observers.observe("ifError", listener);
            },
            ifError: function(callback) {
                var listener = function(e) {
                    callback(e.error);
                };
                observers.observe("ifError", listener);
            },
            ifCanceled: function(callback) {
                var listener = function(e) {
                    callback();
                };
                observers.observe("ifCanceled", listener);
            },
            cancel: function() {
                self.isComplete = !0, _state = canceledState, observers.notify({
                    type: "ifCanceled"
                });
            }
        }, retrievingState = {
            get: emptyFn,
            then: defaultState.then,
            ifError: defaultState.ifError,
            ifCanceled: defaultState.ifCanceled,
            cancel: defaultState.cancel
        }, errorState = {
            get: emptyFn,
            then: emptyFn,
            ifError: function(callback) {
                setTimeout(function() {
                    callback(self.error);
                }, 0);
            },
            ifCanceled: emptyFn,
            cancel: emptyFn
        }, canceledState = {
            get: emptyFn,
            then: emptyFn,
            ifError: emptyFn,
            ifCanceled: function(callback) {
                setTimeout(function() {
                    callback();
                }, 0);
            },
            cancel: emptyFn
        }, completeState = {
            get: emptyFn,
            then: function(callback) {
                setTimeout(function() {
                    callback(self.value);
                }, 0);
            },
            ifError: emptyFn,
            ifCanceled: emptyFn,
            cancel: emptyFn
        }, _state = defaultState;
        self.value = null, self.error = null, self.isComplete = !1, self.then = function(callback) {
            return _state.get(), _state.then(callback), self;
        }, self.success = function(callback) {
            return _state.get(), _state.then(callback), self;
        }, self.ifError = function(callback) {
            return _state.get(), _state.ifError(callback), self;
        }, self.error = function(callback) {
            return _state.get(), _state.ifError(callback), self;
        }, self["catch"] = function(callback) {
            return _state.get(), _state.ifError(callback), self;
        }, self.ifCanceled = function(callback) {
            return _state.get(), _state.ifCanceled(callback), self;
        }, self.cancel = function() {
            return _state.cancel(), self;
        };
    }, Expression = function(name) {
        var self = this;
        assertInstance(Expression, self), self.name = name;
    };
    !function() {
        Expression.getExpressionType = function(value) {
            return value instanceof Expression ? value : "string" == typeof value ? Expression.string(value) : "function" == typeof value ? Expression["function"](value) : "number" == typeof value ? Expression.number(value) : "boolean" == typeof value ? Expression["boolean"](value) : null === value ? Expression["null"](value) : "undefined" == typeof value ? Expression.undefined(value) : Array.isArray(value) ? Expression.array(value) : value instanceof Date ? Expression.date(value) : Expression.object(value);
        }, Expression.property = function(value) {
            return new ValueExpression("property", value);
        }, Expression.constant = function(value) {
            return new ValueExpression("constant", value);
        }, Expression["boolean"] = function(value) {
            var expression = new ValueExpression("boolean");
            return expression.value = value, expression;
        }, Expression.string = function(value) {
            var expression = new ValueExpression("string");
            return expression.value = value, expression;
        }, Expression.number = function(value) {
            var expression = new ValueExpression("number");
            return expression.value = value, expression;
        }, Expression.object = function(value) {
            var expression = new ValueExpression("object");
            return expression.value = value, expression;
        }, Expression.date = function(value) {
            var expression = new ValueExpression("date");
            return expression.value = value, expression;
        }, Expression["function"] = function(value) {
            var expression = new ValueExpression("function");
            return expression.value = value, expression;
        }, Expression["null"] = function(value) {
            var expression = new ValueExpression("null");
            return expression.value = value, expression;
        }, Expression.undefined = function(value) {
            var expression = new ValueExpression("undefined");
            return expression.value = value, expression;
        }, Expression.array = function(value) {
            var expression = new ValueExpression("array");
            return expression.value = value, expression;
        }, Expression.equal = function() {
            var expression = new ComplexExpression("equal");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.any = function() {
            var expression = new ComplexExpression("any");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.notEqual = function() {
            var expression = new ComplexExpression("notEqual");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.or = function() {
            var expression = new ComplexExpression("or");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                void 0 != arg && expression.children.push(arg);
            }), expression;
        }, Expression.and = function() {
            var expression = new ComplexExpression("and");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                void 0 != arg && expression.children.push(arg);
            }), expression;
        }, Expression.where = function() {
            var expression = new ComplexExpression("where");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.greaterThan = function() {
            var expression = new ComplexExpression("greaterThan");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.lessThan = function() {
            var expression = new ComplexExpression("lessThan");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.greaterThanOrEqual = function() {
            var expression = new ComplexExpression("greaterThanOrEqual");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.lessThanOrEqual = function() {
            var expression = new ComplexExpression("lessThanOrEqual");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.orderBy = function() {
            var expression = new ComplexExpression("orderBy");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.descending = function() {
            var expression = new ComplexExpression("descending");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.ascending = function() {
            var expression = new ComplexExpression("ascending");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.skip = function() {
            var expression = new ComplexExpression("skip");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.take = function() {
            var expression = new ComplexExpression("take");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.toGuid = function() {
            var expression = new ComplexExpression("toGuid");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.substring = function() {
            var expression = new ComplexExpression("substring");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.substringOf = function() {
            var expression = new ComplexExpression("substringOf");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.startsWith = function() {
            var expression = new ComplexExpression("startsWith");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.endsWith = function() {
            var expression = new ComplexExpression("endsWith");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.expand = function() {
            var expression = new ComplexExpression("expand");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.select = function() {
            var expression = new ComplexExpression("select");
            return Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
                expression.children.push(arg);
            }), expression;
        }, Expression.count = function() {
            var expression = new ComplexExpression("count");
            return expression;
        };
    }();
    var ValueExpression = function(name, value) {
        var self = this;
        assertInstance(ValueExpression, self), Expression.call(self, name), self.value = value || null, 
        self.copy = function() {
            return new ValueExpression(name, value);
        };
    };
    extend(ValueExpression, Expression);
    var ComplexExpression = function(name) {
        var self = this;
        assertInstance(ComplexExpression, self), Expression.call(self, name);
        var children = Array.prototype.slice.call(arguments, 1);
        self.children = children, self.copy = function() {
            var expression = new ComplexExpression(name);
            return children.forEach(function(childExpression) {
                expression.children.push(childExpression);
            }), expression;
        };
    };
    extend(ComplexExpression, Expression);
    var ExpressionBuilder = function(Type, namespace, structure) {
        var self = this;
        assertInstance(ExpressionBuilder, self), namespace = namespace || "";
        Expression.getExpressionType;
        self.equals = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value);
            return Expression.equal(property, constant);
        }, self.any = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value), type = new ExpressionBuilder(Type, void 0, structure);
            return Expression.any(property, constant, type);
        }, self.notEqualTo = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value);
            return Expression.notEqual(property, constant);
        }, self.greaterThan = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value);
            return Expression.greaterThan(property, constant);
        }, self.lessThan = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value);
            return Expression.lessThan(property, constant);
        }, self.greaterThanOrEqualTo = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value);
            return Expression.greaterThanOrEqual(property, constant);
        }, self.lessThanOrEqualTo = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value);
            return Expression.lessThanOrEqual(property, constant);
        }, self.substring = function(value) {
            return Expression.equal(Expression.substring(Expression.property(namespace)), Expression.getExpressionType(value));
        }, self.substringOf = function(value) {
            return Expression.substringOf(Expression.property(namespace), Expression.string(value));
        }, self.startsWith = function(value) {
            return Expression.startsWith(Expression.property(namespace), Expression.string(value));
        }, self.endsWith = function(value) {
            return Expression.endsWith(Expression.property(namespace), Expression.string(value));
        }, self.count = function() {
            return Expression.count(Expression.property(namespace));
        };
        var mapping;
        mapping = "function" == typeof Type ? new Type() : Type;
        for (var property in mapping) !function(property) {
            Object.defineProperty(self, property, {
                get: function() {
                    var ChildType;
                    if (null === mapping[property] || "undefined" == typeof mapping[property]) ChildType = Object; else if ("function" == typeof Type) ChildType = mapping[property].constructor; else if (ChildType = mapping[property], 
                    -1 !== ChildType.Type.indexOf("[]")) {
                        var arrayTypeString = ChildType.Type.replace("[]", "");
                        ChildType = structure[arrayTypeString];
                    } else void 0 !== structure[ChildType.Type] && (ChildType = structure[ChildType.Type]);
                    var expressionBuilder = new ExpressionBuilder(ChildType, (namespace ? namespace + "." : "") + property, structure);
                    return expressionBuilder;
                },
                enumerable: !0
            });
        }(property);
        return self.toString = function() {
            return namespace;
        }, self;
    };
    Object.defineProperties(ExpressionBuilder, {
        and: {
            enumerable: !1,
            configurable: !1,
            value: function() {
                return Expression.and.apply(Expression, arguments);
            }
        },
        or: {
            enumerable: !1,
            configurable: !1,
            value: function() {
                return Expression.or.apply(Expression, arguments);
            }
        }
    });
    var Queryable = function(Type, expression, Schema) {
        var self = this;
        expression = expression || {}, assertInstance(Queryable, self);
        var _Type = Type || Object, _provider = (Schema || Object, null);
        Object.defineProperties(self, {
            Type: {
                enumerable: !1,
                get: function() {
                    return _Type;
                },
                set: function(value) {
                    value !== _Type && (_Type = value);
                }
            },
            provider: {
                enumerable: !1,
                get: function() {
                    return _provider;
                },
                set: function(value) {
                    value !== _provider && (_provider = value);
                }
            },
            expression: {
                enumerable: !1,
                get: function() {
                    return {
                        where: _whereExpression,
                        take: _takeExpression,
                        skip: _skipExpression,
                        count: _countExpression,
                        orderBy: 0 === _orderByExpression.length ? null : Expression.orderBy.apply(Expression, _orderByExpression),
                        expand: 0 === _expandExpression.length ? null : Expression.expand.apply(Expression, _expandExpression),
                        select: 0 === _selectExpression.length ? null : Expression.select.apply(Expression, _selectExpression)
                    };
                }
            }
        });
        var _whereExpression = expression.where || null;
        self.where = function(fn) {
            fn = fn || function() {};
            var expression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, void 0, Schema));
            if (!(expression instanceof Expression)) return self;
            if (null !== _whereExpression) throw new Error('Cannot call "where" twice.');
            return _whereExpression = Expression.where(expression), self;
        }, self.or = function(fn) {
            var rightExpression;
            fn instanceof Expression ? rightExpression = Expression.or.apply(Expression, arguments) : (fn = fn || function() {}, 
            rightExpression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, void 0, Schema)));
            var whereExpression, copy = createCopy(expression);
            if (_whereExpression) {
                var expressions = _whereExpression.copy();
                expressions.push(rightExpression), whereExpression = Expression.where(Expression.or.apply(Expression, expressions));
            } else whereExpression = Expression.where(rightExpression);
            return copy.expression.where = whereExpression, self;
        }, self.and = function(fn) {
            fn instanceof Expression ? rightExpression = Expression.and.apply(Expression, arguments) : (fn = fn || function() {}, 
            rightExpression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, void 0, Schema)));
            var whereExpression, copy = createCopy(expression);
            if (_whereExpression) {
                var expressions = _whereExpression.copy();
                expressions.push(rightExpression), whereExpression = Expression.where(Expression.and.apply(Expression, expressions));
            } else whereExpression = Expression.where(rightExpression);
            return copy.expression.where = whereExpression, copy;
        };
        var _takeExpression = expression.take || null;
        self.take = function(value) {
            var expression = {};
            Object.keys(self.expression).forEach(function(key) {
                var value = self.expression[key];
                value ? expression[key] = value.copy() : expression[key] = null;
            }), value && (expression.take = Expression.take(Expression.number(value)));
            var copy = createCopy(expression);
            return copy;
        };
        var _skipExpression = expression.skip || null;
        self.skip = function(value) {
            var expression = {};
            Object.keys(self.expression).forEach(function(key) {
                var value = self.expression[key];
                value ? expression[key] = value.copy() : expression[key] = null;
            }), value && (expression.skip = Expression.skip(Expression.number(value)));
            var copy = createCopy(expression);
            return copy;
        };
        var _orderByExpression = expression.orderBy ? expression.orderBy.children : [];
        self.orderByDesc = function(fn) {
            fn = fn || function() {};
            var expression = {};
            Object.keys(self.expression).forEach(function(key) {
                var value = self.expression[key];
                value ? expression[key] = value.copy() : expression[key] = null;
            });
            var orderBy = {
                children: []
            };
            _orderByExpression.forEach(function(expression) {
                orderBy.children.push(expression.copy());
            });
            var result = fn.call(self, new ExpressionBuilder(Type, void 0, Schema));
            result && orderBy.children.push(Expression.descending(Expression.property(result.toString()))), 
            expression.orderBy = orderBy;
            var copy = createCopy(expression);
            return copy;
        }, self.order = function(obj) {
            obj = obj || {};
            var isAsc, prop;
            for (var i in obj) if (obj.hasOwnProperty(i) && "function" != typeof i) {
                isAsc = "asc" == obj[i], prop = i;
                break;
            }
            return void 0 == isAsc ? self : isAsc ? self.orderBy(function(value) {
                var properties = prop.split(".");
                return properties.forEach(function(item) {
                    void 0 !== value[item] && (value = value[item]);
                }), value;
            }) : self.orderByDesc(function(value) {
                var properties = prop.split(".");
                return properties.forEach(function(item) {
                    void 0 !== value[item] && (value = value[item]);
                }), value;
            });
        }, self.orderBy = function(fn) {
            fn = fn || function() {};
            var expression = {};
            Object.keys(self.expression).forEach(function(key) {
                var value = self.expression[key];
                value ? expression[key] = value.copy() : expression[key] = null;
            });
            var orderBy = {
                children: []
            };
            _orderByExpression.forEach(function(expression) {
                orderBy.children.push(expression.copy());
            });
            var result = fn.call(self, new ExpressionBuilder(Type, void 0, Schema));
            result && orderBy.children.push(Expression.ascending(Expression.property(result.toString()))), 
            expression.orderBy = orderBy;
            var copy = createCopy(expression);
            return copy;
        };
        var _expandExpression = expression.expand ? expression.expand.children : [];
        self.expand = function(fn) {
            fn = fn || function() {};
            var expression = {};
            Object.keys(self.expression).forEach(function(key) {
                var value = self.expression[key];
                value ? expression[key] = value.copy() : expression[key] = null;
            });
            var expand = {
                children: []
            };
            _expandExpression.forEach(function(expression) {
                expand.children.push(expression.copy());
            });
            var property = fn.call(self, new ExpressionBuilder(Type, void 0, Schema));
            if (property) {
                var property2 = Expression.property(property.toString());
                expand.children.push(property2);
            }
            expression.expand = expand;
            var copy = createCopy(expression);
            return copy;
        }, self.toGuid = function(value) {
            return Expression.guid(Expression.constant(value));
        };
        self.toArray = function() {
            return _provider.execute(self);
        };
        var _countExpression = expression.count || null;
        self.count = function(inline) {
            if (inline) {
                var expression = {};
                Object.keys(self.expression).forEach(function(key) {
                    var value = self.expression[key];
                    value ? expression[key] = value.copy() : expression[key] = null;
                }), expression.count = Expression.count();
                var copy = createCopy(expression);
                return copy;
            }
            return _provider.count(self);
        }, self.all = function(func) {
            return _provider.all(self, func);
        }, self.any = function(func) {
            return _provider.any(self, func);
        }, self.firstOrDefault = function(func) {
            return _provider.firstOrDefault(self, func);
        }, self.lastOrDefault = function(func) {
            return _provider.lastOrDefault(self, func);
        }, self.first = function(func) {
            return _provider.first(self, func);
        }, self.last = function(func) {
            return _provider.last(self, func);
        };
        var _selectExpression = expression.select ? expression.select.children : [];
        self.select = function(fn) {
            fn = fn || function() {};
            var expression = {};
            Object.keys(self.expression).forEach(function(key) {
                var value = self.expression[key];
                value ? expression[key] = value.copy() : expression[key] = null;
            });
            var select = {
                children: []
            };
            _selectExpression.forEach(function(expression) {
                select.children.push(expression.copy());
            });
            var property = fn.call(self, new ExpressionBuilder(Type, void 0, Schema));
            if (property) {
                var property2 = Expression.property(property.toString());
                select.children.push(property2);
            }
            expression.select = select;
            var copy = createCopy(expression);
            return copy;
        }, self.contains = function(item) {
            return _provider.contains(self, item);
        };
        self.intersects = function(compareToQueryable) {
            return compareToQueryable instanceof Array && (compareToQueryable = compareToQueryable.asQueryable()), 
            _provider.intersects(self, compareToQueryable);
        }, self.ofType = function(Type) {
            var queryable = new Queryable(Type);
            return queryable.provider = _provider, queryable;
        };
        var createCopy = function(expression) {
            var queryable = new Queryable(Type, expression, Schema);
            return queryable.provider = self.provider, queryable;
        };
        return self.copy = function() {
            return createCopy(self.expression);
        }, self.merge = function(queryable) {
            var whereChildren = queryable.expression.where.children, rightExpression = Expression.and.apply(Expression, whereChildren);
            if (_whereExpression) {
                var expressions = _whereExpression.children;
                expressions.push(rightExpression), _whereExpression = Expression.where(Expression.and.apply(Expression, expressions));
            } else _whereExpression = Expression.where(rightExpression);
            return self;
        }, self;
    }, ExpressionParser = function(queryVisitor) {
        var self = this;
        return assertInstance(ExpressionParser, self), self.queryVisitor = queryVisitor || {}, 
        self.parse = function(expression) {
            if (!expression) return null;
            var children = [];
            expression.children.forEach(function(expression) {
                expression.children ? children.push(self.parse(expression)) : children.push(expression);
            });
            var func = self.queryVisitor[expression.name];
            if (!func) throw new Error("The visitor doesn't support the \"" + expression.name + '" expression.');
            return children.forEach(function(child, index) {
                if (child instanceof Expression) {
                    var func = self.queryVisitor[child.name];
                    if (!func) throw new Error("The visitor doesn't support the \"" + child.name + '" expression.');
                    children[index] = func.call(self.queryVisitor, child, children);
                }
            }), func.apply(self.queryVisitor, children);
        }, self;
    }, ODataQueryVisitor = function() {
        var self = this;
        return assertInstance(ODataQueryVisitor, self), self.toServiceNamespace = function(value) {
            value = value || "";
            var array = value.split("."), newArray = [];
            return array.forEach(function(name) {
                newArray.push(name.substr(0, 1).toUpperCase() + name.substring(1));
            }), newArray.join(".");
        }, self["function"] = function(value, children) {
            var result = value.value(children[2]);
            return children.splice(2), result;
        }, self.ascending = function(namespace) {
            return namespace + " asc";
        }, self.descending = function(namespace) {
            return namespace + " desc";
        }, ODataQueryVisitor.prototype.orderBy = function() {
            var result = Array.prototype.slice.call(arguments, 0);
            return "&$orderby=" + replaceDotWithSlash(result.join(", "));
        }, ODataQueryVisitor.prototype.count = function(left, right) {
            return "&$count=true";
        }, ODataQueryVisitor.prototype.where = function() {
            var self = this;
            return "&$filter=" + self.and.apply(self.parsers, arguments);
        }, ODataQueryVisitor.prototype.any = function() {
            var self = this, property = arguments[0].replace(".0", ""), propertyValue = arguments[1].children, valueType = propertyValue[1].name, values = (arguments[1].name || "equal", 
            propertyValue[1].value), anyString = "{0}/any(u: u/{1}".format(property, propertyValue[0].value), args = [], method = arguments[1].name;
            Array.isArray(values) || (values = [ values ]), values.forEach(function(value, index) {
                args.push(self[method].apply(self, [ anyString, value ]) + ")");
            });
            var value;
            if ("array" == valueType) return value = 1 === args.length ? args[0] : self.or.apply(self, args);
            var propertyValue = arguments[1].children, methodname = arguments[1].name || "equal", values = propertyValue[1].value, valString = "u/{0}".format(propertyValue[0].value), args = [];
            Array.isArray(values) || (values = [ values ]), values.forEach(function(value, index) {
                args.push(self[methodname].apply(self, [ valString, value ]));
            });
            var value;
            value = 1 === args.length ? args[0] : self.or.apply(self, args);
            var anyString = "{0}/any(u: {1})".format(property, value);
            return anyString;
        }, ODataQueryVisitor.prototype.and = function() {
            var children = Array.prototype.slice.call(arguments, 0), result = [];
            children.forEach(function(expression, index) {
                result.push(expression), index !== children.length - 1 && result.push(" and ");
            });
            var joined = result.join("");
            return "" === joined ? "" : "(" + joined + ")";
        }, ODataQueryVisitor.prototype.or = function() {
            var children = Array.prototype.slice.call(arguments, 0), result = [];
            children.forEach(function(expression, index) {
                result.push(expression), index !== children.length - 1 && result.push(" or ");
            });
            var joined = result.join("");
            return "" === joined ? "" : "(" + joined + ")";
        }, ODataQueryVisitor.prototype.equal = function(left, right) {
            var self = this;
            return "" === right || -1 != right.indexOf(" eq ") ? right : (isValidGuid(right) && (right = self.guid.apply(self.parsers, arguments)), 
            "(" + replaceDotWithSlash(left) + " eq " + right + ")");
        }, ODataQueryVisitor.prototype.notEqual = function(left, right) {
            var self = this;
            return isValidGuid(right) && (right = self.guid.apply(self.parsers, arguments)), 
            "(" + replaceDotWithSlash(left) + " ne " + right + ")";
        }, ODataQueryVisitor.prototype.constant = function(expression) {
            return expression.value;
        }, ODataQueryVisitor.prototype.property = function(expression) {
            return this.toServiceNamespace(expression.value);
        }, ODataQueryVisitor.prototype.guid = function(name, value) {
            return value.match(/^(\')+[0-9a-fA-F-]+(\')+$/) ? value.replace(/'/g, "") : value;
        }, ODataQueryVisitor.prototype.substring = function(namespace, startAt, endAt) {
            return "substring(" + namespace + " " + (startAt ? "," + startAt : ",0") + " " + (endAt ? "," + endAt : "") + ")";
        }, ODataQueryVisitor.prototype.substringOf = function(namespace, value) {
            var self = this;
            return "string" == typeof value && -1 === value.indexOf("'") && (value = self.string.apply(self, [ {
                value: value
            } ])), "contains(" + replaceDotWithSlash(namespace) + "," + value + ")";
        }, ODataQueryVisitor.prototype.startsWith = function(namespace, value) {
            return "startswith(" + namespace + "," + value + ")";
        }, ODataQueryVisitor.prototype.expand = function(namespace, value) {
            var result = Array.prototype.slice.call(arguments, 0);
            return result = replaceDotWithInnerKeys(result.join(","), "$expand"), "&$expand=" + result;
        }, ODataQueryVisitor.prototype.select = function(namespace, value) {
            var result = Array.prototype.slice.call(arguments, 0);
            return result = replaceDotWithSlash(result.join(",")), "&$select=" + result;
        }, ODataQueryVisitor.prototype.endsWith = function(namespace, value) {
            return "endswith(" + namespace + "," + value + ")";
        }, ODataQueryVisitor.prototype["null"] = function(value) {
            return "null";
        }, ODataQueryVisitor.prototype.undefined = function(value) {
            return "undefined";
        }, ODataQueryVisitor.prototype.date = function(expression) {
            return JSON.stringify(expression.value).replace(/"/g, "");
        }, ODataQueryVisitor.prototype.string = function(expression) {
            return "'" + (expression.value || "").replace("'", "''") + "'";
        }, ODataQueryVisitor.prototype.number = function(expression) {
            return expression.value.toString();
        }, ODataQueryVisitor.prototype["boolean"] = function(expression) {
            return expression.value.toString();
        }, ODataQueryVisitor.prototype.array = function(array, expression) {
            var self = this, prop = expression[0], values = array.value, args = [];
            if (values.forEach(function(value, index) {
                args.push(self.equal.apply(self, [ prop, value ]));
            }), 1 == args.length) return args[0];
            var ands = self.or.apply(self, args);
            return ands;
        }, ODataQueryVisitor.prototype.greaterThan = function(left, right) {
            return "(" + left.replace(".", "/") + " gt " + right + ")";
        }, ODataQueryVisitor.prototype.lessThan = function(left, right) {
            "string" == typeof right.value ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " lt " + right + ")";
        }, ODataQueryVisitor.prototype.greaterThanOrEqual = function(left, right) {
            "string" == typeof right.value ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " ge " + right + ")";
        }, ODataQueryVisitor.prototype.lessThanOrEqual = function(left, right) {
            "string" == typeof right.value ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " le " + right + ")";
        }, ODataQueryVisitor.prototype.not = function(left, right) {
            "string" == typeof right.value ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " not " + right + ")";
        }, ODataQueryVisitor.prototype.skip = function(value) {
            return "&$skip=" + value;
        }, ODataQueryVisitor.prototype.take = function(value) {
            return "&$top=" + value;
        }, self;
    }, OData = {
        toString: function(queryable) {
            var visitor = new ODataQueryVisitor(), parser = new ExpressionParser(visitor), where = parser.parse(queryable.expression.where) || "", orderBy = parser.parse(queryable.expression.orderBy) || "", skip = parser.parse(queryable.expression.skip) || "", take = parser.parse(queryable.expression.take) || "", count = parser.parse(queryable.expression.count) || "", expand = parser.parse(queryable.expression.expand) || "", select = parser.parse(queryable.expression.select) || "";
            return where + "" + orderBy + skip + take + count + expand + select;
        }
    }, metadata = function() {
        function create(metadata, item) {
            var key = getKeyByValue(metadata, item), nodeTree = [], node = {
                key: key,
                siblings: [],
                parent: null
            };
            return nodeTree.push(node), parseMetadataToObject(metadata, key, nodeTree, node);
        }
        function createSchema() {
            var result = {}, metadata = arguments[0];
            for (i = 1; i < arguments.length; i++) {
                var item = arguments[i];
                result[getKeyByValue(metadata, item)] = item;
            }
            return result;
        }
        function parseMetadataToObject(metadata, key, nodeTree, parent) {
            if (hasSameParent(parent, key)) return "{circular: " + key + "}";
            var node = {
                key: key,
                siblings: [],
                parent: parent
            };
            parent.siblings.push(node);
            var item = metadata[key];
            void 0 == item && console.log("Object not found in Metadata: " + key);
            var type = _.extend({}, item);
            return Object.keys(type).forEach(function(field) {
                "Id" == field ? type[field] = "00000000-0000-0000-0000-000000000000" : type[field] = getValueBasedOnType(metadata, type, field, nodeTree, node);
            }), type;
        }
        function hasSameParent(node, key) {
            return void 0 == node.parent ? !1 : node.parent.key == key ? !0 : hasSameParent(node.parent, key);
        }
        function getValueBasedOnType(metadata, type, field, nodes, node) {
            var fieldType = type[field].Type;
            switch (fieldType) {
              case "DateTime?":
                return null;

              case "DateTime":
                return new Date();

              case "Guid?":
                return null;

              case "Guid":
                return null;

              case "String":
                return null;

              case "Boolean":
                return !1;

              case "Boolean?":
                return null;

              case "Decimal?":
                return null;

              case "Decimal":
                return 0;

              case "Int32?":
                return null;

              case "Int32":
                return 0;

              case "Int64?":
                return null;

              case "Int64":
                return 0;

              case "DateTimeOffset?":
                return null;

              case "DateTimeOffset":
                return new Date();

              case "Object":
                return null;

              case "T":
                return null;

              default:
                if (-1 !== fieldType.indexOf("[]")) return [];
                var matches = fieldType.match(/<(.*)>/);
                return matches && matches.length > 0 ? parseMetadataToObject(metadata, matches[1], nodes, node) : parseMetadataToObject(metadata, type[field].Type, nodes, node);
            }
            return null;
        }
        function getKeyByValue(object, key) {
            for (var prop in object) if (object.hasOwnProperty(prop) && object[prop] === key) return prop;
            return void 0;
        }
        return {
            create: create,
            createFilteredSchema: createSchema
        };
    }, QueryProvider = function() {
        var self = this;
        self.count = function(queryable) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    setValue(array.length);
                });
            });
        }, self.any = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array, 
                    setValue(results.length > 0 ? !0 : !1);
                });
            });
        }, self.all = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array, 
                    setValue(results.length === array.length);
                });
            });
        }, self.firstOrDefault = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array, 
                    setValue(results[0] || null);
                });
            });
        }, self.lastOrDefault = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array, 
                    setValue(results[results.length - 1] || null);
                });
            });
        }, self.first = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array;
                    var result = results[0];
                    result ? setValue(result) : setError(new Error("Couldn't find a match."));
                });
            });
        }, self.last = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array;
                    var result = results[results.length - 1];
                    result ? setValue(result) : setError(new Error("Couldn't find a match."));
                });
            });
        }, self.contains = function(queryable, func) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var results, visitor = new ArrayQueryVisitor(array), parser = new ExpressionParser(visitor);
                    results = "function" == typeof func ? parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type))) : array, 
                    setValue(results > 0);
                });
            });
        }, self.select = function(queryable, forEachFunc) {
            return new Future(function(setValue, setError) {
                self.toArray(queryable).then(function(array) {
                    var objects = [];
                    array.forEach(function(item) {
                        objects.push(forEachFunc(item));
                    }), setValue(objects);
                });
            });
        }, self.intersects = function(queryable, compareToQueryable) {
            return new Future(function(setValue, setError) {
                var task = new BASE.async.Task();
                task.add(self.toArray(queryable)), task.add(compareToQueryable.toArray()), task.start().whenAll(function(futures) {
                    var intersects = [], array1 = futures[0].value, array2 = futures[1].value;
                    array1.forEach(function(item) {
                        array2.indexOf(item) > -1 && intersects.push(item);
                    }), setValue(intersects);
                });
            });
        }, self.toArray = function(queryable) {
            return new BASE.async.Future(function(setValue, setError) {
                setTimeout(function() {
                    setValue([]);
                }, 0);
            });
        }, self.execute = self.toArray;
    };
    BoostJS.Observable = Observable, BoostJS.Future = Future, BoostJS.Expression = Expression, 
    BoostJS.ExpressionBuilder = ExpressionBuilder, BoostJS.Queryable = Queryable, BoostJS.ExpressionParser = ExpressionParser, 
    BoostJS.ODataQueryVisitor = ODataQueryVisitor, BoostJS.OData = OData, BoostJS.Metadata = metadata(), 
    BoostJS.QueryProvider = QueryProvider, BoostJS.extend = extend;
    var config = {
        endpoint: "/",
        odata: "/odata/"
    };
    angular.module("LinqToOdata", []).constant("config", config).factory("ODataProvider", [ "$http", "$q", "config", function($http, $q, config) {
        var ODataProvider = function() {
            var self = this;
            self.cache = void 0;
            var Types = [], endPoints = [];
            BoostJS.QueryProvider.call(self), self.execute = self.toArray = function(queryable) {
                var uri, deferred = $q.defer(), Type = queryable.Type, index = Types.indexOf(Type);
                if (index >= 0 && (uri = endPoints[index]), !uri) throw new Error("Provider doesn't support querying that Type.");
                var odataString = BoostJS.OData.toString(queryable), url = uri + "?" + odataString;
                return void 0 !== self.cache && self.cache.get(url) ? deferred.resolve(self.cache.get(url)) : $http.get(url).success(function(response, status, headers, config) {
                    var result = [];
                    return 418 == status || 0 == status ? void deferred.reject(result) : (result.total = parseInt(response["@odata.count"]), 
                    response.value.forEach(function(item) {
                        var instance = item;
                        "function" == typeof Type && (instance = new Type(), Object.keys(item).forEach(function(key) {
                            instance[key] = item[key];
                        })), result.push(instance);
                    }), void 0 !== self.cache && self.cache.put(url, result), void deferred.resolve(result));
                }).error(function(response) {
                    deferred.reject(response);
                }), deferred.promise;
            }, self.addEndPoint = function(path, Type, baseUri) {
                Types.push(Type), endPoints.push(path + baseUri);
            }, self.removeEndPoint = function(Type) {
                var index = Types.indexOf(Type);
                index >= 0 && (Types.splice(index, 1), endPoints.splice(index, 1));
            };
        };
        return BoostJS.extend(ODataProvider, BoostJS.QueryProvider), {
            queriable: function(schema, Type, uriPath, cache) {
                var provider = new ODataProvider();
                provider.addEndPoint(config.odata, Type, uriPath), provider.cache = cache;
                var query = new BoostJS.Queryable(Type, void 0, schema);
                return query.provider = provider, query = query.count(!0);
            },
            queriableTest: function(Type, uriPath, cache) {
                var provider = new ODataProvider();
                provider.addEndPoint(config.odataTest, Type, uriPath);
                var query = new BoostJS.Queryable(Type);
                return query.provider = provider, query = query.count(!0);
            }
        };
    } ]);
}(window.BoostJS = {}, window.angular);