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

var compareNodes = xpath.core.compareNodes = function(a, b) {
    if (a == b)
        return 0;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
};


/**
 * A NodeSet provides a data structure that maintains nodes that has 2 nice
 * guarentees:
 *
 * 1. The iterator, each(), will always iterate the nodes in document order.
 * 2. All nodes in the list are unique (there are no duplicates).
 */
var NodeSet = xpath.core.NodeSet = xpath.util.Class({
    /**
     * Construct a new NodeSet from an array of nodes. Construction requires
     * O(n log n) time, where n = nodes.length.
     */
    init: function(nodes) {
        nodes = nodes || [];
        nodes.sort(xpath.core.compareNodes);
        var uniqNodes = this.nodes = [];
        xpath.util.each(nodes, function() {
                if (uniqNodes[uniqNodes.length - 1] != this)
                    uniqNodes.push(this);
            });
    },
    
    /**
     * Iteratate over each node in the NodeSet in document order.
     *
     * @param cb The callback to notify each iteration with the current node.
     */
    each: function(cb) {
        return xpath.util.each(this.nodes, cb);
    },
    
    /**
     * Returns an iterator that can be used to iterate over all nodes in this
     * node set.
     */
    iterator: function() {
        var nodeset = this;
        return function(cb) {
                return nodeset.each(cb);
            };
    },
    
    /**
     * Returns the i-th node in this NodeSet.
     */
    get: function(i) {
        return this.nodes[i];
    },
    
    /**
     * Return the number of nodes in this NodeSet.
     */
    size: function() {
        return this.nodes.length;
    },
    
    /**
     * Returns a new NodeSet that is the union of this node set and nodeSet.
     * The union of 2 NodeSets is performed in O(n) time (n = this.length 
     * + nodeSet.length).
     *
     * @param nodeSet A node set to union this NodeSet with.
     */
    unionWith: function(nodeSet) {
        var newNodes = [],
            i = 0, len = this.nodes.length,
            origNodes = this.nodes;
        nodeSet.each(function() {
            for (; i < len && compareNodes(this, origNodes[i]) > 0; i++)
                newNodes.push(origNodes[i]);
            if (this == origNodes[i])
                i++;    // Skip this node
            newNodes.push(this);
        });
        for (; i < len; i++)
            newNodes.push(this.nodes[i]);
        return new xpath.core.NodeSet(newNodes);
    }
});


var stringValue = xpath.core.stringValue = function(node) {
    if (node.nodeType == node.ELEMENT_NODE || node.nodeType == node.DOCUMENT_NODE) {
        var text = [];
        xpath.core.axisGuides.descendant(node, function(n) {
                if (n.nodeType == n.TEXT_NODE)
                    text.push(n.nodeValue)
            });
        return text.join("");
    } else {
        return node.nodeValue;
    }
 };


/**
 * Some constructor functions for core types...
 */
xpath.core.newNumber = function(n) { return xpath.Value(t.NUMBER, n) };
xpath.core.newString = function(n) { return xpath.Value(t.STRING, n) };
xpath.core.newBoolean = function(n) { return xpath.Value(t.BOOLEAN, n) };
xpath.core.newNodeSet = function(n) {
    return xpath.Value(t.NODE_SET, n.unionWith ? n : new NodeSet(n));
};

var each         = xpath.util.each,
    binarySearch = xpath.util.binarySearch;

/**
 * xpath.core.library defines the core XPath 1 Function Library.
 */
xpath.core.library = xpath.Library()
    .define("last",     t.NUMBER, [], function() { return this.last() })
    .define("position", t.NUMBER, [], function() { return this.position() })
    .define("count",    t.NUMBER, [ t.NODE_SET ], function(nodeSet) { return nodeSet.size() })
    .define("id",       t.NODE_SET,    [ t.STRING ], function(idString) {
            var ids = idString.split(xpath.lexer.re.whiteSpace),
                nodes = [],
                n;
            for (var i = 0; i < ids.length; i++)
                if (n = this.document.getElementById(ids[i]))
                    nodes.push(n);
            return new NodeSet(nodes);
        })
    .define("id",       t.NODE_SET,    [ t.NODE_SET ], function(nodes) {
            var context = this,
                idstr = [];
            each(nodes, function() { idstr.push(stringValue(this)); })
            return xpath.core.id.unwrap([ t.STRING ]).call(this, idstr.join(" "));
        })
    .define("local-name", t.STRING, [ t.NODE_SET ])
    .define("local-name", t.STRING, [])
    .define("namespace-uri", t.STRING, [ t.NODE_SET ])
    .define("namespace-uri", t.STRING, [])
    .define("name", t.STING, [ t.NODE_SET ])
    .define("name", t.STING, [])
    .define("string", t.STRING, [], function() {
            return stringValue(this.dot());
        })
    .define("string", t.STRING, [ t.NODE_SET ], function(nodes) {
            /// @todo Return string-value of node that is FIRST in doc. order
            return stringValue(nodes.get(0));
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
    .define("normalize-space", t.STRING, [], function() {
            return this.call("normalize-space", xpath.core.newString(stringValue(this.dot()))).value;
        })
    .define("normalize-space", t.STRING, [ t.STRING ], function(str) {
            return xpath.util.normalizeWhiteSpace(str);
        })
    .define("translate", t.STRING, [ t.STRING, t.STRING, t.STRING ], function(source, from, to) {
            var transMap = {}, translated = [];
            for (var i = 0; i < from.length; i++)
                transMap[from.charAt(i)] = to.charAt(i) ? to.charAt(i) : 1;
            for (var i = 0; i < source.length; i++) {
                var ch = source.charAt(i);
                translated.push(transMap[ch] 
                                    ? (transMap[ch] === 1 ? "" : transMap[ch])
                                    : ch);
            }
            return translated.join("");
        })
    .define("boolean", t.BOOLEAN, [ t.NUMBER ], function(n) { return n != 0 || isNaN(n) })
    .define("boolean", t.BOOLEAN, [ t.STRING ], function(str) { return str.length != 0 })
    .define("boolean", t.BOOLEAN, [ t.BOOLEAN ], function(val) { return val })
    .define("boolean", t.BOOLEAN, [ t.NODE_SET ], function(nodes) { return nodes.size() != 0 })
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
            nodes.each(function() { sum += toNumber(this); });
            return sum;
        })
    .define("floor", t.NUMBER, [ t.NUMBER ], function(n) { return Math.floor(n) })
    .define("ceiling", t.NUMBER, [ t.NUMBER ], function(n) { return Math.ceil(n) })
    .define("round", t.NUMBER, [ t.NUMBER ], function(n) { return Math.round(n) })
    
    /* Functions NOT defined in the XPath 1 Spec. */
    
    /* Union 2 node-sets together. */
    
    .define("union", t.NODE_SET, [ t.NODE_SET, t.NODE_SET ], function(a, b) { return a.unionWith(b); })
    
    /* "equals" functions are used in = and != comparisons. */
    
    .define("equals", t.BOOLEAN, [ t.BOOLEAN, t.BOOLEAN ], function(a, b) { return a == b; })
    .define("equals", t.BOOLEAN, [ t.NUMBER, t.NUMBER ], function(a, b) { return a == b; })
    .define("equals", t.BOOLEAN, [ t.STRING, t.STRING ], function(a, b) { return a == b; })
    .define("equals", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(this, a);
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
            var haystack = sortStringValues(this, a);
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
            var haystack = sortStringValues(this, b);
            return !eachAsString(this, a, function() {
                    if (binarySearch(haystack, this) < haystack.length)
                        return false;
                });
        })
    .define("less-than-or-equal", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(this, b);
            return !eachAsString(this, a, function() {
                    var insertIndex = binarySearch(haystack, this);
                    if (insertIndex < haystack.length || haystack[insertIndex] == this)
                        return false;
                });
        })
    .define("greater-than", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(this, b);
            return !eachAsString(this, a, function() {
                    if (binarySearch(haystack, this) > 0)
                        return false;
                });
        })
    .define("greater-than-or-equal", t.BOOLEAN, [ t.NODE_SET, t.NODE_SET ], function(a, b) {
            var haystack = sortStringValues(this, b);
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
    
    /* Arithmetic operations. */
    
    .define("negate", t.NUMBER, [ t.NUMBER ], function(n) { return -n })
    .define("add", t.NUMBER, [ t.NUMBER, t.NUMBER ], function(n, m) { return n + m })
    .define("subtract", t.NUMBER, [ t.NUMBER, t.NUMBER ], function(n, m) { return n - m })
    .define("multiply", t.NUMBER, [ t.NUMBER, t.NUMBER ], function(n, m) { return n * m })
    .define("divide", t.NUMBER, [ t.NUMBER, t.NUMBER ], function(n, m) { return n / m })
    .define("modulus", t.NUMBER, [ t.NUMBER, t.NUMBER ], function(n, m) { return n % m })
    
    .define("negate", t.NUMBER, [ t.ANY_TYPE ], function(n) { return this.call("negate", this.call("number", n)).value })
    .define("add", t.NUMBER, [ t.ANY_TYPE, t.ANY_TYPE ], function(n, m) { 
            return this.call("add", this.call("number", n), this.call("number", m)).value;
        })
    .define("subtract", t.NUMBER, [ t.ANY_TYPE, t.ANY_TYPE ], function(n, m) { 
            return this.call("subtract", this.call("number", n), this.call("number", m)).value;
        })
    .define("multiply", t.NUMBER, [ t.ANY_TYPE, t.ANY_TYPE ], function(n, m) { 
            return this.call("multiply", this.call("number", n), this.call("number", m)).value;
        })
    .define("divide", t.NUMBER, [ t.ANY_TYPE, t.ANY_TYPE ], function(n, m) { 
            return this.call("divide", this.call("number", n), this.call("number", m)).value;
        })
    .define("modulus", t.NUMBER, [ t.ANY_TYPE, t.ANY_TYPE ], function(n, m) { 
            return this.call("modulus", this.call("number", n), this.call("number", m)).value;
        })
    ;

/**
 * Iterates over each node, giving the callback function the node's
 * string-value.
 *
 * @param context An EvaluationContext to get the string-value from
 * @param nodes A NodeSet to iterate over
 * @param cb A function to callback at each iteration with the node's string value
 */
function eachAsString(context, nodes, cb) {
    return nodes.each(function(i) {
            var str = stringValue(this);
            return cb.call(str, i);
        });
}

/**
 * Returns a sorted array of string-values of a NodeSet.
 *
 * @param context An EvaluationContext to get string-values from
 * @param nodes A NodeSet to sort the string-values of
 */
function sortStringValues(context, nodes) {
    var vals = []
    eachAsString(context, nodes, function() { vals.push(this); });
    vals.sort();
    return vals;
}

/**
 * Apply the "equality" (an XPath function name) to each node, comparing it
 * against val. If a test (applying the equality function) ever returns true,
 * then true is returned, otherwise false is. The equality function should 
 * return a BOOLEAN. If reverse is true, then the argument order will be 
 * reversed so that val comes first and the node comes 2nd.
 */
function testEquality(context, equality, nodes, val, reverse) {
    var typeName = val.type.getTypeName();
    return !nodes.each(function() {
            if (!reverse && context.call(equality, context.call(typeName, xpath.core.newNodeSet(new NodeSet([this]))), val).value
                || reverse && context.call(equality, val, context.call(typeName, xpath.core.newNodeSet(new NodeSet([this])))).value)
                return false;
        });
}


xpath.core.AxisGuideManager = xpath.util.Class({
    getAxisGuide: function(axis) {
        return xpath.core.axisGuides[axis] || null;
    }
});

/**
 * Axis guides are methods that take 2 arguments; a node and a callback. A
 * guide for an axis will traverse, in order, all the nodes in that axis, each
 * time calling the callback provided with the current node as the argument.
 *
 * Generally, we traverse the DOM in document order (pre-order). The 
 * exceptions to this are {@code preceding}, {@code precedingSibling}, 
 * {@code ancestor}, {@code ancestor-or-self}, {@code attribute} and 
 * {@code namespace}. {@code preceding}, {@code precedingSibling}, 
 * {@code ancestor} and {@code ancestor-or-self} traverse the DOM in reverse 
 * document order. For {@code ancestor} and {@code ancestor-or-self} this means
 * we climb up the DOM. The order for {@code attribute} and {@code namespace} is
 * not guaranteed and the order should be considered arbitrary. 
 * 
 * If at anytime during the traversal the callback function returns false, and 
 * only false (other values that evaluate to false, like null or '', won't 
 * affect the traversal), the guide will stop the traversal at that node and 
 * return false. Otherwise, if the traversal completes normally, the guide 
 * returns true.
 *
 * @note When there are axes who have dashes (-) in the name, there is also a
 * corresponding guide with the dashes removed and camel-cased so it can be used
 * as an object method (ie. with a .). For example, there is a guide 
 * {@code guide['descendant-or-self'] and, also, {@code guide.descendantOrSelf}.
 *
 * @note The Guide is meant to be subclassed (or an instance extended) to 
 * support new axes, should an implementation require it.
 */
xpath.core.axisGuides = {
    self: function(n, cb) {
        return cb(n) !== false;
    },
    parent: function(n, cb) {
        if (n.nodeType != Node.ATTRIBUTE_NODE ? !n.parentNode : !n.ownerElement)
            return true;
        return cb(n.parentNode || n.ownerElement) !== false;
    },
    child: function(n, cb) {
        var kids = n.childNodes;
        for (var i = 0, len = kids.length; i < len; i++)
            if (cb(kids[i]) === false)
                return false;
        return true;
    },
    followingSibling: function(n, cb) {
        while (n = n.nextSibling)
            if (cb(n) === false)
                return false;
        return true;
    },
    precedingSibling: function(n, cb) {
        while (n = n.previousSibling)
            if (cb(n) === false)
                return false;
        return true;
    },
    ancestor: function(n, cb) {
        for (n = n.parentNode; n; n = n.parentNode)
            if (cb(n) === false)
                return false;
        return true;
    },
    descendant: function(n, cb) {
        var nodeStack = Array.prototype.slice.call(n.childNodes).reverse();
        for (n = nodeStack.pop(); n !== undefined; n = nodeStack.pop()) {
            if (cb(n) === false)
                return false;
            for (var kids = n.childNodes, i = kids.length - 1; i >= 0; i--)
                nodeStack.push(kids[i]);
        }
        return true;
    },
    following: function(n, cb) {
        for (; n; n = n.parentNode) {
            if (xpath.core.axisGuides.followingSibling(n, function(sib) {
                        return xpath.core.axisGuides.descendantOrSelf(sib, cb);
                    }) === false)
                return false;
        }
        return true;
    },
    preceding: function(n, cb) {
        for (; n; n = n.parentNode) {
            if (xpath.core.axisGuides.precedingSibling(n, function(sib) {
                        return xpath.core.axisGuides.reverseOrderDescendant(sib, cb);
                    }) === false)
                return false;
        }
        return true;
    },
    ancestorOrSelf: function(n, cb) {
        return cb(n) !== false && xpath.core.axisGuides.ancestor(n, cb) !== false;
    },
    descendantOrSelf: function(n, cb) {
        return cb(n) !== false && xpath.core.axisGuides.descendant(n, cb) !== false;
    },
    attribute: function(n, cb) {
        // Only ELEMENT node types have attributes
        if (n.nodeType == 1) {
            var attrs = n.attributes;   // attrs is a NamedNodeMap
            for (var i = 0, len = attrs.length; i < len; i++)
                if (cb(attrs[i]) === false)
                    return false;
        }
        return true;
    },
    namespace: function(n, cb) {
        /// @todo Write namespace guide
        return false;
    },
    reverseOrderDescendant: function(n, cb) {
        /// @todo Re-write this function to be iterative, not recursive...
        
        if (n.hasChildNodes())
            for (var k = n.lastChild; k; k = k.previousSibling)
                if (xpath.core.axisGuides.reverseOrderDescendant(k, cb) === false)
                    return false;
        return cb(n) !== false;
    },
    'following-sibling': function(n, cb) {
        return xpath.core.axisGuides.followingSibling(n, cb);
    },
    'preceding-sibling': function(n, cb) {
        return xpath.core.axisGuides.precedingSibling(n, cb);
    },
    'ancestor-or-self': function(n, cb) {
        return xpath.core.axisGuides.ancestorOrSelf(n, cb);
    },
    'descendant-or-self': function(n, cb) {
        return xpath.core.axisGuides.descendantOrSelf(n, cb);
    }
};

})();
