/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

(function(){

if (typeof console === 'undefined') {
    var nop = function() {};
    window.console = {
        log : nop,
        debug : nop,
        info : nop,
        warn : nop,
        error : nop,
        assert : nop,
        dir : nop,
        dirxml : nop,
        trace : nop,
        group : nop,
        groupEnd : nop,
        groupCollapsed : nop,
        time : nop,
        timeEnd : nop,
        profile : nop,
        profileEnd : nop,
        count : nop,
        clear : nop
    };
};

})();
