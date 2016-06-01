// https://github.com/jaredjbarnes/Queryable
// http://thejavascriptninja.blogspot.com/
(function (BoostJS, angular) {

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
        return validGuid.test(value); // && !emptyGuid.test(value);
    };

    function replaceDotWithSlash(str) {
        return str.replace(/\./g, '/');
    }

    function replaceDotWithInnerKeys(string, key) {
        var wholeArray = string.split(',');
        wholeArray.forEach(function (e, eIndex, eArray) {
            var result = '';
            var array = e.split('.');
            array.forEach(function (item, index) {
                if(array.length-1 !== index)
                    result += item + '(' + key + '=';
                else{
                    result += item;
                    for (var i = 1; i < array.length; i++) {
                        result += ')';
                    }
                }
            })
            eArray[eIndex] = result;
        })
        return wholeArray.join(',');
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
            success: function (callback) {
                var listener = function (e) {
                    callback(e.value);
                };
                observers.observe("then", listener);
            },
            catch: function (callback) {
                var listener = function (e) {
                    callback(e.error);
                };
                observers.observe("ifError", listener);
            },
            error: function (callback) {
                var listener = function (e) {
                    callback(e.error);
                };
                observers.observe("ifError", listener);
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
        self.success = function (callback) {
            _state.get();
            _state.then(callback);
            return self;
        };

        self.ifError = function (callback) {
            _state.get();
            _state.ifError(callback);
            return self;
        };
        self.error = function (callback) {
            _state.get();
            _state.ifError(callback);
            return self;
        };
        self.catch = function (callback) {
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

        self.any = function(value) {
            var property = Expression.property(namespace), constant = Expression.getExpressionType(value), type = new ExpressionBuilder(Type, void 0, structure);
            return Expression.any(property, constant, type)
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
                    get: function() {
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
                                else if (structure[ChildType.Type] !== undefined) {
                                    ChildType = structure[ChildType.Type];
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

    var Queryable = function (Type, expression, Schema) {
        var self = this;
        expression = expression || {};

        assertInstance(Queryable, self);

        var _Type = Type || Object;
        var _Schema = Schema || Object;
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
            var expression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, undefined, Schema));

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
                rightExpression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, undefined, Schema));
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
                rightExpression = fn.call(ExpressionBuilder, new ExpressionBuilder(Type, undefined, Schema));
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

            var result = fn.call(self, new ExpressionBuilder(Type, undefined, Schema));
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
            var result = fn.call(self, new ExpressionBuilder(Type, undefined, Schema));
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
            var property = fn.call(self, new ExpressionBuilder(Type, undefined, Schema));
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
            var property = fn.call(self, new ExpressionBuilder(Type, undefined, Schema));
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
            var queryable = new Queryable(Type, expression, Schema);
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
            return "&$count=true";
        };

        ODataQueryVisitor.prototype["where"] = function () {
            var self = this;
            return "&$filter=" + self["and"].apply(self.parsers, arguments);
        };

        ODataQueryVisitor.prototype.any = function() {
            var self = this, property = arguments[0].replace(".0", ""), propertyValue = arguments[1].children, valueType = propertyValue[1].name, values = (arguments[1].name || "equal",
                propertyValue[1].value), anyString = "{0}/any(u: u/{1}".format(property, propertyValue[0].value), args = [];
            var method = arguments[1].name;
            Array.isArray(values) || (values = [ values ]), values.forEach(function(value, index) {
                args.push(self[method].apply(self, [ anyString, value ]) + ")");
            });
            var value;

            if(valueType == 'array'){
                return value = 1 === args.length ? args[0] : self.or.apply(self, args);
            }

            var propertyValue = arguments[1].children;
            var methodname = arguments[1].name || 'equal';
            var values = propertyValue[1].value;
            var valString = 'u/{0}'.format(propertyValue[0].value);


            var args = [];
            if(!Array.isArray(values))
            {
                values = [values];
            }
            values.forEach(function(value, index) {
                args.push(self[methodname].apply(self, [valString, value]));
            });

            var value;
            if(args.length === 1) {
                value = args[0];

            } else {
                value = self['or'].apply(self, args);
            }

            var anyString = '{0}/any(u: {1})'.format(property, value);

            return anyString;
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
            return value.match(/^(\')+[0-9a-fA-F-]+(\')+$/) ? value.replace(/'/g, "") : value;
        };

        ODataQueryVisitor.prototype["substring"] = function (namespace, startAt, endAt) {
            return "substring(" + namespace + " " + (startAt ? "," + startAt : "," + 0) + " " + (endAt ? "," + endAt : "") + ")";
        };

        ODataQueryVisitor.prototype["substringOf"] = function (namespace, value) {
            var self = this;
            if (typeof value === 'string' && value.indexOf('\'') === -1) {
                value = self['string'].apply(self, [{value: value}]);
            }
            return "contains(" + replaceDotWithSlash(namespace) + "," + value + ")"; 
        }; 

        ODataQueryVisitor.prototype["startsWith"] = function (namespace, value) {
            return "startswith(" + namespace + "," + value + ")";
        };

        ODataQueryVisitor.prototype["expand"] = function (namespace, value) {
            var result = Array.prototype.slice.call(arguments, 0);
            result = replaceDotWithInnerKeys(result.join(","), '$expand');
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
            return JSON.stringify(expression.value).replace(/"/g, "");
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

    var metadata = function () {

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

        function createSchema(){
            var result = {};
            var metadata = arguments[0];
            for (i = 1; i < arguments.length; i++) {
                var item =  arguments[i];
                result[getKeyByValue(metadata, item)] = item;
            }
            return result;
        }

        function parseMetadataToObject(metadata, key, nodeTree, parent) {
            if (hasSameParent(parent, key)) {
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
                console.log('Object not found in Metadata: ' + key);
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
            if (node.parent == undefined) {
                return false;
            }
            if (node.parent.key == key) {
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

        return {
            create: create,
            createFilteredSchema: createSchema
        }
    };

    var QueryProvider = function () {
        var self = this;
        //assertInstance(QueryProvider, self);

        self.count = function (queryable) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    setValue(array.length);
                });
            });
        };

        self.any = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    if (results.length > 0) {
                        setValue(true);
                    } else {
                        setValue(false);
                    }

                });
            });
        };

        self.all = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    setValue(results.length === array.length);
                });
            });
        };

        self.firstOrDefault = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    setValue(results[0] || null);
                });
            });
        };

        self.lastOrDefault = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    setValue(results[results.length - 1] || null);
                });
            });
        };

        self.first = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    var result = results[0];

                    if (result) {
                        setValue(result);
                    } else {
                        setError(new Error("Couldn't find a match."));
                    }
                });
            });
        };

        self.last = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    var result = results[results.length - 1];

                    if (result) {
                        setValue(result);
                    } else {
                        setError(new Error("Couldn't find a match."));
                    }
                });
            });
        };

        self.contains = function (queryable, func) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var visitor = new ArrayQueryVisitor(array);
                    var parser = new ExpressionParser(visitor);
                    var results;

                    if (typeof func === "function") {
                        results = parser.parse(func.call(queryable, new ExpressionBuilder(queryable.Type)));
                    } else {
                        results = array;
                    }

                    setValue(results > 0);
                });
            });
        };

        self.select = function (queryable, forEachFunc) {
            return new Future(function (setValue, setError) {
                self.toArray(queryable).then(function (array) {
                    var objects = [];

                    array.forEach(function (item) {
                        objects.push(forEachFunc(item));
                    });

                    setValue(objects);
                });
            });
        };

        self.intersects = function (queryable, compareToQueryable) {
            return new Future(function (setValue, setError) {
                var task = new BASE.async.Task();
                task.add(self.toArray(queryable));
                task.add(compareToQueryable.toArray());
                task.start().whenAll(function (futures) {
                    var intersects = [];
                    var array1 = futures[0].value;
                    var array2 = futures[1].value;

                    array1.forEach(function (item) {
                        if (array2.indexOf(item) > -1) {
                            intersects.push(item);
                        }
                    });

                    setValue(intersects);
                });
            });
        };

        self.toArray = function (queryable) {
            return new BASE.async.Future(function (setValue, setError) {
                setTimeout(function () {
                    setValue([]);
                }, 0);
            });
        };

        //This should always return a Future of an array of objects.
        self.execute = self.toArray;
    };

    BoostJS.Observable = Observable;
    BoostJS.Future = Future;
    BoostJS.Expression = Expression;
    BoostJS.ExpressionBuilder = ExpressionBuilder;
    BoostJS.Queryable = Queryable;
    BoostJS.ExpressionParser = ExpressionParser;
    BoostJS.ODataQueryVisitor = ODataQueryVisitor;
    BoostJS.OData = OData;
    BoostJS.Metadata = metadata();
    BoostJS.QueryProvider = QueryProvider;
    BoostJS.extend = extend;

    var config = {
        endpoint: "/",
        odata: '/odata/'
    };

    angular.module('LinqToOdata', [])
        .constant('config', config)
        .factory('ODataProvider', ['$http', '$q', 'config', function ($http, $q, config){
            var ODataProvider = function () {
                var self = this;

                self.cache = undefined;

                var Types = [];
                var endPoints = [];

                BoostJS.QueryProvider.call(self);

                self.execute = self.toArray = function (queryable) {
                    var deferred = $q.defer();

                    var Type = queryable.Type;

                    var index = Types.indexOf(Type);
                    var uri;

                    if (index >= 0) {
                        uri = endPoints[index];
                    }

                    if (!uri) {
                        throw new Error("Provider doesn't support querying that Type.");
                    } else {
                        var odataString = BoostJS.OData.toString(queryable);

                        var url = uri + "?" + odataString;

                        if (self.cache !== undefined && self.cache.get(url)) {
                            deferred.resolve(self.cache.get(url));
                        } else {
                            $http.get(url)
                                .success(function (response, status, headers, config) {
                                    var result = [];

                                    if (status == 418 || status == 0) {
                                        deferred.reject(result);
                                        return;
                                    }

                                    result.total = parseInt(response['@odata.count']);

                                    response.value.forEach(function (item) {
                                        var instance = item;
                                        if (typeof Type === "function") {
                                            instance = new Type();
                                            Object.keys(item).forEach(function (key) {
                                                instance[key] = item[key];
                                            });
                                        }

                                        result.push(instance);
                                    });

                                    if (self.cache !== undefined) {
                                        self.cache.put(url, result);
                                    }

                                    deferred.resolve(result);
                                })
                                .error(function (response) {
                                    deferred.reject(response);
                                });
                        }
                    }


                    return deferred.promise;
                };

                self.addEndPoint = function (path, Type, baseUri) {
                    Types.push(Type);
                    endPoints.push(path + baseUri);
                };

                self.removeEndPoint = function (Type) {
                    var index = Types.indexOf(Type);
                    if (index >= 0) {
                        Types.splice(index, 1);
                        endPoints.splice(index, 1);
                    }
                };
            };

            BoostJS.extend(ODataProvider, BoostJS.QueryProvider);

            return {
                queriable: function (schema, Type, uriPath, cache) {
                    var provider = new ODataProvider();
                    provider.addEndPoint(config.odata, Type, uriPath);
                    provider.cache = cache;

                    var query = new BoostJS.Queryable(Type, undefined, schema);

                    query.provider = provider;
                    query = query.count(true);

                    return query;
                },
                queriableTest: function (Type, uriPath, cache) {
                    var provider = new ODataProvider();
                    provider.addEndPoint(config.odataTest, Type, uriPath);

                    var query = new BoostJS.Queryable(Type);
                    query.provider = provider;
                    query = query.count(true);

                    return query;
                }
            };
        }]);

}(window.BoostJS = {}, window.angular));
