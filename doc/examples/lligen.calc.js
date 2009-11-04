/** @fileoverview
 * A simple example of using Lligen to define the grammar for a calculator.
 */
(function() {

var lligen = window.lligen;
lligen.calc = {};

// Define symbols

var EOS = 0,
    ADD = 1,
    SUB = 2,
    MUL = 3,
    DIV = 4,
    MOD = 5,
    ID  = 6,
    LP  = 7,
    RP  = 8,
    NUM = 9;

var Expr     = 20,
    ExprTail = 21,
    Term     = 22,
    TermTail = 23,
    Factor   = 24;



var g = new lligen.Grammar();

g.start(Expr)
    .produces([ Term, ExprTail ]);

g.symbol(ExprTail)
    .produces([ ADD, ExprTail ])
    .produces([ SUB, ExprTail ])
    .produces([ Expr ])
    .produces([ ]);

g.symbol(Term)
    .produces([ Factor, TermTail ]);
    
g.symbol(TermTail)
    .produces([ MUL, TermTail ])
    .produces([ DIV, TermTail ])
    .produces([ MOD, TermTail ])
    .produces([ 

})();
