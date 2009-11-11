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

var xpath = window.xpath;

var ast = xpath.ast = {};

// Create a simple "class"
var Class = xpath.util.Class;



/******************************************************************************
 * "Abstract" node classes. Never instantiate these.
 ******************************************************************************/


/**
 * Super class for all Nodes. The function, accept, is meant to be overridden
 * by all subclasses, except "abstract" ones.
 */
ast.Node = Class({
    /**
     * Called when traversing the tree. The Node object will take the visitor 
     * object and call the class specific visit method on it.
     */
    accept: function(visitor) {
        // Call the node-specific visit method; eg. 
        // return visitor.visitSomeNode(this);
    }
});


/**
 * Super class for all nodes that can be treated as expressions.
 */
ast.ExprNode = Class(ast.Node);


/**
 * Super class for all nodes that represent a binary operation. A binary 
 * operation has a <code>lhs</code> and a <code>rhs</code> as children. Their
 * types depend on the actual operation.
 */
ast.BinaryOpNode = Class(ast.ExprNode, {
    init: function(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
    }
});



/**
 * Top level node. This should always be at the root of the AST.
 */
ast.XPathExprNode = Class(ast.ExprNode, {
    init: function(expr) {
        this.expr = expr;
    },
    accept: function(visitor) {
        return visitor.visitXPathExprNode(this);
    }
});



/******************************************************************************
 * Paths
 ******************************************************************************/


/**
 * A PathNode represents an XPath query as a list of steps. An attribute, 
 * isAbsolute, determines whether or not the path defined is an absolute path
 * (true) or a relative path (false).
 */
ast.PathNode = Class(ast.Node, {
    init: function(steps) {
        this.isAbsolute = false;
        this.steps = (typeof steps == 'undefined' ? [] : steps);
    },
    prepend: function(step) {
            this.steps.unshift(step);
            return this;
    },
    accept: function(visitor) { 
        return visitor.visitPathNode(this); 
    }
});


/**
 * StepNode represents a single step in a path. A step has an axis, a node test,
 * and any predicates that refine the set.
 */
ast.StepNode = Class(ast.Node, {
    init: function(axis, test, predicates) {
        this.axis = axis;
        this.nodeTest = test;
        this.predicates = (typeof predicates == "undefined" ? new ast.PredicateListNode() : predicates);
    },
    accept: function(visitor) {
        return visitor.visitStepNode(this);
    }
});


/**
 * Holds a list of predicates.
 */
ast.PredicateListNode = Class(ast.Node, {
    init: function(initElem) {
        this.predicates = initElem ? [ initElem ] : [];
    },
    prepend: function(elem) {
        this.predicates.unshift(elem);
        return this;
    },
    isEmpty: function() {
        return this.predicates.length == 0;
    },
    accept: function(visitor) {
        return visitor.visitPredicateListNode(this);
    }
});


/**
 * PredicateNode represents a single Predicate in a predicate list that followed
 * some node test. As such, a PredicateNode has one child, <code>expr</code>,
 * a boolean expression.
 */
ast.PredicateNode = Class(ast.Node, {
    init: function(expr) {
        this.expr = expr;
    },
    accept: function(visitor) {
        return visitor.visitPredicateNode(this);
    }
});


/**
 * NodeTestNode defines a node test. A node test is composed of 3 (not all
 * manditory) parts. A name to test for (eg. tagName == name), a type to test
 * for (eg. 'processing-instruction' or 'text'), and some possible args. 
 * Normally in XPath, args would be empty, but, for example, XPointer defines a 
 * type that takes arguments.
 */
ast.NodeTestNode = Class(ast.Node, {
    init: function(name, type, args) {
        this.name = name;
        this.type = type;
        this.args = (typeof args == "undefined" ? new ast.ArgumentListNode() : args);
    },
    accept: function(visitor) {
        return visitor.visitNodeTestNode(this);
    }
});


/**
 * ArgumentListNode defines a list of arguments, as given to either a 
 * <code>NodeTestNode</code> or a <code>FunctionCallNode</code>. The property
 * args is the list of all the children arguments of this node.
 */
ast.ArgumentListNode = Class(ast.Node, {
    init: function(initElem) {
        this.args = initElem ? [ initElem ] : [];
    },
    prepend: function(elem) {
        this.args.unshift(elem);
        return this;
    },
    accept: function(visitor) {
        return visitor.visitArgumentListNode(this);
    }
});



/******************************************************************************
 * Expressions.
 ******************************************************************************/


/**
 * NumberNode defines a number literal and has one property, <code>val</code>,
 * that contains the value of the number.
 */
ast.NumberNode = Class(ast.ExprNode, {
    init: function(num) {
        this.val = num;
    },
    accept: function(visitor) {
        return visitor.visitNumberNode(this);
    }
});


/**
 * LiteralNode defines a string literal. The property <code>val</code> contains
 * the value of this string (as a JS string).
 */
ast.LiteralNode = Class(ast.ExprNode, {
    init: function(literal) {
        this.val = literal;
    },
    accept: function(visitor) {
        return visitor.visitLiteralNode(this);
    }
});

/**
 * VariableRefNode defines a variable reference. The ID of the variable is 
 * in the <code>varRef</code> property.
 */
ast.VariableRefNode = Class(ast.ExprNode, {
    init: function(varRef) {
        this.varRef = varRef;
    },
    accept: function(visitor) {
        return visitor.visitVariableRefNode(this);
   }
});

/**
 * FunctionCallNode represents a single call to a function. The property name
 * defines the function's name and args points a an ArgumentListNode of the
 * function's arguments.
 */
ast.FunctionCallNode = Class(ast.ExprNode, {
    init: function(name, args) {
        this.name = name;
        this.args = args;
    },
    accept: function(visitor) {
        return visitor.visitFunctionCallNode(this);
    }
});



/******************************************************************************
 * Path expressions return node-sets
 ******************************************************************************/


/**
 * PathExprNode defines an path expression (path expressions return node sets).
 * The property filterExpr contains a possible FilterExprNode (may be null) to
 * get the initial node set from. The property path contains a path to further
 * (or initially) filter by. Either filterExpr or path can be null, but not 
 * both.
 *
 * @note This is different from PathNode
 */
ast.PathExprNode = Class(ast.ExprNode, {
    init: function(filterExpr, path) {
        this.filterExpr = filterExpr;
        this.path = path;
    },
    accept: function(visitor) {
        return visitor.visitPathExprNode(this);
    }
});


/**
 * FilterExprNode defines an filter expression. The property <code>expr</code>
 * contains the expression to obtain a node set from. The property <code>
 * predicates</code> is a PredicateListNode with which the node-set should be
 * further filtered with. The entire purpose of the <code>FilterExprNode</code>
 * is to provide a mechanism for filtering an expression that evaluates to a 
 * node-set. If there are no predicates, then just the underyling expression 
 * node should be used and a new <code>FilterExprNode</code> should not wrap it.
 */
ast.FilterExprNode = Class(ast.ExprNode, {
    init: function(expr, predicates) {
        this.expr = expr;
        this.predicates = predicates;
    },
    accept: function(visitor) {
        return visitor.visitFilterExprNode(this);
    }
});


/**
 * UnionExprNode is a path union. It has 2 properties, <code>lhs</code> and
 * <code>rhs</code>, which are the left-hand side and right-hand sides of the
 * union expression respectively. Both are of type <code>PathExprNode</code>.
 */
ast.UnionExprNode = Class(ast.BinaryOpNode, {
    accept: function(visitor) {
        return visitor.visitUnionExprNode(this);
    }
});



/******************************************************************************
 * Boolean expressions return boolean values
 ******************************************************************************/


/**
 * Super class for all boolean expressions.
 */
ast.BoolExpr = Class(ast.BinaryOpNode);

ast.OrExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitOrExprNode(this);
    }
});

ast.AndExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitAndExprNode(this);
    }
});

ast.EqExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitEqExprNode(this);
    }
});

ast.NeqExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitNeqExprNode(this);
    }
});

ast.LtExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitLtExprNode(this);
    }
});

ast.GtExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitGtExprNode(this);
    }
});

ast.LteExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitLteExprNode(this);
    }
});

ast.GteExprNode = Class(ast.BoolExpr, {
    accept: function(visitor) {
        return visitor.visitGteExprNode(this);
    }
});



/******************************************************************************
 * Binary arithmetic operations 
 ******************************************************************************/


ast.AddExprNode = Class(ast.BinaryOpExpr, {
    accept: function(visitor) {
        return visitor.visitAddExprNode(this);
    }
});

ast.SubExprNode = Class(ast.BinaryOpExpr, {
    accept: function(visitor) {
        return visitor.visitSubExprNode(this);
    }
});

ast.MulExprNode = Class(ast.BinaryOpExpr, {
    accept: function(visitor) {
        return visitor.visitMulExprNode(this);
    }
});

ast.DivExprNode = Class(ast.BinaryOpExpr, {
    accept: function(visitor) {
        return visitor.visitDivExprNode(this);
    }
});

ast.ModExprNode = Class(ast.BinaryOpExpr, {
    accept: function(visitor) {
        return visitor.visitModExprNode(this);
    }
});


/******************************************************************************
 * Unary ops
 ******************************************************************************/

ast.NegExprNode = Class(ast.Expr, {
    init: function(expr) {
        this.expr = expr;
    },
    accept: function(visitor) {
        return visitor.visitNegExprNode(this);
    }
});


// Empty function.
var nop = function() {};


/**
 * This is a prototypical example of a Visitor. It does nothing, but all the
 * necessary visit methods are implemented. Good for copy/paste or extending.
 */
ast.ASTVisitor = Class({
    visitXPathExprNode: nop,
    visitPathNode: nop,
    visitStepNode: nop,
    visitPredicateListNode: nop,
    visitPredicateNode: nop,
    visitNodeTestNode: nop,
    visitArgumentListNode: nop,
    visitNumberNode: nop,
    visitLiteralNode: nop,
    visitVariableRefNode: nop,
    visitFunctionCallNode: nop,
    visitPathExprNode: nop,
    visitFilterExprNode: nop,
    visitUnionExprNode: nop,
    visitOrExprNode: nop,
    visitAndExprNode: nop,
    visitEqExprNode: nop,
    visitNeqExprNode: nop,
    visitLtExprNode: nop,
    visitGtExprNode: nop,
    visitLteExprNode: nop,
    visitGteExprNode: nop,
    visitAddExprNode: nop,
    visitSubExprNode: nop,
    visitMulExprNode: nop,
    visitDivExprNode: nop,
    visitModExprNode: nop,
    visitNegExprNode: nop
});


})();
