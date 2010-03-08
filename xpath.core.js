/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * XPath Core Functions. This file provides implementations of all the core
 * XPath functions.
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath = window.xpath || {};
xpath.core = xpath.core || {};

/**
 * xpath.core.types has the 4 basic types in XPath 1.
 */
var t = xpath.core.types = {
        NUMBER: xpath.Type("number"),
        STRING: xpath.Type("string"),
        BOOLEAN: xpath.Type("boolean"),
        NODE_SET: xpath.Type("node-set")
    };

/**
 * Some constructor functions for core types...
 */
xpath.core.newNumber = function(n) { return xpath.Value(t.NUMBER, n) };
xpath.core.newString = function(n) { return xpath.Value(t.STRING, n) };
xpath.core.newBoolean = function(n) { return xpath.Value(t.BOOLEAN, n) };
xpath.core.newNodeSet = function(n) {
    return xpath.Value(t.NODE_SET, typeof n.length == "number" ? n : [n])
};

var each         = xpath.util.each,
    binarySearch = xpath.util.binarySearch;

/**
 * xpath.core.library defines the core XPath 1 Function Library.
 */
xpath.core.library = xpath.Library()
    .define("last",     t.NUMBER, [], function() { return this.last() })
    .define("position", t.NUMBER, [], function() { return this.position() })
    .define("count",    t.NUMBER, [ t.NODE_SET ], function(nodeSet) { return nodeSet.length })
    .define("id",       t.NODE_SET,    [ t.STRING ], function(idString) {
            var ids = idString.split(xpath.lexer.re.whiteSpace),
                nodes = [],
                n;
            for (var i = 0; i < ids.length; i++)
                if (n = this.document.getElementById(ids[i]))
                    nodes.push(n);
            return nodes;
        })
    .define("id",       t.NODE_SET,    [ t.NODE_SET ], function(nodes) {
            var ids = ""; // ??
            return xpath.core.id.unwrap([ t.STRING ]).call(this, ids);
        })
    .define("local-name", t.STRING, [ t.NODE_SET ])
    .define("local-name", t.STRING, [])
    .define("namespace-uri", t.STRING, [ t.NODE_SET ])
    .define("namespace-uri", t.STRING, [])
    .define("name", t.STING, [ t.NODE_SET ])
    .define("name", t.STING, [])
    .define("string", t.STRING, [], function() {
            return this.getStringValue(this.dot());
        })
    .define("string", t.STRING, [ t.NODE_SET ], function(nodes) {
            /// @todo Return string-value of node that is FIRST in doc. order
            return this.getStringValue(nodes[0]);
        })
    .define("string", t.STRING, [ t.STRING ], function(s) { return s })
    .define("string", t.STRING, [ t.NUMBER ], function(n) { return n.toString() })
    .define("string", t.STRING, [ t.BOOLEAN ], function(b) { return b.toString() })
    .define("_concat", t.STRING, [ t.STRING, t.STRING ], function(u, v) {
            return u + v;
        })
    .defineBare("concat", function() {
            var bigStr = Array.prototype.shift.call(arguments),
                context = this;
            each(arguments, function() {
                    bigStr = context.call("_concat", bigStr, this);
                });
            return bigStr;
        })
    .define("starts-with", t.BOOLEAN, [ t.STRING, t.STRING ], function(str, prefix) {
            return str.indexOf(prefix) == 0;
        })
    .define("contains", t.BOOLEAN, [ t.STRING, t.STRING ], function(haystack, needle) {
            return haystack.indexOf(needle) >= 0;
        })
    .define("substring-before", t.STRING, [ t.STRING, t.STRING ], function(haystack, needle) {
            return haystack.substring(0, haystack.indexOf(needle));
        })
    .define("substring-after", t.STRING, [ t.STRING, t.STRING ], function(haystack, needle) {
            return haystack.substring(haystack.indexOf(needle) + needle.length);
        })
    .define("substring", t.STRING, [ t.STRING, t.NUMBER, t.NUMBER ], function(str, start, length) {
            return str.substring(start - 1, start - 1 + length);
        })
    .define("substring", t.STRING, [ t.STRING, t.NUMBER ], function(str, start) {
            return str.substring(start - 1);
        })
    .define("string-length", t.NUMBER, [], function() { return this.call("string").value.length })
    .define("string-length", t.NUMBER, [ t.STRING ], function(str) {
            return str.length;
        })
    .define("normalize-space", t.STRING, [])
    .define("normalize-space", t.STRING, [ t.STRING ])
    .define("translate", t.STRING, [ t.STRING, t.STRING, t.STRING ])
    .define("boolean", t.BOOLEAN, [ t.NUMBER ], function(n) { return n != 0 || isNaN(n) })
    .define("boolean", t.BOOLEAN, [ t.STRING ], function(str) { return str.length != 0 })
    .define("boolean", t.BOOLEAN, [ t.BOOLEAN ], function(val) { return val })
    .define("boolean", t.BOOLEAN, [ t.NODE_SET ], function(nodes) { return nodes.length != 0 })
    .define("not", t.BOOLEAN, [ t.BOOLEAN ], function(val) { return !val })
    .define("true", t.BOOLEAN, [], function() { return true })
    .define("false", t.BOOLEAN, [], function() { return false })
    .define("lang", t.BOOLEAN, [ t.STRING ])
    .define("number", t.NUMBER, [ t.NUMBER ], function(n) { return n })
    .define("number", t.NUMBER, [ t.BOOLEAN ], function(bVal) { return bVal ? 1 : 0 })
    .define("number", t.NUMBER, [ t.STRING ], function(str) { return parseFloat(str) })
    .define("number", t.NUMBER, [ t.NODE_SET ], function(nodes) {
            return this.call("number", this.call("string", xpath.core.newNodeSet(nodes))).value;
        })
    .define("number", t.NUMBER, [], function() {
            return this.call("number", this.call("string")).value;
        })
    .define("sum", t.NUMBER, [ t.NODE_SET ], function(nodes) {
            var toNumber = xpath.core.number.unwrap([ t.NODE_SET ]),
                sum = 0;
            each(nodes, function() { sum += toNumber(this); });
            return sum;
        })
    .define("floor", t.NUMBER, [ t.NUMBER ], function(n) { return Math.floor(n) })
    .define("ceiling", t.NUMBER, [ t.NUMBER ], function(n) { return Math.ceil(n) })
    .define("round", t.NUMBER, [ t.NUMBER ], function(n) { return Math.round(n) })
    
    /* Functions NOT defined in the XPath 1 Spec. */
    
    /* "equals" functions are used in = and != comparisons. */
    
    .define("equals", t.BOOLEAN, [ t.BOOLEAN, t.BOOLEAN ], function(a, b) { return a == b; })
    .define("equals", t.BOOLEAN, [ t.NUMBER, t.NUMBER ], function(a, b) { return a == b; })
    .define("equals", t.BOOLEAN, [ t.STRING, t.STRING ], function(a, b) { return a == b; })
    .define("equals", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(a);
            return !eachAsString(this, b, function() {
                    if (haystack[binarySearch(haystack, this)] == this)
                        return false;
                });
        })
    .define("equals", t.BOOLEAN, [ t.NODE_SET, xpath.ANY_TYPE ], function(nodes, val) {
            return testEquality(this, "equals", nodes, val);
        })
    .define("equals", t.BOOLEAN, [ xpath.ANY_TYPE, t.NODE_SET ], function(val, nodes) {
            return testEquality(this, "equals", nodes, val);
        })
    .define("equals", t.BOOLEAN, [ xpath.ANY_TYPE, xpath.ANY_TYPE ], function(a, b) {
            if (a.type == t.BOOLEAN || b.type == t.BOOLEAN) {
                return this.call("equals", this.call("boolean", a), this.call("boolean", b)).value;
            } else if (a.type == t.NUMBER || b.type == t.NUMBER) {
                return this.call("equals", this.call("number", a), this.call("number", b)).value;
            } else if (a.type == t.STRING || b.type == t.STRING) {
                return this.call("equals", this.call("string", a), this.call("string", b)).value;            
            } else {
                throw new Error("Cannot compare types '" + a.type + "' and '" + b.type + "'");
            }
        })
    
    /* For most types, "not-equals" is simply !"equals". This is not true for node-sets. */
    
    .define("not-equals", t.BOOLEAN, [ xpath.ANY_TYPE, xpath.ANY_TYPE ], function(a, b) {
            return !this.call("equals", a, b).value;
        })
    .define("not-equals", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(a);
            return !eachAsString(this, b, function() {
                    if (haystack[binarySearch(haystack, this)] != this)
                        return false;
                });
        })
    .define("not-equals", t.BOOLEAN, [ t.NODE_SET, xpath.ANY_TYPE ], function(nodes, val) {
            return testEquality(this, "not-equals", nodes, val);
        })
    .define("not-equals", t.BOOLEAN, [ xpath.ANY_TYPE, t.NODE_SET ], function(val, nodes) {
            return testEquality(this, "not-equals", nodes, val);
        })
    
    /* The default action is to convert both types to numbers and perform the comparison. */
    
    .define("less-than", t.BOOLEAN, [ xpath.ANY_TYPE, xpath.ANY_TYPE ], function(a, b) {
            return this.call("number", a).value < this.call("number", b).value;
        })
    .define("greater-than", t.BOOLEAN, [ xpath.ANY_TYPE, xpath.ANY_TYPE ], function(a, b) {
            return this.call("less-than", b, a).value;
        })
    .define("less-than-or-equal", t.BOOLEAN, [ xpath.ANY_TYPE, xpath.ANY_TYPE ], function(a, b) {
            return !this.call("greater-than", a, b).value;
        })
    .define("greater-than-or-equal", t.BOOLEAN, [ xpath.ANY_TYPE, xpath.ANY_TYPE ], function(a, b) {
            return !this.call("less-than", a, b).value;
        })
    .define("less-than", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(b);
            return !eachAsString(this, a, function() {
                    if (binarySearch(haystack, this) < haystack.length)
                        return false;
                });
        })
    .define("less-than-or-equal", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(b);
            return !eachAsString(this, a, function() {
                    var insertIndex = binarySearch(haystack, this);
                    if (insertIndex < haystack.length || haystack[insertIndex] == this)
                        return false;
                });
        })
    .define("greater-than", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(b);
            return !eachAsString(this, a, function() {
                    if (binarySearch(haystack, this) > 0)
                        return false;
                });
        })
    .define("greater-than-or-equal", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(b);
            return !eachAsString(this, a, function() {
                    var insertIndex = binarySearch(haystack, this);
                    if (insertIndex > 0 || haystack[insertIndex] == this)
                        return false;
                });
        })
    .define("less-than", t.BOOLEAN, [ t.NODE_SET, xpath.ANY_TYPE ], function(nodes, val) {
            return testEquality(this, "less-than", nodes, val);
        })
    .define("less-than", t.BOOLEAN, [ xpath.ANY_TYPE, t.NODE_SET ], function(val, nodes) {
            return testEquality(this, "less-than", nodes, val, true);
        })
    .define("greater-than", t.BOOLEAN, [ t.NODE_SET, xpath.ANY_TYPE ], function(nodes, val) {
            return testEquality(this, "greater-than", nodes, val);
        })
    .define("greater-than", t.BOOLEAN, [ xpath.ANY_TYPE, t.NODE_SET ], function(val, nodes) {
            return testEquality(this, "greater-than", nodes, val, true);
        })
    .define("less-than-or-equal", t.BOOLEAN, [ t.NODE_SET, xpath.ANY_TYPE ], function(nodes, val) {
            return testEquality(this, "less-than-or-equal", nodes, val);
        })
    .define("less-than-or-equal", t.BOOLEAN, [ xpath.ANY_TYPE, t.NODE_SET ], function(val, nodes) {
            return testEquality(this, "less-than-or-equal", nodes, val, true);
        })
    .define("greater-than-or-equal", t.BOOLEAN, [ t.NODE_SET, xpath.ANY_TYPE ], function(nodes, val) {
            return testEquality(this, "greater-than-or-equal", nodes, val);
        })
    .define("greater-than-or-equal", t.BOOLEAN, [ xpath.ANY_TYPE, t.NODE_SET ], function(val, nodes) {
            return testEquality(this, "greater-than-or-equal", nodes, val, true);
        })
    ;

function eachAsString(context, vals, cb) {
    return each(vals, function(i) {
            var str = context.getStringValue(this);
            return cb.call(str, i);
        });
}

function sortStringValues(context, nodes) {
    var vals = []
    each(a, function() { vals.push(context.call("string", xpath.core.newNodeSet([this])).value); });
    vals.sort();
    return vals;
}

function testEquality(context, equality, nodes, val, reverse) {
    var typeName = val.type.getTypeName();
    return !each(nodes, function() {
            if (!reverse && context.call(equality, context.call(typeName, xpath.core.newNodeSet([this])), val).value
                || reverse && context.call(equality, val, context.call(typeName, xpath.core.newNodeSet([this]))).value)
                return false;
        });
}
})();
