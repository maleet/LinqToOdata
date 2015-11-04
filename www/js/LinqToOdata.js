// https://github.com/jaredjbarnes/Queryable
// http://thejavascriptninja.blogspot.com/
(function () {

    // First, checks if it isn't implemented yet.
    if (!String.prototype.format) {
        String.prototype.format = function () {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function (match, number) {
                return typeof args[number] != 'undefined'
                    ? args[number]
                    : match
                    ;
            });
        };
    }

    var extend = function (d, b) {
        function __() {
            this.constructor = d;
        }

        __.prototype = b.prototype;
        d.prototype = new __();
    };

    var emptyFn = function () {
    };

    var assertInstance = function (Type, instance) {
        if (!(instance instanceof Type)) {
            throw new Error("Constructor run in the context of the window.");
        }
    };

    var isValidGuid = function (value) {
        var validGuid = /^(\{|\(|\')?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}(\}|\)|\')?$/;
        var emptyGuid = /^(\{|\(|\')?0{8}-(0{4}-){3}0{12}(\}|\)|\')?$/;
        return validGuid.test(value) && !emptyGuid.test(value);
    };

    function replaceDotWithSlash(str) {
        return str.replace(/\./g, '/');
    }

    var getObject = function (namespace, scope) {
        scope = typeof scope === "undefined" ? (function () {
            return this;
        }()) : scope;

        if (namespace === "") {
            return scope;
        }

        if (typeof namespace === "string") {
            var a = namespace.split('.');
            var length = a.length;
            var tmpObj;

            for (var x = 0; x < length; x++) {
                if (x === 0) {
                    if (typeof scope[a[0]] === 'undefined') {
                        return undefined;
                    } else {
                        tmpObj = scope[a[0]];
                    }
                } else {
                    if (typeof tmpObj[a[x]] === 'undefined') {
                        return undefined;
                    } else {
                        tmpObj = tmpObj[a[x]];
                    }
                }
            }
            return tmpObj;
        } else {
            return undefined;
        }
    };

    var Observable = function () {
        var self = this;

        assertInstance(Observable, self);

        var _listeners = {};

        self.observe = function (eventName, callback) {
            if (!_listeners[eventName]) {
                _listeners[eventName] = [];
            }

            _listeners[eventName].push(callback);
            return self;
        };

        self.unobserve = function (eventName, callback) {
            var listeners = _listeners[eventName] || [];

            var index = listeners.indexOf(callback);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
            return self;
        };

        self.notify = function (event) {
            var listeners = _listeners[event.type] || [];

            listeners.forEach(function (callback) {
                callback(event);
            });
            return self;
        };
    };

    var Future = function (getValue) {
        var self = this;

        assertInstance(Future, self);

        var observers = new Observable();

        var defaultState = {
            get: function () {
                _state = retrievingState;
                getValue(function (value) {
                    if (_state === retrievingState) {
                        self.isComplete = true;
                        self.value = value;
                        _state = completeState;
                        observers.notify({type: "then", value: value});
                    }
                }, function (error) {
                    if (_state === retrievingState) {
                        self.isComplete = true;
                        self.error = error;
                        _state = errorState;
                        observers.notify({type: "ifError", error: error});
                    }
                });
            },
            then: function (callback) {
                var listener = function (e) {
                    callback(e.value);
                };
                observers.observe("then", listener);
            },
            ifError: function (callback) {
                var listener = function (e) {
                    callback(e.error);
                };
                observers.observe("ifError", listener);
            },
            ifCanceled: function (callback) {
                var listener = function (e) {
                    callback();
                };

                observers.observe("ifCanceled", listener);
            },
            cancel: function () {
                self.isComplete = true;
                _state = canceledState;
                observers.notify({type: "ifCanceled"});
            }
        };

        var retrievingState = {
            get: emptyFn,
            then: defaultState.then,
            ifError: defaultState.ifError,
            ifCanceled: defaultState.ifCanceled,
            cancel: defaultState.cancel
        };

        var errorState = {
            get: emptyFn,
            then: emptyFn,
            ifError: function (callback) {
                setTimeout(function () {
                    callback(self.error);
                }, 0);
            },
            ifCanceled: emptyFn,
            cancel: emptyFn
        };

        var canceledState = {
            get: emptyFn,
            then: emptyFn,
            ifError: emptyFn,
            ifCanceled: function (callback) {
                setTimeout(function () {
                    callback();
                }, 0);
            },
            cancel: emptyFn
        };

        var completeState = {
            get: emptyFn,
            then: function (callback) {
                setTimeout(function () {
                    callback(self.value);
                }, 0);
            },
            ifError: emptyFn,
            ifCanceled: emptyFn,
            cancel: emptyFn
        };

        var _state = defaultState;

        self.value = null;
        self.error = null;
        self.isComplete = false;

        self.then = function (callback) {
            _state.get();
            _state.then(callback);
            return self;
        };
        self.ifError = function (callback) {
            _state.get();
            _state.ifError(callback);
            return self;
        };
        self.ifCanceled = function (callback) {
            _state.get();
            _state.ifCanceled(callback);
            return self;
        };
        self.cancel = function () {
            _state.cancel();
            return self;
        };

    };

    var Expression = function (name) {
        var self = this;

        assertInstance(Expression, self);
        self.name = name;
    };

    (function initExpressions() {

        Expression.getExpressionType = function (value) {
            if (value instanceof Expression) {
                return value;
            }

            if (typeof value === "string") {
                return Expression.string(value);
            } else if (typeof value === "function") {
                return Expression.function(value);
            } else if (typeof value === "number") {
                return Expression.number(value);
            } else if (typeof value === "boolean") {
                return Expression.boolean(value);
            } else if (value === null) {
                return Expression["null"](value);
            } else if (typeof value === "undefined") {
                return Expression["undefined"](value);
            } else if (Array.isArray(value)) {
                return Expression.array(value);
            } else if (value instanceof Date) {
                return Expression.date(value);
            } else {
                return Expression.object(value);
            }
        };

        Expression.property = function (value) {
            return new ValueExpression("property", value);
        };

        Expression.constant = function (value) {
            return new ValueExpression("constant", value);
        };

        Expression.boolean = function (value) {
            var expression = new ValueExpression("boolean");
            expression.value = value;
            return expression;
        };

        Expression.string = function (value) {
            var expression = new ValueExpression("string");
            expression.value = value;
            return expression;
        };

        Expression.number = function (value) {
            var expression = new ValueExpression("number");
            expression.value = value;
            return expression;
        };

        Expression.object = function (value) {
            var expression = new ValueExpression("object");
            expression.value = value;
            return expression;
        };

        Expression.date = function (value) {
            var expression = new ValueExpression("date");
            expression.value = value;
            return expression;
        };

        Expression.function = function (value) {
            var expression = new ValueExpression("function");
            expression.value = value;
            return expression;
        };

        Expression["null"] = function (value) {
            var expression = new ValueExpression("null");
            expression.value = value;
            return expression;
        };

        Expression["undefined"] = function (value) {
            var expression = new ValueExpression("undefined");
            expression.value = value;
            return expression;
        };

        Expression.array = function (value) {
            var expression = new ValueExpression("array");
            expression.value = value;
            return expression;
        };

        Expression.equal = function () {
            var expression = new ComplexExpression("equal");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.any = function () {
            var expression = new ComplexExpression("any");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.notEqual = function () {
            var expression = new ComplexExpression("notEqual");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.or = function () {
            var expression = new ComplexExpression("or");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                if (arg != undefined) {
                    expression.children.push(arg);
                }
            });
            return expression;
        };

        Expression.and = function () {
            var expression = new ComplexExpression("and");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                if (arg != undefined) {
                    expression.children.push(arg);
                }
            });
            return expression;
        };

        Expression.where = function () {
            var expression = new ComplexExpression("where");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.greaterThan = function () {
            var expression = new ComplexExpression("greaterThan");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };
        Expression.lessThan = function () {
            var expression = new ComplexExpression("lessThan");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.greaterThanOrEqual = function () {
            var expression = new ComplexExpression("greaterThanOrEqual");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.lessThanOrEqual = function () {
            var expression = new ComplexExpression("lessThanOrEqual");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.orderBy = function () {
            var expression = new ComplexExpression("orderBy");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.descending = function () {
            var expression = new ComplexExpression("descending");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.ascending = function () {
            var expression = new ComplexExpression("ascending");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.skip = function () {
            var expression = new ComplexExpression("skip");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.take = function () {
            var expression = new ComplexExpression("take");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.toGuid = function () {
            var expression = new ComplexExpression("toGuid");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.substring = function () {
            var expression = new ComplexExpression("substring");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.substringOf = function () {
            var expression = new ComplexExpression("substringOf");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.startsWith = function () {
            var expression = new ComplexExpression("startsWith");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.endsWith = function () {
            var expression = new ComplexExpression("endsWith");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.expand = function () {
            var expression = new ComplexExpression("expand");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.select = function () {
            var expression = new ComplexExpression("select");
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                expression.children.push(arg);
            });
            return expression;
        };

        Expression.count = function () {
            var expression = new ComplexExpression("count");
            return expression;
        };

    })();

    var ValueExpression = function (name, value) {
        var self = this;

        assertInstance(ValueExpression, self);

        Expression.call(self, name);
        self.value = value || null;

        self.copy = function () {
            return new ValueExpression(name, value);
        };
    };
    extend(ValueExpression, Expression);

    var ComplexExpression = function (name) {
        var self = this;

        assertInstance(ComplexExpression, self);

        Expression.call(self, name);
        var children = Array.prototype.slice.call(arguments, 1);

        self.children = children;

        self.copy = function () {

            var expression = new ComplexExpression(name);
            children.forEach(function (childExpression) {
                expression.children.push(childExpression);
            });

            return expression;
        };
    };
    extend(ComplexExpression, Expression);

    var ExpressionBuilder = function (Type, namespace, structure) {
        var self = this;
        assertInstance(ExpressionBuilder, self);

        namespace = namespace || "";

        var findExpressionType = Expression.getExpressionType;

        self.equals = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            return Expression.equal(property, constant);
        };

        self.any = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            var type = new ExpressionBuilder(Type);
            return Expression.any(property, constant, type);
        };

        self.notEqualTo = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            return Expression.notEqual(property, constant);
        };

        self.greaterThan = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            return Expression.greaterThan(property, constant);
        };

        self.lessThan = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            return Expression.lessThan(property, constant);
        };

        self.greaterThanOrEqualTo = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            return Expression.greaterThanOrEqual(property, constant);
        };

        self.lessThanOrEqualTo = function (value) {
            var property = Expression.property(namespace);
            var constant = Expression.getExpressionType(value);
            return Expression.lessThanOrEqual(property, constant);
        };

        self.substring = function (value) {
            return Expression.equal(Expression.substring(Expression.property(namespace)), Expression.getExpressionType(value));
        };

        self.substringOf = function (value) {
            return Expression.substringOf(Expression.property(namespace), Expression.string(value));
        };

        self.startsWith = function (value) {
            return Expression.startsWith(Expression.property(namespace), Expression.string(value));
        }

        self.endsWith = function (value) {
            return Expression.endsWith(Expression.property(namespace), Expression.string(value));
        }

        self.count = function () {
            return Expression.count(Expression.property(namespace));
        }

        var mapping;
        if (typeof Type === "function") {
            mapping = new Type();
        } else {
            mapping = Type;
        }

        for (var property in mapping) {
            (function (property) {
                Object.defineProperty(self, property, {
                    get: function () {
                        var ChildType;
                        if (mapping[property] === null || typeof mapping[property] === "undefined") {
                            ChildType = Object;
                        } else {
                            if (typeof Type === "function") {
                                ChildType = mapping[property].constructor;
                            } else {
                                ChildType = mapping[property];
                                if (ChildType.Type.indexOf('[]') !== -1) {
                                    var arrayTypeString = ChildType.Type.replace('[]', '');
                                    ChildType = structure[arrayTypeString];
                                }
                                else if (ChildType.Type == property) {
                                    ChildType = structure[property];
                                }
                            }
                        }

                        var expressionBuilder = new ExpressionBuilder(ChildType, (namespace ? (namespace + ".") : "") + property, structure);
                        return expressionBuilder;
                    },
                    enumerable: true
                });
            }(property));
        }

        self.toString = function () {
            return namespace;
        };

        return self;
    };

    Object.defineProperties(ExpressionBuilder, {
        "and": {
            enumerable: false,
            configurable: false,
            value: function () {
                return Expression.and.apply(Expression, arguments);
            }
        },
        "or": {
            enumerable: false,
            configurable: false,
            value: function () {
                return Expression.or.apply(Expression, arguments);
            }
        }
    });

    var Queryable = function (Type, expression, structure) {
        var self = this;
        expression = expression || {};

        assertInstance(Queryable, self);

        var _Type = Type || Object;
        structure
        var _provider = null;

        Object.defineProperties(self, {
            "Type": {
                enumerable: false,
                get: function () {
                    return _Type;
                },
                set: function (value) {
                    if (value !== _Type) {
                        _Type = value;
                    }
                }
            },
            "provider": {
                enumerable: false,
                get: function () {
                    return _provider;
                },
                set: function (value) {
                    var oldValue = _provider;
                    if (value !== _provider) {
                        _provider = value;
                    }
                }
            },
            "expression": {
                enumerable: false,
                get: function () {
                    return {
                        where: _whereExpression,
                        take: _takeExpression,
                        skip: _skipExpression,
                        count: _countExpression,
                        orderBy: _orderByExpression.length === 0 ? null : Expression.orderBy.apply(Expression, _orderByExpression),
                        expand: _expandExpression.length === 0 ? null : Expression.expand.apply(Expression, _expandExpression),
                        select: _selectExpression.length === 0 ? null : Expression.select.apply(Expression, _selectExpression)
                    }
                }
            }
        });

        var _whereExpression = expression.where || null;
        self.where = function (fn) {
            fn = fn || function () {
                };
            var expression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, undefined, structure));

            if (!(expression instanceof Expression)) {
                return self;
            }

            if (_whereExpression === null) {
                _whereExpression = Expression.where(expression);
            } else {
                throw new Error("Cannot call \"where\" twice.");
            }
            return self;
        };

        self.or = function (fn) {
            var rightExpression;

            if (fn instanceof Expression) {
                rightExpression = Expression.or.apply(Expression, arguments);
            } else {
                fn = fn || function () {
                    };
                rightExpression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, undefined, structure));
            }

            var copy = createCopy(expression);
            var whereExpression;

            if (_whereExpression) {
                var expressions = _whereExpression.copy();
                expressions.push(rightExpression);

                whereExpression = Expression.where(Expression.or.apply(Expression, expressions));
            } else {
                whereExpression = Expression.where(rightExpression);
            }

            copy.expression.where = whereExpression;

            return self;
        };

        self.and = function (fn) {
            if (fn instanceof Expression) {
                rightExpression = Expression.and.apply(Expression, arguments);
            } else {
                fn = fn || function () {
                    };
                rightExpression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, undefined, structure));
            }

            var copy = createCopy(expression);
            var whereExpression;

            if (_whereExpression) {
                var expressions = _whereExpression.copy();
                expressions.push(rightExpression);

                whereExpression = Expression.where(Expression.and.apply(Expression, expressions));
            } else {
                whereExpression = Expression.where(rightExpression);
            }

            copy.expression.where = whereExpression;

            return copy;
        };

        var _takeExpression = expression.take || null;
        self.take = function (value) {
            var expression = {};
            Object.keys(self.expression).forEach(function (key) {
                var value = self.expression[key];
                if (value) {
                    expression[key] = value.copy();
                } else {
                    expression[key] = null;
                }
            });

            if (value) {
                expression.take = Expression.take(Expression.number(value));
            }

            var copy = createCopy(expression);

            return copy;
        };

        var _skipExpression = expression.skip || null;
        self.skip = function (value) {
            var expression = {};
            Object.keys(self.expression).forEach(function (key) {
                var value = self.expression[key];
                if (value) {
                    expression[key] = value.copy();
                } else {
                    expression[key] = null;
                }
            });

            if (value) {
                expression.skip = Expression.skip(Expression.number(value));
            }
            var copy = createCopy(expression);

            return copy;
        };

        var _orderByExpression = expression.orderBy ? expression.orderBy.children : [];
        self.orderByDesc = function (fn) {
            fn = fn || function () {
                };
            var expression = {};
            Object.keys(self.expression).forEach(function (key) {
                var value = self.expression[key];
                if (value) {
                    expression[key] = value.copy();
                } else {
                    expression[key] = null;
                }
            });


            var orderBy = {children: []};
            _orderByExpression.forEach(function (expression) {
                orderBy.children.push(expression.copy());
            });

            var result = fn.call(self, new ExpressionBuilder(Type));
            if (result) {
                orderBy.children.push(Expression.descending(Expression.property(result.toString())));
            }

            expression.orderBy = orderBy;

            var copy = createCopy(expression);

            return copy;
        };

        self.order = function (obj) {
            obj = obj || {};

            var isAsc;
            var prop;
            for (var i in obj) {
                if (obj.hasOwnProperty(i) && typeof(i) !== 'function') {
                    isAsc = obj[i] == 'asc';
                    prop = i;
                    break;
                }
            }

            if (isAsc == undefined) {
                return self;
            }

            if (isAsc) {
                return self.orderBy(function (value) {
                    var properties = prop.split('.');
                    var result;

                    properties.forEach(function (item) {
                        if (value[item] !== undefined) {
                            value = value[item];
                        }
                    });

                    return value;
                });
            } else {
                return self.orderByDesc(function (value) {
                    var properties = prop.split('.');
                    var result;

                    properties.forEach(function (item) {
                        if (value[item] !== undefined) {
                            value = value[item];
                        }
                    });

                    return value;
                });
            }

            return self;
        }

        self.orderBy = function (fn) {
            fn = fn || function () {
                };
            var expression = {};
            Object.keys(self.expression).forEach(function (key) {
                var value = self.expression[key];
                if (value) {
                    expression[key] = value.copy();
                } else {
                    expression[key] = null;
                }
            });

            var orderBy = {children: []};
            _orderByExpression.forEach(function (expression) {
                orderBy.children.push(expression.copy());
            });
            var result = fn.call(self, new ExpressionBuilder(Type, undefined, structure));
            if (result) {
                orderBy.children.push(Expression.ascending(Expression.property(result.toString())));
            }

            expression.orderBy = orderBy;

            var copy = createCopy(expression);

            return copy;

        };

        var _expandExpression = expression.expand ? expression.expand.children : [];
        self.expand = function (fn) {
            fn = fn || function () {
                };
            var expression = {};
            Object.keys(self.expression).forEach(function (key) {
                var value = self.expression[key];
                if (value) {
                    expression[key] = value.copy();
                } else {
                    expression[key] = null;
                }
            });

            var expand = {children: []};
            _expandExpression.forEach(function (expression) {
                expand.children.push(expression.copy());
            });
            var property = fn.call(self, new ExpressionBuilder(Type, undefined, structure));
            if (property) {
                var property2 = Expression.property(property.toString());
                expand.children.push(property2);
            }

            expression.expand = expand;

            var copy = createCopy(expression);

            return copy;

        };

        self.toGuid = function (value) {
            return Expression.guid(Expression.constant(value));
        };

        var _execute = function () {
            if (_provider === null) {
                throw new Error("The queryable needs a provider property.");
            } else {
                return _provider.execute(self.expression);
            }
        };

        self.toArray = function () {
            return _provider.execute(self);
        };

        var _countExpression = expression.count || null;
        self.count = function (inline) {
            if (inline) {
                var expression = {};
                Object.keys(self.expression).forEach(function (key) {
                    var value = self.expression[key];
                    if (value) {
                        expression[key] = value.copy();
                    } else {
                        expression[key] = null;
                    }
                });

                expression.count = Expression.count();

                var copy = createCopy(expression);

                return copy;
            }
            return _provider.count(self);
        };

        self.all = function (func) {
            return _provider.all(self, func);
        };

        self.any = function (func) {
            return _provider.any(self, func);
        };

        self.firstOrDefault = function (func) {
            return _provider.firstOrDefault(self, func);
        };

        self.lastOrDefault = function (func) {
            return _provider.lastOrDefault(self, func);
        };

        self.first = function (func) {
            return _provider.first(self, func);
        };

        self.last = function (func) {
            return _provider.last(self, func);
        };

        var _selectExpression = expression.select ? expression.select.children : [];
        self.select = function (fn) {
            fn = fn || function () {
                };
            var expression = {};
            Object.keys(self.expression).forEach(function (key) {
                var value = self.expression[key];
                if (value) {
                    expression[key] = value.copy();
                } else {
                    expression[key] = null;
                }
            });

            var select = {children: []};
            _selectExpression.forEach(function (expression) {
                select.children.push(expression.copy());
            });
            var property = fn.call(self, new ExpressionBuilder(Type, undefined, structure));
            if (property) {
                var property2 = Expression.property(property.toString());
                select.children.push(property2);
            }

            expression.select = select;

            var copy = createCopy(expression);

            return copy;
        };

        self.contains = function (item) {
            return _provider.contains(self, item);
        };

        var _include = function () {
            return _provider.include(self, item);
        };

        self.intersects = function (compareToQueryable) {
            if (compareToQueryable instanceof Array) {
                compareToQueryable = compareToQueryable.asQueryable();
            }
            return _provider.intersects(self, compareToQueryable);
        };

        self.ofType = function (Type) {
            var queryable = new Queryable(Type);
            queryable.provider = _provider;
            return queryable;
        };

        var createCopy = function (expression) {
            var queryable = new Queryable(Type, expression);
            queryable.provider = self.provider;
            return queryable;
        };

        self.copy = function () {
            return createCopy(self.expression);
        };

        self.merge = function (queryable) {
            var whereChildren = queryable.expression.where.children;
            var rightExpression = Expression.and.apply(Expression, whereChildren);
            if (_whereExpression) {
                var expressions = _whereExpression.children;
                expressions.push(rightExpression);

                _whereExpression = Expression.where(Expression.and.apply(Expression, expressions));
            } else {
                _whereExpression = Expression.where(rightExpression);
            }

            return self;
        }

        return self;
    };

    var ExpressionParser = function (queryVisitor) {
        var self = this;

        assertInstance(ExpressionParser, self);

        self.queryVisitor = queryVisitor || {};

        self.parse = function (expression) {
            if (!expression) {
                return null;
            }
            var children = [];

            expression.children.forEach(function (expression) {
                if (!expression.children) {
                    children.push(expression);
                } else {
                    children.push(self.parse(expression));
                }
            });

            var func = self.queryVisitor[expression.name];
            if (!func) {
                throw new Error("The visitor doesn't support the \"" + expression.name + "\" expression.");
            }

            children.forEach(function (child, index) {
                if (child instanceof Expression) {
                    var func = self.queryVisitor[child.name];
                    if (!func) {
                        throw new Error("The visitor doesn't support the \"" + child.name + "\" expression.");
                    }
                    children[index] = func.call(self.queryVisitor, child, children);
                }
            });
            return func.apply(self.queryVisitor, children);
        };

        return self;
    };

    var ODataQueryVisitor = function () {
        var self = this;

        assertInstance(ODataQueryVisitor, self);

        // This Uppercases the namespacing to match the c# naming conventions.
        self.toServiceNamespace = function (value) {
            value = value || '';
            var array = value.split(".");
            var newArray = [];
            array.forEach(function (name) {
                newArray.push(name.substr(0, 1).toUpperCase() + name.substring(1));
            });
            return newArray.join(".");
        };

        self.function = function (value, children) {
            var result = value.value(children[2]);
            children.splice(2);
            return result;
        };

        self.ascending = function (namespace) {
            return namespace + " asc";
        };
        self.descending = function (namespace) {
            return namespace + " desc";
        };

        ODataQueryVisitor.prototype["orderBy"] = function () {
            var result = Array.prototype.slice.call(arguments, 0);
            return "&$orderby=" + replaceDotWithSlash(result.join(", "));
        };

        ODataQueryVisitor.prototype["count"] = function (left, right) {
            return "&$inlinecount=allpages";
        };

        ODataQueryVisitor.prototype["where"] = function () {
            var self = this;
            return "&$filter=" + self["and"].apply(self.parsers, arguments);
        };

        ODataQueryVisitor.prototype['any'] = function () {
            var self = this;
            var property = arguments[0].replace('.0', '');
            var propertyValue = arguments[1].children;
            var methodname = arguments[1].name || 'equal';
            var values = propertyValue[1].value;
            var anyString = '{0}/any(u: u/{1}'.format(property, propertyValue[0].value);

            var args = [];
            if (!Array.isArray(values)) {
                values = [values];
            }
            values.forEach(function (value, index) {
                args.push(self["equal"].apply(self, [anyString, value]) + ')');
            });

            var value;
            if (args.length === 1) {
                value = args[0];

            } else {
                value = self['or'].apply(self, args);
            }

            return value;
        };

        ODataQueryVisitor.prototype["and"] = function () {
            var children = Array.prototype.slice.call(arguments, 0);
            var result = [];
            children.forEach(function (expression, index) {
                result.push(expression);
                if (index !== children.length - 1) {
                    result.push(" and ");
                }
            });

            var joined = result.join("");

            if (joined === "") {
                return "";
            }

            return "(" + joined + ")";
        };

        ODataQueryVisitor.prototype["or"] = function () {
            var children = Array.prototype.slice.call(arguments, 0);
            var result = [];
            children.forEach(function (expression, index) {
                result.push(expression);
                if (index !== children.length - 1) {
                    result.push(" or ");
                }
            });

            var joined = result.join("");

            if (joined === "") {
                return "";
            }

            return "(" + joined + ")";
        };

        ODataQueryVisitor.prototype["equal"] = function (left, right) {
            var self = this;

            if (right === '' || right.indexOf(' eq ') != -1) {
                return right;
            }
            if (isValidGuid(right)) {
                right = self["guid"].apply(self.parsers, arguments);
            }


            return "(" + replaceDotWithSlash(left) + " eq " + right + ")";
        };

        ODataQueryVisitor.prototype["notEqual"] = function (left, right) {
            var self = this;

            if (isValidGuid(right)) {
                right = self["guid"].apply(self.parsers, arguments);
            }

            return "(" + replaceDotWithSlash(left) + " ne " + right + ")";
        };

        ODataQueryVisitor.prototype["constant"] = function (expression) {
            return expression.value;
        };

        ODataQueryVisitor.prototype["property"] = function (expression) {
            return this.toServiceNamespace(expression.value);
        };

        ODataQueryVisitor.prototype["guid"] = function (name, value) {
            if (value.match(/^(\')+[0-9a-fA-F-]+(\')+$/)) {
                return "guid" + value;
            }
            return "guid'" + value.replace("'", "''") + "'";
        };

        ODataQueryVisitor.prototype["substring"] = function (namespace, startAt, endAt) {
            return "substring(" + namespace + " " + (startAt ? "," + startAt : "," + 0) + " " + (endAt ? "," + endAt : "") + ")";
        };

        ODataQueryVisitor.prototype["substringOf"] = function (namespace, value) {
            return "substringof(" + value + "," + replaceDotWithSlash(namespace) + ")";
        };

        ODataQueryVisitor.prototype["startsWith"] = function (namespace, value) {
            return "startswith(" + namespace + "," + value + ")";
        };

        ODataQueryVisitor.prototype["expand"] = function (namespace, value) {
            var result = Array.prototype.slice.call(arguments, 0);

            result = replaceDotWithSlash(result.join(","));
            return "&$expand=" + result;
        };

        ODataQueryVisitor.prototype["select"] = function (namespace, value) {
            var result = Array.prototype.slice.call(arguments, 0);

            result = replaceDotWithSlash(result.join(","));
            return "&$select=" + result;
        };

        ODataQueryVisitor.prototype["endsWith"] = function (namespace, value) {
            return "endswith(" + namespace + "," + value + ")";
        };

        ODataQueryVisitor.prototype["null"] = function (value) {
            return "null";
        };

        ODataQueryVisitor.prototype["undefined"] = function (value) {
            return "undefined";
        };

        ODataQueryVisitor.prototype["date"] = function (expression) {
            return "DateTime" + JSON.stringify(expression.value).replace(/"/g, "'") + "";
        };

        ODataQueryVisitor.prototype["string"] = function (expression) {
            return "'" + (expression.value || '').replace("'", "''") + "'";
        };

        ODataQueryVisitor.prototype["number"] = function (expression) {
            return expression.value.toString();
        };

        ODataQueryVisitor.prototype["boolean"] = function (expression) {
            return expression.value.toString();
        };

        ODataQueryVisitor.prototype["array"] = function (array, expression) {
            var self = this;
            var prop = expression[0];

            var values = array.value;

            var args = [];
            values.forEach(function (value, index) {
                args.push(self["equal"].apply(self, [prop, value]));
            });
            if (args.length == 1) {
                return args[0];
            }
            var ands = self["or"].apply(self, args);
            return ands;
        }

        ODataQueryVisitor.prototype["greaterThan"] = function (left, right) {
            return "(" + left.replace('.', '/') + " gt " + right + ")";
        };

        ODataQueryVisitor.prototype["lessThan"] = function (left, right) {
            var boundary = typeof right.value === "string" ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " lt " + right + ")";
        };

        ODataQueryVisitor.prototype["greaterThanOrEqual"] = function (left, right) {
            var boundary = typeof right.value === "string" ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " ge " + right + ")";
        };

        ODataQueryVisitor.prototype["lessThanOrEqual"] = function (left, right) {
            var boundary = typeof right.value === "string" ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " le " + right + ")";
        };

        ODataQueryVisitor.prototype["not"] = function (left, right) {
            var boundary = typeof right.value === "string" ? "'" : "";
            return "(" + replaceDotWithSlash(left) + " not " + right + ")";
        };

        ODataQueryVisitor.prototype["skip"] = function (value) {
            return "&$skip=" + value;
        };

        ODataQueryVisitor.prototype["take"] = function (value) {
            return "&$top=" + value;
        };

        return self;
    };

    var OData = {
        toString: function (queryable) {
            var visitor = new ODataQueryVisitor();
            var parser = new ExpressionParser(visitor);

            var where = parser.parse(queryable.expression.where) || '';
            var orderBy = parser.parse(queryable.expression.orderBy) || '';
            var skip = parser.parse(queryable.expression.skip) || '';
            var take = parser.parse(queryable.expression.take) || '';
            var count = parser.parse(queryable.expression.count) || '';
            var expand = parser.parse(queryable.expression.expand) || '';
            var select = parser.parse(queryable.expression.select) || '';

            return where + "" + orderBy + "" + skip + "" + take + count + expand + select;
        }
    };

    Object.defineProperty(Array.prototype, "asQueryable", {
        enumerable: false,
        configurable: false,
        value: function (Type) {
            var queryable = new Queryable(Type);
            //queryable.provider = new ArrayProvider(this);

            return queryable;
        }
    });

    window.BoostJS = {};

    BoostJS.Observable = Observable;
    BoostJS.Future = Future;
    BoostJS.Expression = Expression;
    BoostJS.ExpressionBuilder = ExpressionBuilder;
    BoostJS.Queryable = Queryable;
    BoostJS.ExpressionParser = ExpressionParser;
    BoostJS.ODataQueryVisitor = ODataQueryVisitor;
    BoostJS.OData = OData;
    BoostJS.extend = extend;

}());
