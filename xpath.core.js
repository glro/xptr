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
xpath.core.newNodeSet = function(n) { return xpath.Value(t.NODE_SET, n) };

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
    .define("string", t.STRING, [])
    .define("string", t.STRING, [ t.NODE_SET ])
    .define("string", t.STRING, [ t.STRING ])
    .define("string", t.STRING, [ t.NUMBER ])
    .define("string", t.STRING, [ t.BOOLEAN ])
    .define("concat", t.STRING, [])                 /// @todo Implement varargs
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
    .define("substring", t.STRING, [ t.STRING, t.STRING, t.STRING ], function(str, start, length) {
            return str.substring(start - 1, length);
        })
    .define("substring", t.STRING, [ t.STRING, t.STRING ], function(str, start) {
            return str.substring(start - 1);
        })
    .define("string-length", t.NUMBER, [])
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
    .define("number", t.NUMBER, [])
    .define("number", t.NUMBER, [ t.NODE_SET ])
    .define("sum", t.NUMBER, [ t.NODE_SET ], function(nodes) {
            var toNumber = xpath.core.number.unwrap([ t.NODE_SET ]),
                sum = 0;
            for (var i = 0, len = nodes.length; i < len; i++) {
                sum += toNumber(nodes[i]);
            }
            return sum;
        })
    .define("floor", t.NUMBER, [ t.NUMBER ], function(n) { return Math.floor(n) })
    .define("ceiling", t.NUMBER, [ t.NUMBER ], function(n) { return Math.ceil(n) })
    .define("round", t.NUMBER, [ t.NUMBER ], function(n) { return Math.round(n) })
    ;
})();
