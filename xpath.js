/* Copyright (c) 2009, International Joint Commission
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/** @fileoverview
 * Declares the top-level namespace and some utility functions.
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */

(function() {

var xpath = window.xpath = {};


/* ==========================================================================
 * Utilties functions
 * ========================================================================== */


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
};

})();
