/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */
/** @fileoverview
 * The XPath AST interpreter.
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath || {};
var interpreter = xpath.interpreter = {};

var extend = xpath.util.extend;
var Class = xpath.util.Class;


/**
 * Axis guides are functions that take 2 arguments; a node and a callback. A
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
 * return.
 *
 * @note When there are axes who have dashes (-) in the name, there is also a
 * corresponding guide with the dashes removed and camel-cased so it can be used
 * as an object method (ie. with a .). For example, there is a guide 
 * {@code guide['descendant-or-self'] and, also, {@code guide.descendantOrSelf}.
 */
var guide = xpath.interpreter.guide = {
    self: function(n, cb) {
        cb(n);
    },
    parent: function(n, cb) {
        if (n.parentNode)
            cb(n.parentNode);
    },
    child: function(n, cb) {
        var kids = n.childNodes;
        for (var i = 0, len = kids.length; i < len; i++)
            cb(kids[i]);
    },
    followingSibling: function(n, cb) {
        while (n = n.nextSibling)
            cb(n);
    },
    precedingSibling: function(n, cb) {
        while (n = n.previousSibling)
            cb(n);
    },
    ancestor: function(n, cb) {
        for (n = n.parentNode; n; n = n.parentNode)
            cb(n);
    },
    descendant: function(n, cb) {
        var nodeStack = Array.prototype.slice.call(n.childNodes).reverse();
        for (n = nodeStack.pop(); n !== undefined; n = nodeStack.pop()) {
            cb(n);
            for (var kids = n.childNodes, i = kids.length - 1; i >= 0; i--)
                nodeStack.push(kids[i]);
        }
    },
    following: function(n, cb) {
        for (; n; n = n.parentNode) {
            guide.followingSibling(n, function(sib) {
                    guide.descendant-or-self(sib);
                });
        }
    },
    preceding: function(n, cb) {
        for (; n; n = n.parentNode) {
            guide.precedingSibling(n, function(sib) {
                    guide.reverseOrderDescendant(sib, cb);
                    cb(sib);
                });
        }
    },
    ancestorOrSelf: function(n, cb) {
        cb(n);
        guide.ancestor(n, cb);
    },
    descendantOrSelf: function(n, cb) {
        cb(n);
        guide.descendant(n, cb);
    },
    attribute: function(n, cb) {
        // Ignore non-ELEMENT node types
        if (n.nodeType != 1)
            return;
            
        // .attributes is a NamedNodeMaps. In FF [] is overwritten... arrayish
        var attrs = n.attributes;
        for (var i = 0, len = attrs.length; i < len; i++)
            cb(attrs[i]);
    },
    namespace: function(n, cb) {
        /// @todo Write namespace guide
    },
    reverseOrderDescendant: function(n, cb) {
        /// @todo Re-write this function to be iterative, not recursive...
        
        if (n.hasChildNodes())
            for (var k = n.lastChild; k; k = k.previousSibling)
                guide.reverseDescendant(k);
        cb(n);
    },
    'following-sibling': guide.followingSibling,
    'previous-sibling': guide.previousSibling,
    'ancestor-or-self': guide.ancestorOrSelf,
    'descendant-or-self': guide.descendantOrSelf
};

})();
