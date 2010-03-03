/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */
/** @fileoverview
 * Constructs the XPath Grammar using Lligen parser generator JS library (also
 * currently part of this project).
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath = window.xpath || {};

var sym = xpath.symbol;
var g = xpath.grammar = new lligen.Grammar({symbolToString: xpath.symbol.symbolToString});
var ast = xpath.ast;

g.start( sym.S )
    .produces([ sym.Expr ], function(vals) { return new ast.XPathExprNode(vals[0]); });

g.symbol( sym.LocationPath )
    .produces([ sym.RelativeLocationPath ], function(vals) { return vals[0]; })
    .produces([ sym.AbsoluteLocationPath ], function(vals) { return vals[0]; });

g.symbol( sym.AbsoluteLocationPath )
    .produces([ sym.OP_PATH_SLASH, sym.AbsoluteLocationPathTail ], 
                function(vals) {
                    vals[1].isAbsolute = true;
                    return vals[1];
                })
    .produces([ sym.OP_PATH_DBL_SLASH, sym.AbsoluteLocationPathTail ],
              function(vals) {
                  vals[1].prepend(new ast.StepNode('descendant-or-self', new ast.NodeTestNode('*', 'node')));
                  vals[1].isAbsolute = true;
                  return vals[1];
              });
    
g.symbol( sym.AbsoluteLocationPathTail )
    .produces([ sym.RelativeLocationPath ], 
                function(vals) {
                    return vals[0]; 
                })
    .produces([ ], 
                function(vals) {
                    return new PathNode(new ast.StepNode('self', new ast.NodeTestNode('*', 'node'), null)); 
                });

g.symbol( sym.RelativeLocationPath )
    .produces([ sym.Step, sym.RelativeLocationPathTail ],
              function(vals) {
                  return vals[1].prepend(vals[0]);
              });

g.symbol( sym.RelativeLocationPathTail )
    .produces([ sym.OP_PATH_SLASH, sym.Step, sym.RelativeLocationPathTail ],
              function(vals) {
                  return vals[2].prepend(vals[1]);
              })
    .produces([ sym.OP_PATH_DBL_SLASH, sym.Step, sym.RelativeLocationPathTail ],
              function(vals) {
                  vals[2].prepend(vals[1]);
                  vals[2].prepend(new ast.StepNode('descendant-or-self', new ast.NodeTestNode('*', 'node')));
                  return vals[2];
              })
    .produces([ ], function() { return new ast.PathNode(); });

g.symbol( sym.Step )
    .produces([ sym.AxisSpecifier, sym.NodeTest, sym.PredicateList ], function(vals) {
            return new ast.StepNode(vals[0], vals[1], vals[2]);
        })
    .produces([ sym.DOT ],      function(vals) {
            return new ast.StepNode('self', new ast.NodeTestNode('*', 'node'));
        })
    .produces([ sym.DOT_DOT ],  function(vals) {
            return new ast.StepNode('parent', new ast.NodeTestNode('*', 'node'));
        });

g.symbol( sym.PredicateList )
    .produces([ sym.Predicate, sym.PredicateList ],     function(vals) {
            return vals[1].prepend(vals[0]);
        })
    .produces([ ], function(vals) { return new ast.PredicateListNode(); });

g.symbol( sym.AxisSpecifier )
    .produces([ sym.AXIS_NAME ],    function(vals) { return vals[0]; })
    .produces([ sym.AT_SIGN ],      function(vals) { return 'attribute'; })
    .produces([ ],                  function(vals) { return 'child'; });

g.symbol( sym.NodeTest )
    .produces([ sym.NAME_TEST ], function(vals) { return new ast.NodeTestNode(vals[0]); })
    .produces([ sym.NODE_TYPE, sym.LEFT_PAREN, sym.ArgumentList, sym.RIGHT_PAREN ], function(vals) { 
            return new ast.NodeTestNode('*', vals[0], vals[2]);
        });

g.symbol( sym.Predicate )
    .produces([ sym.LEFT_BRACKET, sym.Expr, sym.RIGHT_BRACKET ], function(vals) { return new ast.PredicateNode(vals[1]); });

g.symbol( sym.Expr )
    .produces([ sym.OrExpr ], function(vals) { return vals[0]; });

g.symbol( sym.PrimaryExpr )
    .produces([ sym.VARIABLE_REF ],                             function(vals) { return new ast.VariableRefNode(vals[0]); })
    .produces([ sym.LEFT_PAREN, sym.Expr, sym.RIGHT_PAREN ],    function(vals) { return vals[1]; })
    .produces([ sym.LITERAL ],                                  function(vals) { return new ast.LiteralNode(vals[0]); })
    .produces([ sym.NUMBER ],                                   function(vals) { return new ast.NumberNode(vals[0]); })
    .produces([ sym.FunctionCall ],                             function(vals) { return vals[0]; });

g.symbol( sym.FunctionCall )
    .produces([ sym.FUNC_NAME, sym.LEFT_PAREN, sym.ArgumentList, sym.RIGHT_PAREN ], function(vals) {
            return new ast.FunctionCallNode(vals[0], vals[2]);
        });

g.symbol( sym.ArgumentList )
    .produces([ sym.Expr, sym.ArgumentListTail ], function(vals) {
            return vals[1].prepend(vals[0]);
        })
    .produces([ ], function(vals) { return new ast.ArgumentListNode(); });
    
g.symbol( sym.ArgumentListTail )
    .produces([ sym.COMMA, sym.Expr, sym.ArgumentListTail ], function(vals) {
            return vals[2].prepend(vals[1]);
        })
    .produces([ ], function() { return new ast.ArgumentListNode(); });


/*
 * Path expressions
 */

g.symbol( sym.UnionExpr )
    .produces([ sym.PathExpr, sym.UnionExprTail ],
              function(vals) {
                  var root = vals[0],
                      exprs = vals[1];
                  
                  while (exprs.length > 0)
                      root = new ast.UnionExprNode(root, exprs.pop());
                  return root;
              });
    
g.symbol( sym.UnionExprTail )
    .produces([ sym.OP_PATH_UNION, sym.PathExpr, sym.UnionExprTail ],
              function(vals) {
                  vals[2].push(vals[1]);
                  return vals[2];
              })
    .produces([ ], function() { return []; });

g.symbol( sym.PathExpr )
    .produces([ sym.LocationPath ],
                function(vals) {
                    return new ast.PathExprNode(null, vals[0]);
                })
    .produces([ sym.FilterExpr, sym.PathExprTail ],
                function(vals) {
                    if (vals[1]) {
                        return new ast.PathExprNode(vals[0], vals[1]);
                    } else {
                        return vals[0];
                    }
                });
    
g.symbol( sym.PathExprTail )
    .produces([ sym.OP_PATH_SLASH, sym.RelativeLocationPath ],
                function(vals) {
                    return vals[1];
                })
    .produces([ sym.OP_PATH_DBL_SLASH, sym.RelativeLocationPath ],
                function(vals) {
                    vals[1].prepend(new ast.StepNode('descendant-or-self', new ast.NodeTestNode('*', 'node')));
                    return vals[1];
                })
    .produces([ ],
                function(vals) {
                    return null;
                });

g.symbol( sym.FilterExpr )
    .produces([ sym.PrimaryExpr, sym.FilterExprTail ],
              function(vals) {
                  if (vals[1].isEmpty())
                      return vals[0];
                  else
                      return new ast.FilterExprNode(vals[0], vals[1]);
              });
    
g.symbol( sym.FilterExprTail )
    .produces([ sym.Predicate, sym.FilterExprTail ],
              function(vals) {
                  return vals[1].prepend(vals[0]);
              })
    .produces([ ], function() { return new ast.PredicateListNode(); });


/*
 * Logical boolean operators (and, or)
 */

g.symbol( sym.OrExpr )
    .produces([ sym.AndExpr, sym.OrExprTail ], function(vals) {
    
            // OrExprTail is a stack of or'd expressions to put into a tree
            
            var root = vals[0], 
                exprs = vals[1];
            
            while (exprs.length > 0)
                root = new ast.OrExprNode(root, exprs.pop());
            return root;
        });
g.symbol( sym.OrExprTail )
    .produces([ sym.OP_BOOL_OR, sym.AndExpr, sym.OrExprTail ], function(vals) {
    
            // We maintain a list of arguments in an or expression in a stack.
            // So, "a or b or c" becomes [c, b, a].
             
            vals[2].push(vals[1]);
            return vals[2];
        })
    .produces([ ], function() { return []; });

g.symbol( sym.AndExpr )
    .produces([ sym.EqualityExpr, sym.AndExprTail ], function(vals) {
            var root = vals[0], 
                exprs = vals[1];
            
            while (exprs.length > 0)
                root = new ast.AndExprNode(root, exprs.pop());
            return root;
        });
g.symbol( sym.AndExprTail )
    .produces([ sym.OP_BOOL_AND, sym.EqualityExpr, sym.AndExprTail ], function(vals) {
            vals[2].push(vals[1]);
            return vals[2];
        })
    .produces([ ], function() {
            return [];
        });
        
        
/*
 * Relational Expressions (==, !=, <, >, <=, >=).
 */

g.symbol( sym.EqualityExpr )
    .produces([ sym.RelationalExpr, sym.EqualityExprTail ], function(vals) {
            var root = vals[0],
                nodes = vals[1];
            
            while (nodes.length > 0) {
                var n = nodes.pop();
                n.lhs = root;
                root = n;
            }
            return root;
        });
        
g.symbol( sym.EqualityExprTail )
    .produces([ sym.OP_REL_EQ, sym.RelationalExpr, sym.EqualityExprTail ], function(vals) {
            vals[2].push(new ast.EqExprNode(null, vals[1]));
            return vals[2];
        })
    .produces([ sym.OP_REL_NEQ, sym.RelationalExpr, sym.EqualityExprTail ], function(vals) {
            vals[2].push(new ast.NeqExprNode(null, vals[1]));
            return vals[2];
        })
    .produces([ ], function() {
            return [];
        });

g.symbol( sym.RelationalExpr )
    .produces([ sym.AdditiveExpr, sym.RelationalExprTail ],
              function(vals) {
                  var root = vals[0],
                      nodes = vals[1];
                  
                  while (nodes.length > 0) {
                      var n = nodes.pop();
                      n.lhs = root;
                      root = n;
                  }
                  return root;
              });
    
g.symbol( sym.RelationalExprTail )
    .produces([ sym.OP_REL_LT, sym.AdditiveExpr, sym.RelationalExprTail ],
              function(vals) {
                  vals[2].push(new ast.LtExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ sym.OP_REL_GT, sym.AdditiveExpr, sym.RelationalExprTail ],
              function(vals) {
                  vals[2].push(new ast.GtExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ sym.OP_REL_LTE, sym.AdditiveExpr, sym.RelationalExprTail ], 
              function(vals) {
                  vals[2].push(new ast.LteExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ sym.OP_REL_GTE, sym.AdditiveExpr, sym.RelationalExprTail ], 
              function(vals) {
                  vals[2].push(new ast.GteExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ ], function() {
            return [];
        });


/*
 * Additive Expressions (+/-)
 */

g.symbol( sym.AdditiveExpr )
    .produces([ sym.MultiplicativeExpr, sym.AdditiveExprTail ],
              function(vals) {
                  var root = vals[0],
                      nodes = vals[1];
                  
                  while (nodes.length > 0) {
                      var n = nodes.pop();
                      n.lhs = root;
                      root = n;
                  }
                  return root;
              });
    
g.symbol( sym.AdditiveExprTail )
    .produces([ sym.OP_ARI_PLUS, sym.MultiplicativeExpr, sym.AdditiveExprTail ],
              function(vals) {
                  vals[2].push(new ast.AddExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ sym.OP_ARI_MINUS, sym.MultiplicativeExpr, sym.AdditiveExprTail ],
              function(vals) {
                  vals[2].push(new ast.SubExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ ], function() { return []; });


/*
 * Multiplicative Expressions (mul/div/mod/*)
 */

g.symbol( sym.MultiplicativeExpr )
    .produces([ sym.UnaryExpr, sym.MultiplicativeExprTail ],
              function(vals) {
                  var root = vals[0],
                      nodes = vals[1];
                  
                  while (nodes.length > 0) {
                      var n = nodes.pop();
                      n.lhs = root;
                      root = n;
                  }
                  
                  return root;
              });
    
g.symbol( sym.MultiplicativeExprTail )
    .produces([ sym.OP_ARI_MUL, sym.UnaryExpr, sym.MultiplicativeExprTail ],
              function(vals) {
                  vals[2].push(new ast.MulExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ sym.OP_ARI_DIV, sym.UnaryExpr, sym.MultiplicativeExprTail ],
              function(vals) {
                  vals[2].push(new ast.DivExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ sym.OP_ARI_MOD, sym.UnaryExpr, sym.MultiplicativeExprTail ],
              function(vals) {
                  vals[2].push(new ast.ModExprNode(null, vals[1]));
                  return vals[2];
              })
    .produces([ ], function() { return []; });


/*
 * Unary Expressions (single expression or -expr)
 */

g.symbol( sym.UnaryExpr )
    .produces([ sym.UnionExpr ], function(vals) { return vals[0]; })
    .produces([ sym.OP_ARI_MINUS, sym.UnaryExpr ], 
              function(vals) { 
                  return new ast.NegExprNode(vals[1]); 
              });

})();
