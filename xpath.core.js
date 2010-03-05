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

function NOT_IMPLEMENTED() {
    throw new Error("Unsuppored function.");
}

xpath.type = {
    ANY_TYPE: 0,
    NUMBER_TYPE: 1,
    STRING_TYPE: 2,
    BOOLEAN_TYPE: 3,
    UNORDERED_NODE_ITERATOR_TYPE: 4,
    ORDERED_NODE_ITERATOR_TYPE: 5,
    UNORDERED_NODE_SNAPSHOT_TYPE: 6,
    ORDERED_NODE_SNAPSHOT_TYPE: 7,
    ANY_UNORDERED_NODE_TYPE: 8,
    FIRST_ORDERED_NODE_TYPE: 9
};

xpath.core = {
    last: function() {
        return this.last();
    },
    
    position: function() {
        return this.position();
    },
    
    count: function(nodeSet) {
        return nodeSet.length;
    },
    
    id: function(idString) {
        /// @todo FIXME: Not at all correct
        ids = idString.split(" ");
        var nodes = [];
        for (var i = 0; i < ids; i++)
            nodes.append(this.document.getElementById(ids[i]));
        return nodes;
    },
    
    'local-name': NOT_IMPLEMENTED,
    'namespace-uri': NOT_IMPLEMENTED,
    'name': NOT_IMPLEMENTED,
    'string': NOT_IMPLEMENTED,
    concat: NOT_IMPLEMENTED,
    'starts-with': NOT_IMPLEMENTED,
    contains: NOT_IMPLEMENTED,
    'substring-before': NOT_IMPLEMENTED,
    'substring-after': NOT_IMPLEMENTED,
    substring: NOT_IMPLEMENTED,
    'string-length': NOT_IMPLEMENTED,
    'normalize-space': NOT_IMPLEMENTED,
    translate: NOT_IMPLEMENTED,
    'boolean': NOT_IMPLEMENTED,
    not: function(val) { return !val; },
    'true': function() { return true; },
    'false': function() { return false; },
    lang: NOT_IMPLEMENTED,
    number: NOT_IMPLEMENTED,
    sum: NOT_IMPLEMENTED,
    floor: NOT_IMPLEMENTED,
    ceiling: NOT_IMPLEMENTED,
    round: NOT_IMPLEMENTED,
};
})();
