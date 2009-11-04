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
 * Lligen LL(1) parser generator
 *
 * Lligen is a simple, pure Javascript, LL(1) parser generator.
 *
 * @author Thomas Switzer (switzert@windsor.ijc.org)
 *
 * @note As you may or may not know, LL(1) grammars tend to be fairly 
 * restrictive in their ability. However, there are still a lot of useful 
 * Grammars that can be written as LL(1). For instance, this parser generator 
 * was originally written (and used) for an XPath & XPointer parser. The 
 * difficulty really comes in writing the Grammar so that it is LL(1).
 */

(function() {

if (typeof window.lligen == "undefined")
    window.lligen = {};
var lligen = window.lligen;


/** @class lligen.Grammar
 *
 * Class for a grammar. Let's you define a grammar in Javascript in a nice easy-
 * to-read (*ahem*) way. This function takes 1 (optional) argument; a map that
 * that specifies the optional arguments for this class. The map can specify 3
 * arguments; 'cache', 'eos', and 'symbolToString'. The 'cache' property is a 
 * boolean indicating whether or not a cache should be used to help speed up 
 * parser generation. The 'eos' property specifies the symbol returned by the 
 * lexer that marks the EOS (End Of Stream) and defaults to {@code 0}. The
 * 'symbolToString' property is a function that takes a symbol as input and
 * returns a human readable version of the symbol. This is most useful for
 * debugging grammars.
 *
 * An instance of the class really defines only a handful of public methods. The
 * only 2 important methods for defining the grammar (the productions) are 
 * {@code start} and {@code symbol}. Both are used to start the definition of
 * a production. Both these methods define the LHS of the production and return
 * an object with a method {@code produces} defined that lets you specify the
 * RHS of the productions. {@code produces} returns itself, which allows for
 * chaining multiply calls to {@code produces} from a single call to 
 * {@code start} or {@code symbol}. {@code start} is meant to be called exactly
 * once and defines the start symbol of the grammar. All other productions
 * thereafter are defined using {@code symbol}.
 *
 * The next important method defined is {@code newParser}, which takes a lexer
 * as an argument and returns a parser that will be able to parse a language
 * using the defined grammar. The parser returned has one method defined, 
 * {@code parse}. This will actually parse the text using the lexer and return
 * the value returned in the start symbol production.
 *
 * All Grammars defined must be valid LL(1) grammars to be parsable. Ensuring a
 * grammar is LL(1) can require a bit of work. Please check out the examples in
 * the {@code examples/} directory to see how to use Lligen.
 *
 * @param opts A map specifying the optional arguments
 */
var Grammar = lligen.Grammar = function(opts) {
    opts = extend({
            cache: false, 
            eos: 0, 
            symbolToString: function(s) { return "" + s; }
        }, opts);
    
    this.rules = [];
    this.prods = [];
    this.firsts = [];
    this.follows = [];
    this.startSymbol = undefined;
    this.eos = opts.eos;
    this.symbolToString = opts.symbolToString;
    
    // Quick and dirty cache for some of the grammar debugging functions to use
    
    var useCache = opts.cache ? true : false;
    var cache = this.cache = {};
    this.cache.get = function(k) { if (useCache && k in cache) return cache[k]; return undefined; };
    this.cache.has = function(k) { if (useCache && k in cache) return true; return false; };
    this.cache.dirty = function(k) { if (useCache && k in cache) delete cache[k]; };
    this.cache.update = function(k, v) { if (useCache) cache[k] = v; };
};


/**
 * Returns all the terminals in the Grammar. Specifically, this will return all
 * symbols in the Grammar that are not the left-hand side of any production.
 *
 * @return an array of symbols
 */
Grammar.prototype.terminals = function() {
    if (this.cache.has('terminals'))
        return this.cache.get('terminals');

    var inT = {};
    var t = [];
    for (var i = 0, ilen = this.rules.length; i < ilen; i++) {
        var rule = this.rules[i];
        
        for (var j = 0, jlen = rule.rhs.length; j < jlen; j++) {
            var s = rule.rhs[j];
            
            if (!this.prods[s] && !inT[s])
                t.push(s);
        }
    }
    
    this.cache.update('terminals', t);
    return t;
};


/**
 * Returns true if the symbol {@code s} is a non-terminal, false otherwise.
 */
Grammar.prototype.isNonTerminal = function(s) {
    return this.prods[s] !== undefined;
};


/**
 * Returns all the non-terminals in the Grammar. Specifically, this will return
 * all symbols in the grammary whom are the left-hand side of at least 1 
 * production.
 */
Grammar.prototype.nonTerminals = function() {
    if (this.cache.has('nonTerminals'))
        return this.cache.get('nonTerminals');
        
    var nt = [];
    for (k in this.prods)
        nt.push(k);
    
    this.cache.update('nonTerminals', nt);
    return nt;
};


/**
 * Defines the start symbol of the grammar. This functions identically to 
 * {@link symbol}, with the exception that {@code symbol} is
 * marked as the start symbol in this grammar. This must be called once, and
 * only once, for any grammar definition.
 *
 * @param The start symbol
 * @return An object with method {@code produces} defined
 * @public
 */
Grammar.prototype.start = function(symbol) {
    this.startSymbol = symbol;
    return this.symbol(symbol);
};


/**
 * Returns an object with a method 'produces' defined on it. This method takes
 * 2 arguments, an array of symbols (terminals and non-terminals) and a function
 * to call whenever such a production rule is applied. When called, 
 * {@code produces} adds a new production rule to the grammar, with 
 * {@code symbol} as the Left-Hand Side of the production and the array given to
 * the {@code produces} method as the Right-Hand Side. {@code produces} will 
 * also return the symbol object it is defined in, which allows a chaining of 
 * production rules 
 * (eg. grammar.symbol(A).produces([ a, B, C]).produces([ d, e, F ]); )
 * The 2nd argument to produces is a function which will be called for that
 * production rule. The callback function will be passed 1 argument; a list of
 * the values for each of the symbols on the RHS of the production (ie. in the
 * array). The indexes will be the same; if a symbol does not generate a value,
 * then the value stored in the array is undefined.
 *
 * @param symbol the symbol whose productions are to be defined
 * @return an object that can be used to define productions of <code>symbol</code>
 * @public
 */
Grammar.prototype.symbol = function(symbol) {
    var grammar = this;
    
    return {
        produces: function(str, cb) {
            grammar.addRule(symbol, str, cb);
            return this;
        }
    };
};


/**
 * Adds a rule to this grammar. The rule can be referenced later with <code>
 * ruleNum</code>. In particular, <code>l</code> is the Left-Hand Side of the
 * rule and <code>r</code> is the right hand side of the rule. <code>l</code>
 * will always be a single non-terminal and <code>r</code> will be an array of
 * terminals and non-terminals that define a single production of <code>l</code>.
 *
 * @param l a non-terminal that is the left-hand side of the produciton
 * @param r an array of symbols that is the right-hand side of the production
 * @param callback a function to callback once this rule has been completely processed
 */
Grammar.prototype.addRule = function(l, r, callback) {
    var ruleNum = this.rules.length;
    
    if (typeof l !== 'number')
        throw new TypeError("Left-hand side of production must be an integer (symbol) (rule: " + ruleNum + ")");
    for (var i = 0, len = r.length; i < len; i++) {
        if (typeof r[i] !== 'number')
            throw new TypeError("Right-hand side of produciton must be an array of integers (symbols) (rule: " + ruleNum + ")");
    }
    
    this.rules[ruleNum] = { rule: ruleNum, lhs: l, rhs: r, cb: callback };
    if (!this.prods[l])
        this.prods[l] = [ ruleNum ];
    else
        this.prods[l].push(ruleNum);
};


/**
 * Returns all the rules produced by the non-terminal <code>symbol</code>.
 */
Grammar.prototype.productionRules = function(symbol) {
    if (isNaN(symbol))
        throw new TypeError("symbol must be an integer (symbol was '" + (typeof symbol) + "')");
    if (!this.prods[symbol])
        return [];
    
    return this.prods[symbol].slice();
};

/**
 * Returns all of the terminals that can appear first in all productions of the
 * non-terminal <code>symbol</code>. This can include the empty string.
 *
 * @param symbol a non-terminal symbol
 * @return array of the first terminals from productions of <code>symbol</code>
 */
Grammar.prototype.first = function(symbol, ruleNum) {
    if (this.firsts[symbol]) {
        if (typeof ruleNum !== 'undefined') {
            return this.firsts[symbol][ruleNum].slice();
            
        } else {
            var f = [];
            for (r in this.firsts[symbol])
                f = f.concat(this.firsts[symbol][r]);
            return f;
        }
    }
    
    var first = [];
    var ruleNums = this.prods[symbol], r;
    
    for (var i = 0, len = ruleNums.length; i < len; i++) {
        r = this.rules[ruleNums[i]];
        first[r.rule] = this.firstProd(r.rhs);
    }
    
    this.firsts[symbol] = first;
    
    // We have populated the fields, so this will work now
    
    return this.first(symbol, ruleNum);
};


/**
 * Returns all of the terminals that can appear first in any production of the
 * string <code>prod</code>.
 *
 * @param prod an array of symbols (can be any mix of terminals and non-terminals)
 * @return array of the first terminals that can be derived from <code>prod</code>
 */
Grammar.prototype.firstProd = function(prod) {
    if (!prod) {
        return [ -1 ];
        
    } else if (!this.isNonTerminal(prod[0])) {
        return [ prod[0] ];
        
    } else {
        var first = [];
        var i, j, tmp;
        var prodEmpty = true;
        
        for (i = 0; i < prod.length && prodEmpty; i++) {
            tmp = this.first(prod[i]);
            prodEmpty = false;
            
            for (j = 0; j < tmp.length; j++) {
                if (tmp[j] >= 0)
                    first.push(tmp[j]);
                else
                    prodEmpty = true;
            }
        }
        
        if (prodEmpty)
            first.push(-1); // Production is equal to the empty string
        
        return first;
    }
};


/**
 * Returns an array of terminals that can follow <code>symbol</code>.
 *
 * @param symbol a non-terminal, whose follow set will be returned
 * @return an array of terminals
 */
Grammar.prototype.follow = function(symbol) {
    if (this.prods.length == 0)
        return [];
    
    if (this.follows.length == 0)
        this.createFollowSets();
    
    if (!this.follows[symbol])
        throw new Error("symbol is not a valid non-terminal");
        
    return this.follows[symbol];
}


/**
 * Calculates the follow set for all non-terminals in this grammar. This 
 * function must be called before using the follows member.
 */
Grammar.prototype.createFollowSets = function() {
    var follows = [];
    var incomplete = [];
    var addSet = [];
    
    for (nt in this.prods) {
        follows[nt] = [];
    }
    
    follows[this.startSymbol].push(this.eos);
    
    // Create the initial follow set by quickly looping over all productions.
    // Some follow sets will necessarily remain incomplete, these are taken
    // care of later.
    
    for (ruleNum in this.rules) {
        var rule = this.rules[ruleNum];
        var rhs = rule.rhs;
        
        for (var i = 0, len = rhs.length; i < len; i++) {
            if (this.isNonTerminal(rhs[i])) {
            
                // Note: rhs.slice(i+1) === [] implies next = [ -1 ]
                var next = this.firstProd(rhs.slice(i + 1));
                
                for (var j = 0, jlen = next.length; j < jlen; j++) {
                    if (next[j] >= 0) {
                        follows[rhs[i]][next[j]] = true;
                        
                    } else {
                        if (rule.lhs != rhs[i])
                            addSet.push({add: rule.lhs, to: rhs[i]});
                        incomplete[rhs[i]] = true;
                    }
                }
            }
        }
    }
    
    // Keep iterating over addSet until it is empty. Eventually there will be no
    // more incomplete follow-sets left, at which point we are done!
    
    while (addSet.length > 0) {
        var i = 0;
        var stillIncomplete = [];
        
        while (i < addSet.length) {
            var request = addSet[i];
            
            if (!incomplete[request.add]) {
                var adds = [];
                for (var t in follows[request.add])
                    follows[request.to][t] = true;
                
                addSet.splice(i, 1);
                
            } else {
                stillIncomplete[request.to] = true;
                i++;
            }
        }
        
        var tmp = incomplete;
        incomplete = stillIncomplete;
        delete tmp;
    }
    
    for (nt in follows) {
        follows[nt] = keyset(follows[nt], function(k) { return parseInt(k); });
    }
    
    this.follows = follows;
};


/**
 * Returns a string version of the <code>ruleNum</code>-th rule. The string
 * returned will be of the form "LHS ::= SymNameX SymNameY TERMINALZ". In order
 * to return human readable strings, the opts argument passed in to the Grammar
 * constructor should have the symbolToString property set to a function that
 * can return a human readable string in place of a symbol.
 */
Grammar.prototype.ruleToString = function(ruleNum) {
    var rule = this.rules[ruleNum];
    var prods = [];
    
    for (var i = 0; i < rule.rhs.length; i++)
        prods.push(this.symbolToString(rule.rhs[i]));
    
    return this.symbolToString(rule.lhs) + " ::= " + prods.join(" ");
};


/**
 * Constructs a parse table from this grammar and returns it.
 */
Grammar.prototype.parseTable = function() {
    if (this.cache.has('parse-table'))
        return this.cache.get('parse-table');
        
    if (this.follows.length == 0)
        this.createFollowSets();

    var tbl = [];
    
    for (nt in this.prods) {
        var ruleNums = this.prods[nt];
        tbl[nt] = [];
        
        for (var i = 0, ilen = ruleNums.length; i < ilen; i++) {
            var addFollow = false;
            var ruleNum = ruleNums[i];
            var first = this.first(nt, ruleNum);
            
            for (var j = 0, jlen = first.length; j < jlen; j++) {
                var tok = first[j];
                
                if (tok >= 0) {
                    if (tbl[nt][tok])
                        throw new Error("First/First conflict (rule " + ruleNum + ": " + this.ruleToString(ruleNum) + ")");
                    tbl[nt][tok] = ruleNum;
                } else {
                    addFollow = true;
                }
            }
            
            if (addFollow) {
                var follow = this.follow(nt);
                for (var j = 0, jlen = follow.length; j < jlen; j++) {
                    var tok = follow[j];
                    
                    if (tbl[nt][tok])
                        throw new Error("First/Follow conflict (rule " + ruleNum + ": " + this.ruleToString(ruleNum) + ")");
                    tbl[nt][tok] = ruleNum;
                }
            }
        }
    }
    
    this.cache.update('parse-table', tbl);
    return tbl;
};


/**
 * Creates and returns a parser for this grammar. The parser returned will have
 * one method defined, <code>parse</code>, that takes no arguments and returns
 * the value returned by the functioned defined on the start symbol.
 *
 * @return a new parser
 * @public
 */
Grammar.prototype.newParser = function() {
    var p = new Parser(this.parseTable(), this.startSymbol, this.rules);
    return p;
};


var Parser = lligen.Parser = function(parseTable, startSymbol, rules) {
    this.parseTable = parseTable;
    this.startSymbol = startSymbol;
    this.rules = rules;
};

Parser.prototype.parse = function(lexer) {
    var pt = this.parseTable;
    var symStack = [ 0, this.startSymbol ];
    var tok = lexer.nextToken();
    
    var sym, rule = this.rules[0], ruleStack = [];
    var vals = [];
    
    do {
        sym = symStack.pop();
        
        if (tok != sym) {
            if (tok in pt[sym]) {
                ruleStack.push({ r: rule, v: vals });
            
                rule = this.rules[pt[sym][tok]];
                vals = [];
                
                // Apply the rule (generating new symbols on the stack)
                
                /// @todo What is faster sym.concat(arr.slice().reverse()) 
                ///       or for (i = 0; i < arr.length; i++) sym.push(arr[i]);
                symStack = symStack.concat(rule.rhs.slice().reverse());
                
            } else {
                throw new Error("Parse error: unexpected symbol " + tok + " ('" + lexer.getValue() + "')");
            }
            
        } else {
            vals.push(lexer.getValue());
            tok = lexer.nextToken();
        }
        
        while (ruleStack.length && vals.length == rule.rhs.length) {
        
            // Call the user-defined function now that we have all required args
            
            var result = rule.cb ? rule.cb(vals) : null;
            
            var prev = ruleStack.pop();
            rule = prev.r;
            vals = prev.v;
            vals.push(result);
        }
        
    } while (symStack.length > 0);
    
    return vals[0];
};


/* ==========================================================================
 * Utility functions used by Lligen
 * ========================================================================== */


/** 
 * Returns an array with all duplicate items from <code>orig</code> removed. 
 * This will modify the array <code>orig</code> (it will sort it). If this is
 * not desired, then only pass a copy of the array in (eg. unique(orig.slice()))
 *
 * @param orig an array with duplicate items
 * @return an array with all of the unique items from orig (no duplicates)
 */
function unique(orig) {
    var uniq = [], prev = undefined;
    orig.sort();
    
    for (var i = 0; i < orig.length; i++) {
        if (orig[i] !== prev) {
            uniq.push(orig[i]);
            prev = orig[i];
        }
    }
    return uniq;
}


/**
 * Returns the set or properties of an object (ie. the "keys").
 *
 * @param obj A Javascript object whose property names will be returned
 * @param funk An optional function, takes key as arg, returns val to put in set
 * @return An array of strings of property names in {@code obj}
 */
function keyset(obj, funk) {
    funk = funk || function(k) { return k; };
    var keys = [];
    for (k in obj)
        keys.push(funk(k));
    return keys;
}


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
function extend(dest) {
    for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        for (var nm in src)
            dest[nm] = src[nm]
    }
    return dest;
}

})();
