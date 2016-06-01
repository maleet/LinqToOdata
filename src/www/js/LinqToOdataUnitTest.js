//describe("Metadata", function () {
//    it("Create object graph by metadata.", function () {
//        var bpBuyFrom = createFiltered(metadata.WarehouseTransaction, metadata.WarehouseTransaction, metadata.InboundLine, metadata.WorkCenter);
//
//        function createFiltered(item){
//            var key = getKeyByValue(metadata, item);
//            var newArgs = [];
//            newArgs.push(metadata)
//            for (var i = 1; i < arguments.length; i++) {
//                newArgs.push(arguments[i]);
//            }
//
//            var filteredSchema = BoostJS.Metadata.createFilteredSchema.apply(BoostJS.Metadata.createFilteredSchema, newArgs);
//
//            return BoostJS.Metadata.create(filteredSchema,
//                metadata[key]
//            );
//        }
//
//        function getKeyByValue (object, key) {
//            for (var prop in object) {
//                if (object.hasOwnProperty(prop)) {
//                    if (object[prop] === key) {
//                        return prop;
//                    }
//                }
//            }
//            return undefined;
//        }
//
//        expect(JSON.stringify(bpBuyFrom, null, "\t")).toEqual("jsonString");
//    });
//});

//describe("Metadata", function () {
//    it("Create all object graphs by metadata.", function () {
//        Object.keys(metadata).forEach(function (key) {
//            var bpBuyFrom = BoostJS.Metadata.create(metadata, metadata[key]);
//            expect(JSON.stringify(bpBuyFrom, null, "\t")).toEqual("jsonString");
//        })
//    });
//});

describe("Odata", function () {
    it("Convert a queryable to a odata string.", function () {
        var id = '9b2a197b-189f-4097-9470-458da2854bd3';

        var queryable = new BoostJS.Queryable(metadata.BpBuyFrom, undefined, metadata)
            .where(function (bpBuyFrom) {
                var ex = this.and(undefined, bpBuyFrom.BusinessPartner.BpBuyFrom.BusinessPartner.BpBuyFrom.Code.equals('02677'));

                var date = new Date(0)
                return this.and(ex, bpBuyFrom.ValidFrom.lessThan(date));
            })
            .expand(function (bpBuyFrom) {
                return [
                    bpBuyFrom.AddressRelations.Address,
                    bpBuyFrom.BusinessPartner,
                    bpBuyFrom.BusinessPartner.BpInvoiceFrom,
                    bpBuyFrom.BusinessPartner.Contact,
                    bpBuyFrom.BusinessPartner.Contact.AddressRelations.Address,
                    bpBuyFrom.BusinessPartner.AddressRelations.Address
                ];
            })

        var odataString = BoostJS.OData.toString(queryable);
        console.log(odataString);

        expect(odataString).toEqual("&$filter=((((BusinessPartner/BpBuyFrom/BusinessPartner/BpBuyFrom/Code eq '02677')) and (ValidFrom lt 1970-01-01T00:00:00.000Z)))&$expand=AddressRelations($expand=Address),BusinessPartner,BusinessPartner($expand=BpInvoiceFrom),BusinessPartner($expand=Contact),BusinessPartner($expand=Contact($expand=AddressRelations($expand=Address))),BusinessPartner($expand=AddressRelations($expand=Address))");

    });
});

describe("Odata", function () {
    it("Convert a queryable to a odata string.", function () {
        var id = ['9b2a197b-189f-4097-9470-458da2854bd3', '8b2a197b-189f-4097-9470-458da2854bd3'];

        var buyFromId = '7b2a197b-189f-4097-9470-458da2854bd3';
        var name = 'Name';
        var filter = {
            where: function (item) {
                var expression = undefined;

                expression = this.and(expression, item.Id.equals(id));

                if (buyFromId) {
                    var hasBp = item.CarrierBpBuyFroms.any(function (carrierBuyFroms) {
                        return carrierBuyFroms.BpBuyFromId.equals(buyFromId);
                    });
                    expression = this.and(expression, hasBp);
                }

                if (name) {
                    expression = this.and(expression, item.Name.substringOf(name));
                }

                return expression;
            },
            orderBy: function (carrier) {
                return carrier.Name;
            },
            skip: 2,
            take: 3,
            select: function (item) {
                return [item.Id, item.Name, item.Code];
            }
        }

        var queryable = new BoostJS.Queryable(metadata.Carrier, undefined, metadata);
        assignFilter(filter, queryable);

        var odataString = BoostJS.OData.toString(queryable);

        ""

        expect(odataString)
            .toEqual("&$filter=((((((Id eq 9b2a197b-189f-4097-9470-458da2854bd3) or (Id eq 8b2a197b-189f-4097-9470-458da2854bd3))) and CarrierBpBuyFroms/any(u: (u/BpBuyFromId eq 7b2a197b-189f-4097-9470-458da2854bd3))) and contains(Name,'Name')))");

        function assignFilter(filter, query) {
            if (!!filter) {
                query = query
                    .where(filter.where)
                    .take(filter.take)
                    .skip(filter.skip)
                    .order(filter.order)
                    .orderBy(filter.orderBy)
                    .orderByDesc(filter.orderByDesc)
                    .expand(filter.expand)
                    .select(filter.select);
            }

            return query;
        }
    });
});

//describe("Observable", function(){
//    it("We will observe, notify and unobserve, then notify again to ensure that we unobserved.", function(){
//        var count = 0;
//
//        var observable = new BoostJS.Observable();
//            var callback = function(){
//                count++;
//            };
//            observable.observe("name", callback);
//            observable.notify({type: "name"});
//            observable.unobserve("name", callback);
//            observable.notify({type: "name"});
//
//        runs(function(){
//            expect(count).toBe(1);
//        });
//    });
//});
//
//describe("Futures Result", function(){
//    it("Should create a future with a setTimeout of 200 ms, and returns a value of \"true\".", function(){
//
//        var asyncFinished = false;
//
//        var future = new BoostJS.Future(function(setValue, setError){
//            setTimeout(function(){
//                setValue(true);
//            },200);
//        });
//
//        future.then(function(){
//            asyncFinished = true;
//        });
//
//        waitsFor(function(){
//            return asyncFinished === true;
//        },"Future should equal true.");
//
//        runs(function(){
//            expect(future.value).toBe(true);
//        });
//    });
//});
//
//
//
//
//describe("Futures Cancel", function(){
//    it("Should create a future, and then cancel it.", function(){
//
//        var asyncFinished = false;
//
//        var future = new BoostJS.Future(function(setValue, setError){
//            setTimeout(function(){
//                setValue(true);
//            },200);
//        });
//
//        future.then(function(){
//
//        }).ifCanceled(function(){
//
//        }).ifError(function(){
//
//        }).cancel();
//
//        setTimeout(function(){
//            asyncFinished = true;
//        }, 300);
//
//        waitsFor(function(){
//            return asyncFinished === true;
//        },"Future should be canceled.");
//
//        runs(function(){
//            expect(future.value).toBeNull();
//            expect(future.error).toBeNull();
//            expect(future.isComplete).toBe(true);
//        });
//    });
//});
//
//describe("Futures Error", function(){
//    it("Should create a future that returns an error.", function(){
//
//        var asyncFinished = false;
//        var calledCallback = false;
//
//        var error = new Error("Test error.");
//
//        var future = new BoostJS.Future(function(setValue, setError){
//            setTimeout(function(){
//                setError(error);
//            },200);
//        });
//
//        future.then(function(){
//
//        }).ifCanceled(function(){
//
//        }).ifError(function(){
//            calledCallback = true;
//        });
//
//        setTimeout(function(){
//            asyncFinished = true;
//        }, 300);
//
//        waitsFor(function(){
//            return asyncFinished === true;
//        },"Future should be canceled.");
//
//        runs(function(){
//            expect(future.value).toBeNull();
//            expect(future.error).toBe(error);
//            expect(calledCallback).toBe(true);
//            expect(future.isComplete).toBe(true);
//        });
//    });
//});
//
//describe("Expressions Value inheritance.", function(){
//    it("ValueExpression should be an instance of Expression.", function(){
//
//        var exp = BoostJS.Expression.boolean(true);
//
//        runs(function(){
//            expect(exp instanceof BoostJS.Expression).toBe(true);
//        });
//
//    });
//});
//
//describe("Expressions Complex inheritance.", function(){
//    it("ComplexExpression should be an instance of Expression.", function(){
//
//        var exp = BoostJS.Expression.where(true);
//
//        runs(function(){
//            expect(exp instanceof BoostJS.Expression).toBe(true);
//        });
//
//    });
//});
//
//describe("Expression value casts.", function(){
//
//    it("This should test all primitive type casts.", function(){
//        runs(function(){
//            var nullExpression = BoostJS.Expression.getExpressionType(null);
//            var booleanExpression = BoostJS.Expression.getExpressionType(true);
//            var undefinedExpression = BoostJS.Expression.getExpressionType(undefined);
//            var dateExpression = BoostJS.Expression.getExpressionType(new Date());
//            var objectExpression = BoostJS.Expression.getExpressionType({});
//            var arrayExpression = BoostJS.Expression.getExpressionType([]);
//            var functionExpression = BoostJS.Expression.getExpressionType(function(){});
//            var numberExpression = BoostJS.Expression.getExpressionType(0);
//            var stringExpression = BoostJS.Expression.getExpressionType("string");
//
//            expect(nullExpression.name).toEqual("null");
//            expect(booleanExpression.name).toEqual("boolean");
//            expect(undefinedExpression.name).toEqual("undefined");
//            expect(dateExpression.name).toEqual("date");
//            expect(objectExpression.name).toEqual("object");
//            expect(arrayExpression.name).toEqual("array");
//            expect(functionExpression.name).toEqual("function");
//            expect(numberExpression.name).toEqual("number");
//            expect(stringExpression.name).toEqual("string");
//        });
//    });
//
//});
//
//describe("Equals expression.", function(){
//
//    it("We pass two primitives to an equals Expression, and then check the tree.", function(){
//        runs(function(){
//
//            var equals = BoostJS.Expression.equal(BoostJS.Expression.property("propertyName"), BoostJS.Expression.getExpressionType(true));
//
//            expect(equals.children[0].name).toEqual("property");
//            expect(equals.children[1].name).toEqual("boolean");
//            expect(equals.children[0].value).toEqual("propertyName");
//            expect(equals.children[1].value).toEqual(true);
//        });
//    });
//
//});
//
//describe("GreaterThan expression.", function(){
//
//    it("We pass two primitives to an greaterThan Expression, and then check the tree.", function(){
//        runs(function(){
//
//            var greaterThan = BoostJS.Expression.greaterThan(BoostJS.Expression.property("propertyName"), BoostJS.Expression.getExpressionType(0));
//
//            expect(greaterThan.children[0].name).toEqual("property");
//            expect(greaterThan.children[1].name).toEqual("number");
//            expect(greaterThan.children[0].value).toEqual("propertyName");
//            expect(greaterThan.children[1].value).toEqual(0);
//        });
//    });
//
//});
//
//describe("LessThan expression.", function(){
//
//    it("We pass two primitives to an lessThan Expression, and then check the tree.", function(){
//        runs(function(){
//
//            var lessThan = BoostJS.Expression.lessThan(BoostJS.Expression.property("propertyName"), BoostJS.Expression.getExpressionType(0));
//
//            expect(lessThan.children[0].name).toEqual("property");
//            expect(lessThan.children[1].name).toEqual("number");
//            expect(lessThan.children[0].value).toEqual("propertyName");
//            expect(lessThan.children[1].value).toEqual(0);
//        });
//    });
//
//});
//
//describe("GreaterThanOrEqual expression.", function(){
//
//    it("We pass two primitives to an greaterThanOrEqual Expression, and then check the tree.", function(){
//        runs(function(){
//
//            var greaterThanOrEqual = BoostJS.Expression.greaterThanOrEqual(BoostJS.Expression.property("propertyName"), BoostJS.Expression.getExpressionType(0));
//
//            expect(greaterThanOrEqual.children[0].name).toEqual("property");
//            expect(greaterThanOrEqual.children[1].name).toEqual("number");
//            expect(greaterThanOrEqual.children[0].value).toEqual("propertyName");
//            expect(greaterThanOrEqual.children[1].value).toEqual(0);
//        });
//    });
//
//});
//
//describe("LessThanOrEqual expression.", function(){
//
//    it("We pass two primitives to an lessThanOrEqual Expression, and then check the tree.", function(){
//        runs(function(){
//
//            var lessThanOrEqual = BoostJS.Expression.lessThanOrEqual(BoostJS.Expression.property("propertyName"), BoostJS.Expression.getExpressionType(0));
//
//            expect(lessThanOrEqual.children[0].name).toEqual("property");
//            expect(lessThanOrEqual.children[1].name).toEqual("number");
//            expect(lessThanOrEqual.children[0].value).toEqual("propertyName");
//            expect(lessThanOrEqual.children[1].value).toEqual(0);
//        });
//    });
//
//});
//
//
//describe("OrderBy expression.", function(){
//
//    it("We build a orderBy tree with a descending, and an ascending expression.", function(){
//        runs(function(){
//
//            var orderBy = BoostJS.Expression.orderBy(BoostJS.Expression.descending(BoostJS.Expression.property("propertyName")), BoostJS.Expression.ascending(BoostJS.Expression.property("propertyName1")));
//
//            expect(orderBy.children[0].name).toEqual("descending");
//            expect(orderBy.children[1].name).toEqual("ascending");
//            expect(orderBy.children[0].children[0].name).toEqual("property");
//            expect(orderBy.children[1].children[0].name).toEqual("property");
//            expect(orderBy.children[0].children[0].value).toEqual("propertyName");
//            expect(orderBy.children[1].children[0].value).toEqual("propertyName1");
//        });
//    });
//
//});
//
//describe("Skip method expression.", function(){
//
//    it("We skip 2.", function(){
//        runs(function(){
//
//            var skip = BoostJS.Expression.skip(BoostJS.Expression.getExpressionType(2));
//
//            expect(skip.children[0].name).toEqual("number");
//            expect(skip.children[0].value).toEqual(2);
//        });
//    });
//
//});
//
//
//describe("Take method expression.", function(){
//
//    it("We will take 5.", function(){
//        runs(function(){
//
//            var take = BoostJS.Expression.take(BoostJS.Expression.getExpressionType(5));
//
//            expect(take.children[0].name).toEqual("number");
//            expect(take.children[0].value).toEqual(5);
//        });
//    });
//
//});
//
//describe("ToGuid method expression.", function(){
//
//    it("We will make a guid.", function(){
//        runs(function(){
//
//            var guid = BoostJS.Expression.toGuid(BoostJS.Expression.getExpressionType("12sl3cl3-0dkdl"));
//
//            expect(guid.children[0].name).toEqual("string");
//            expect(guid.children[0].value).toEqual("12sl3cl3-0dkdl");
//        });
//    });
//
//});
//
//describe("Substring method expression.", function(){
//
//    it("We will make a substring method with \"arn\" as the argument.", function(){
//        runs(function(){
//
//            var substring = BoostJS.Expression.substring(BoostJS.Expression.property("firstName"), BoostJS.Expression.getExpressionType("arn"));
//
//            expect(substring.children[0].name).toEqual("property");
//            expect(substring.children[0].value).toEqual("firstName");
//
//            expect(substring.children[1].name).toEqual("string");
//            expect(substring.children[1].value).toEqual("arn");
//        });
//    });
//
//});
//
//describe("SubstringOf method expression.", function(){
//
//    it("We will make a substringOf method with \"are\" as the argument.", function(){
//        runs(function(){
//
//            var substringOf = BoostJS.Expression.substringOf(BoostJS.Expression.property("firstName"), BoostJS.Expression.getExpressionType("are"));
//
//            expect(substringOf.children[0].name).toEqual("property");
//            expect(substringOf.children[0].value).toEqual("firstName");
//
//            expect(substringOf.children[1].name).toEqual("string");
//            expect(substringOf.children[1].value).toEqual("are");
//        });
//    });
//
//});
//
//describe("StartsWith method expression.", function(){
//
//    it("We will make a startsWith method with \"Jar\" as the argument.", function(){
//        runs(function(){
//
//            var startsWith = BoostJS.Expression.startsWith(BoostJS.Expression.property("firstName"), BoostJS.Expression.getExpressionType("Jar"));
//
//            expect(startsWith.children[0].name).toEqual("property");
//            expect(startsWith.children[0].value).toEqual("firstName");
//
//            expect(startsWith.children[1].name).toEqual("string");
//            expect(startsWith.children[1].value).toEqual("Jar");
//        });
//    });
//
//});
//
//describe("EndsWiths method expression.", function(){
//
//    it("We will make a endsWith method with \"red\" as the argument.", function(){
//        runs(function(){
//
//            var endsWith = BoostJS.Expression.endsWith(BoostJS.Expression.property("firstName"), BoostJS.Expression.getExpressionType("red"));
//
//            expect(endsWith.children[0].name).toEqual("property");
//            expect(endsWith.children[0].value).toEqual("firstName");
//
//            expect(endsWith.children[1].name).toEqual("string");
//            expect(endsWith.children[1].value).toEqual("red");
//        });
//    });
//
//});
//
//describe("ExpressionBuilder", function(){
//
//    it("Create a Expression tree through expression builder of type Person, and test equals.", function(){
//        runs(function(){
//
//            var Person = function(){
//                this.firstName = null;
//                this.lastName = null;
//                this.age = null;
//            };
//
//            var expressionBuilder = new BoostJS.ExpressionBuilder(Person);
//            var exp = expressionBuilder.firstName.equals("Jared");
//
//            expect(exp.name).toEqual("equal");
//            expect(exp.children[0].name).toEqual("property");
//            expect(exp.children[0].value).toEqual("firstName");
//            expect(exp.children[1].name).toEqual("string");
//            expect(exp.children[1].value).toEqual("Jared");
//
//        });
//    });
//
//});
//
//describe("ExpressionBuilder", function(){
//
//    it("Create a Expression tree through expression builder of type circular Person, and test equals.", function(){
//        runs(function(){
//
//            var Person = {
//                firstName: null,
//                lastName: null,
//                age: null
//            };
//
//            Person.person = Person;
//
//
//            var expressionBuilder = new BoostJS.ExpressionBuilder(Person);
//            var exp = expressionBuilder.person.firstName.equals("Jared");
//
//            expect(exp.name).toEqual("equal");
//            expect(exp.children[0].name).toEqual("property");
//            expect(exp.children[0].value).toEqual("person.firstName");
//            expect(exp.children[1].name).toEqual("string");
//            expect(exp.children[1].value).toEqual("Jared");
//        });
//    });
//
//});
//
//describe("ExpressionBuilder", function(){
//
//    it("Create a Expression tree through expression builder of type Person, and test greaterThan.", function(){
//        runs(function(){
//
//            var Person = function(){
//                this.firstName = null;
//                this.lastName = null;
//                this.age = null;
//            };
//
//            var expressionBuilder = new BoostJS.ExpressionBuilder(Person);
//            var exp = expressionBuilder.age.greaterThan(0);
//
//            expect(exp.name).toEqual("greaterThan");
//            expect(exp.children[0].name).toEqual("property");
//            expect(exp.children[0].value).toEqual("age");
//            expect(exp.children[1].name).toEqual("number");
//            expect(exp.children[1].value).toEqual(0);
//
//        });
//    });
//
//});
//
//describe("ExpressionBuilder", function(){
//
//    it("Create a Expression tree through expression builder of type Person, and test lessThan.", function(){
//        runs(function(){
//
//            var Person = function(){
//                this.firstName = null;
//                this.lastName = null;
//                this.age = null;
//            };
//
//            var expressionBuilder = new BoostJS.ExpressionBuilder(Person);
//            var exp = expressionBuilder.age.lessThan(0);
//
//            expect(exp.name).toEqual("lessThan");
//            expect(exp.children[0].name).toEqual("property");
//            expect(exp.children[0].value).toEqual("age");
//            expect(exp.children[1].name).toEqual("number");
//            expect(exp.children[1].value).toEqual(0);
//
//        });
//    });
//
//});
//
//
//describe("ExpressionBuilder", function(){
//
//    it("Create a Expression tree through expression builder of type Person, and test greaterThanOrEqualTo.", function(){
//        runs(function(){
//
//            var Person = function(){
//                this.firstName = null;
//                this.lastName = null;
//                this.age = null;
//            };
//
//            var expressionBuilder = new BoostJS.ExpressionBuilder(Person);
//            var exp = expressionBuilder.age.greaterThanOrEqualTo(0);
//
//            expect(exp.name).toEqual("greaterThanOrEqual");
//            expect(exp.children[0].name).toEqual("property");
//            expect(exp.children[0].value).toEqual("age");
//            expect(exp.children[1].name).toEqual("number");
//            expect(exp.children[1].value).toEqual(0);
//
//        });
//    });
//
//});
//
//describe("ExpressionBuilder", function(){
//
//    it("Create a Expression tree through expression builder of type Person, and test lessThanOrEqualTo.", function(){
//        runs(function(){
//
//            var Person = function(){
//                this.firstName = null;
//                this.lastName = null;
//                this.age = null;
//            };
//
//            var expressionBuilder = new BoostJS.ExpressionBuilder(Person);
//            var exp = expressionBuilder.age.lessThanOrEqualTo(0);
//
//            expect(exp.name).toEqual("lessThanOrEqual");
//            expect(exp.children[0].name).toEqual("property");
//            expect(exp.children[0].value).toEqual("age");
//            expect(exp.children[1].name).toEqual("number");
//            expect(exp.children[1].value).toEqual(0);
//
//        });
//    });
//
//});
//
//describe("Queryable", function(){
//
//    it("Create a Queryable of Type Person, and use a equals with a take, and skip 1.", function(){
//        runs(function(){
//
//            var Person = function(){
//                this.firstName = null;
//                this.lastName = null;
//                this.age = null;
//            };
//
//            var queryable = new BoostJS.Queryable(Person).where(function(p){
//                return p.firstName.equals("Jared");
//            }).take(5).skip(1).orderBy(function(p){
//                return p.lastName;
//            });
//
//            var expression = queryable.expression;
//
//            expect(expression.where.name).toEqual("where");
//
//            expect(expression.skip.children[0].value).toEqual(1);
//            expect(expression.skip.children[0].name).toEqual("number");
//
//            expect(expression.take.children[0].name).toEqual("number");
//            expect(expression.take.children[0].value).toEqual(5);
//
//            expect(expression.orderBy.children[0].name).toEqual("ascending");
//            expect(expression.orderBy.children[0].children[0].name).toEqual("property");
//            expect(expression.orderBy.children[0].children[0].value).toEqual("lastName");
//
//        });
//    });
//
//});

//
//var jasmineEnv = jasmine.getEnv();
//
//var htmlReporter = new jasmine.HtmlReporter();
//jasmineEnv.addReporter(htmlReporter);
//
//jasmineEnv.specFilter = function (spec) {
//    return htmlReporter.specFilter(spec);
//};
//
//var currentWindowOnload = window.onload;
//window.onload = function () {
//    if (currentWindowOnload) {
//        currentWindowOnload();
//    }
//
//    //document.querySelector('.version').innerHTML = jasmineEnv.versionString();
//    execJasmine();
//};
//
//function execJasmine() {
//    jasmineEnv.execute();
//}
