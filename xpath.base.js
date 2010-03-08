/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * This file defines many internal types and functions used by the XPath
 * extensions (include xpath.core). The main methods you would want to use are:
 *
 * xpath.Type(name)         : Creates a new "type" that can be used by XPath
 * xpath.Value(type, value) : Creates a value with a given type 
 *                            (eg. xpath.Value(xpath.core.BOOLEAN, true));
 * xpath.Library()          : Creates a new function library. This library 
 *                            defines further methods, such as define(), which
 *                            can be used to create and override methods.
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath = window.xpath || {};

var nextTypeIdCounter = 0,
    typeDefs = [];
function nextTypeId() { return nextTypeIdCounter++ };

/**
 * Create a new (internal) Type to use within XPath.
 */
xpath.Type = function(name) {
        if (typeof typeDefs[name] != "undefined")
            throw new Error("Redefinition of type: '" + name + "'");

        var typeId = nextTypeId(),
            typeName = name,
            type = {
                getTypeId: function() { return typeId },
                getTypeName: function() { return typeName },
                toString: function() { return typeName }
            };
        typeDefs[typeName] = type;
        return type;
    };

/** Special type representing any type. */
xpath.ANY_TYPE = xpath.Type("*");

/**
 * Construct a value with a given type. Here type is a Type as returned by
 * xpath.Type() and value is a some backing native JS value.
 */
xpath.Value = function(type, value) {
        return {"type": type, "value": value};
    };


/**
 * Used by xpath.define() when no Javascript function is given. This will,
 * instead, throw an Exception letting the user know the function has not been
 * implemented.
 *
 * @param funcName The name of the function, used only in the error message.
 * @return A function that will throw an exception when called.
 */
function NOT_IMPLEMENTED(funcName) {
    return function() {
        throw new Error("Function '" + funcName + "' has not been implemented.");
    };
}

/**
 * Returns a string representing the function signature that can be hashed.
 */
function signature(argumentTypes) {
    return "(" + argumentTypes.join(",") + ")";
}

/**
 * Returns an array of just the types from an array of Values.
 */
function types(args) {
    var t = [];
    for (var i = 0; i < args.length; i++)
        t.push(args[i].type);
    return t;
}

/**
 * Returns an array of just the values from an array of Values.
 */
function values(args, argTypes) {
    var vals = [];
    for (var i = 0; i < args.length; i++)
        vals.push(argTypes && argTypes[i] == xpath.ANY_TYPE ? args[i] : args[i].value);
    return vals;
}

/**
 * Create a new XPath function library.
 */
xpath.Library = function(lib) {
    lib = lib || {
        define: function(id, rt, at, fn) {
            if (id == "define")
                throw new Error("Cannot overwrite function: 'define'.");
            lib[id] = typeof lib[id] != "undefined"
                ? lib[id].define(id, rt, at ,fn)
                : xpath.define(id, rt, at, fn);
            return lib;
        },
        defineBare: function(id, fn) {
            if (typeof lib[id] != "undefined")
                throw new Error("Bare XPath functions can only be defined once.");
            lib[id] = fn;
            return lib;
        },
        getFunction: function(name) {
            return lib[name];
        }
    };
    return lib;
};

/**
 * Creates a new "XPath" function declaration. A function requires the return
 * type, the argument types, and the Javascript function that is called. The
 * arguments applied to the Javascript function will be of the native type, 
 * rather than the XPath type. The value returned by the Javascript function
 * will be wrapped according to the return type specified. The name given is
 * used purely for user error messages.
 */
xpath.define = function(id, returnType, argumentTypes, jsFunc, wrapper, mappings) {
    jsFunc = jsFunc || NOT_IMPLEMENTED;
    mappings = mappings || {};
    wrapper = wrapper || function() {
            var argTypes = types(arguments),
                modArgTypes = argTypes.slice(),
                f;

            // Try to find a matching function
            
            for (var i = 0, stop = Math.pow(2, argTypes.length);
                typeof f == "undefined" && i < stop;
                i++)
            {
                for (var j = 0; j < modArgTypes.length; j++)
                    modArgTypes[j] = ((j + 1) & i) == 0 ? argTypes[j] : xpath.ANY_TYPE;
                f = mappings[signature(modArgTypes)];
            }
            
            if (typeof f == "undefined")
                throw new Error("Cannot apply arguments (" + argTypes.join(",") + ") to function '" + id + "'");
            var value = f.fn.apply(this, values(arguments, modArgTypes));
            return {"type": f.rt, "value": value};
        };
    wrapper.define = function(id, rt, at, jsf) {
        return xpath.define(id, rt, at, jsf, wrapper, mappings);
    };
    wrapper.unwrap = function(argumentTypes) {
        argumentTypes = argumentTypes || [];
        var f = mappings[signature(argumentTypes)],
            i = 1;
        if (typeof f == "undefined")
            throw new Error("Cannot find function '" + id + "' with signature " + signature(argumentTypes));
        return mappings[signature(argumentTypes || [])].fn;
    };
        
    var sig = signature(argumentTypes);
    if (typeof mappings[sig] != "undefined")
        throw new Error("Function declared with duplicate signature.");
    mappings[sig] = {"rt": returnType, "at": argumentTypes, "fn": jsFunc};
    return wrapper;
};
})();
