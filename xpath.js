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

var xpath = window.xpath = window.xpath || function() {
    return xpath.evaluate.apply(this, arguments);
};


/**
 * Compile an XPath Expression and return an object that can be used to evaluate
 * the expression later. This returns an object with 1 method defined: eval.
 * The method eval takes 2 optional arguments: context and variables. 
 * 
 * The first, context, is the relative context to use when evaluating the 
 * expression. If the expression uses an absolute path, then the context's owner
 * document is used instead. If no context is passed in, then document is used.
 *
 * The argument variables is an object that maps strings (variables) to objects
 * (eg. strings, Nodes, NodeLists, etc.). This is used to map variables 
 * referenced in the expression (eg. $name) to values.
 *
 * The eval method will return whatever type is appropriate for the expression.
 * Lists of nodes are turned as arrays, not as NodeLists.
 */
xpath.compile = function(expression) {
    var lexer = new xpath.lexer.Lexer(expression);
    var ast = xpath.parser.parse(lexer);
    
    return {
            eval: function(context, variables) {
                context = context || document;
                var evalContext = new xpath.interpreter.EvaluationContext(context, variables);
                var interpreter = new xpath.interpreter.Interpreter(evalContext);
                return interpreter.interpret(ast);
            }
        };
};

/**
 * This is equivalent to calling: 
 *
 * {@code xpath.compile(expression).eval(context, variables)}
 */
xpath.evaluate = function(expression, context, variables) {
    return xpath.compile(expression).eval(context, variables);
};

})();
