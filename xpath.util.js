/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * Abstract Syntax Tree
 * 
 * Defines an Abstract Syntax Tree for an XPath expression, as well as a 
 * ASTVisitor class (implements all node-specific visit methods) for 
 * convenience, along with a Visitor "guide" that will take a simple visitor
 * class through all nodes.
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath = window.xpath || {};

xpath.util = {
    
    /**
     * Pretty simple function for "extending" an object with the properties of
     * another. It is a multi-argument function. The first argument is the 
     * "base" object we wish to extend. The following arguments are objects 
     * whose properties will be copied to the base object. If the base object 
     * has a prop. of the same name, it will be overwritten. It is also extended
     * in order of the arguments, so if 2 objects whose properties we are
     * copying have props of the same name, the one that comes later in the 
     * argument list will be used.
     *
     * @return The base object (ie. the first argument given)
     */
    extend: function(dest) {
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i];
            for (var nm in src)
                dest[nm] = src[nm]
        }
        return dest;
    },
    
    /**
     * Fairly simple method that will return a new "class." This is based off of 
     * Prototype's Class.create function, though simplified/dumbed down. So, 
     * kudos to them. Head over to <a href="http://www.prototypejs.org/">the 
     * prototype web site</a> to learn more. The function takes in an arbitrary
     * number of arguments. The arguments can either be existing classes (ie.
     * Functions) or objects. A class is then returned whose prototype instance
     * has the same properties as the arguments' prototype instance, in the case
     * of functions, or just the arguments' properties, in the case of objects.
     * A special method/property, {@code init}, will be used as the class
     * constructor.
     *
     * @note class is reserved for future use, so I use Class... don't like it
     */
    Class: function() {
        function Klass() {
            this.init.apply(this, arguments);
        }
        
        for (var i = 0; i < arguments.length; i++) {
            var a = arguments[i];
            xpath.util.extend(Klass.prototype, 
                             typeof a == "function" ? a.prototype : a);
        }
        Klass.prototype.init = Klass.prototype.init || function() {};
        return (Klass.prototype.constructor = Klass);
    },
    
    /**
     * Searches for val in list and returns its index. If val cannot be found in
     * list, then this returns the index at which to insert val, while keeping 
     * the list in sorted order. If l or r are given, then this operates on a 
     * portion of the list, between [l,r). If cmp is give, then it will be used 
     * to compare 2 elements. cmp should be a function that takes 2 arguments, a
     * and b, and returns < 0 if a < b, 0 if a == b, > 0 if a > b. If cmp is not
     * given, then the "natural" ordering (< and ==) is used instead. This is
     * guaranteed to run in O(log n) time, where n = r - l.
     *
     * @param list An array to search for val within
     * @param val The value to search for in the array
     * @param l The lower bound (inclusive) of the array to search in
     * @param r The upper bound (exclusive) of the array to search in
     * @param cmp A comparator to use to determine ordering
     * @return The index of val in the list (or where it should go)
     */
    binarySearch: function(list, val, l, r, cmp) {
        l = l || 0;
        r = (!r || r <= l) ? list.length : r;
        while (l < r) {
            c = Math.floor((l + r) / 2);
            if (list[c] == val)
                return c;
            if (cmp && cmp(list[c], val) < 0 || list[c] < val)
                l = c + 1;
            else
                r = c;
        }
        return l;
    },
    
    each: function(list, cb, data) {
        for (var i = 0, len = list.length; i < len; i++)
            if (cb.call(list[i], i, data) === false)
                return false;
        return true;
    },
    
    normalizeWhiteSpace: function(str) {
        return str.replace(/(^[\u0020\u0009\u000D\u000A]+|[\u0020\u0009\u000D\u000A]+$)/g, "")
                  .replace(/[\u0020\u0009\u000D\u000A]+/g, " ");
    }
};

})();
