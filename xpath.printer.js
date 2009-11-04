/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * This provides implementations of an ASTVisitor that allows printing the AST
 * in various ways.
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath;

var Class = xpath.util.Class;

var PrettyPrinter = Class(xpath.ast.ASTVisitor, {
    init: function(n) {
        this.ast = n;
        this.parts = [];
        this.prettyString = null;
    },
    toString: function() {
        if (!this.prettyString) {
            this.ast.accept(this);
            this.prettyString = this.parts.join("");
        }
        return this.prettyString;
    },
    visitXPathExprNode: function(n) {
        n.expr.accept(this);
    },
    visitPathNode: function(n) {
        for (var i = 0, len = n.steps.length; i < len; i++) {
            if (i > 0 || n.isAbsolute)
                this.parts.push('/');
            n.steps[i].accept(this);
        }
    },
    visitStepNode: function(n) {
        this.parts.push(n.axis, '::');
        n.nodeTest.accept(this);
        n.predicates.accept(this);
    },
    visitPredicateListNode: function(n) {
        for (var i = 0, len = n.predicates.length; i < len; i++) {
            this.parts.push('[');
            n.predicates[i].accept(this);
            this.parts.push(']');
        }
    },
    visitPredicateNode: function(n) {
        n.expr.accept(this);
    },
    visitNodeTestNode: function(n) {
        if (n.type) {
            this.parts.push(n.type);
            n.args.accept(this);
        } else {
            this.parts.push(n.name);
        }
    },
    visitArgumentListNode: function(n) {
        this.parts.push('(');
        for (var i = 0, len = n.args.length; i < len; i++) {
            if (i != 0)
                this.parts.push(',');
            n.args[i].accept(this);
        }
        this.parts.push(')');
    },
    visitNumberNode: function(n) {
        this.parts.push(n.val);
    },
    visitLiteralNode: function(n) {
        this.parts.push("\"", n.val, "\"");
    },
    visitVariableRefNode: function(n) {
        this.parts.push("$", n.varRef);
    },
    visitFunctionCallNode: function(n) {
        this.parts.push(n.name);
        n.args.accept(this);
    },
    visitPathExprNode: function(n) {
        if (n.filterExpr) {
            n.filterExpr.accept(this);
            this.parts.push('/');
        }
        n.path.accept(this);
    },
    visitFilterExprNode: function(n) {
        n.expr.accept(this);
        if (n.predicates)
            n.predicates.accept(this);
    },
    visitUnionExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(" | ");
        n.rhs.accept(this);
    },
    visitOrExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' or ');
        n.rhs.accept(this);
    },
    visitAndExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' and ');
        n.rhs.accept(this);
    },
    visitEqExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' = ');
        n.rhs.accept(this);
    },
    visitNeqExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' != ');
        n.rhs.accept(this);
    },
    visitLtExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' < ');
        n.rhs.accept(this);
    },
    visitGtExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' > ');
        n.rhs.accept(this);
    },
    visitLteExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' <= ');
        n.rhs.accept(this);
    },
    visitGteExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' >= ');
        n.rhs.accept(this);
    },
    visitAddExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' + ');
        n.rhs.accept(this);
    },
    visitSubExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' - ');
        n.rhs.accept(this);
    },
    visitMulExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' mul ');
        n.rhs.accept(this);
    },
    visitDivExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' div ');
        n.rhs.accept(this);
    },
    visitModExprNode: function(n) {
        n.lhs.accept(this);
        this.parts.push(' mod ');
        n.rhs.accept(this);
    },
    visitNegExprNode: function(n) {
        this.parts.push('-');
        n.expr.accept(this);
    }
});

var ASTListPrinter = Class(xpath.ast.ASTVisitor, {
    init: function(n) {
        this.ast = n;
        this.parts = [];
        this.html = "";
    },
    
    toString: function() {
        if (!this.html) {
            this.ast.accept(this);
            this.html = this.parts.join("");
        }
        return this.html;
    },
    
    node: function(str) {
        this.parts.push('<li>', str, '</li>');
    },
    
    startNode: function(str) {
        this.parts.push('<li>', str, '<ul>');
    },
    
    endNode: function() {
        this.parts.push('</ul></li>');
    },
    
    visitXPathExprNode: function(n) {
        this.startNode("XPathExprNode");
        n.expr.accept(this);
        this.endNode();
    },
    
    visitPathNode: function(n) {
        this.startNode('PathNode' + (n.isAbsolute ? ' (absolute)' : ''));
        for (var i = 0, len = n.steps.length; i < len; i++)
            n.steps[i].accept(this);
        this.endNode();
    },
    visitStepNode: function(n) {
        this.startNode("StepNode (Axis: " + n.axis + ")");
        n.nodeTest.accept(this);
        n.predicates.accept(this);
        this.endNode();
    },
    visitPredicateListNode: function(n) {
        this.startNode("PredicateListNode");
        for (var i = 0, len = n.predicates.length; i < len; i++)
            n.predicates[i].accept(this);
        this.endNode();
    },
    visitPredicateNode: function(n) {
        this.startNode("PredicateNode");
        n.expr.accept(this);
        this.endNode();
    },
    visitNodeTestNode: function(n) {
        this.startNode("NodeTestNode (Name: " + (n.name ? n.name : "<em>none</em>") + ", Node Type: " + (n.type ? n.type : "<em>none</em>") + ")");
        if (n.args)
            n.args.accept(this);
        this.endNode();
    },
    visitArgumentListNode: function(n) {
        this.startNode("ArgumentListNode");
        for (var i = 0, len = n.args.length; i < len; i++)
            n.args[i].accept(this);
        this.endNode();
    },
    visitNumberNode: function(n) {
        this.node("NumberNode (Value: " + n.val + ")");
    },
    visitLiteralNode: function(n) {
        this.node("LiteralNode (Value: \"" + n.val + "\")");
    },
    visitVariableRefNode: function(n) {
        this.node("VariableRefNode (Variable: $" + n.varRef + ")");
    },
    visitFunctionCallNode: function(n) {
        this.startNode("FunctionCallNode (Function Name: " + n.name + ")");
        n.args.accept(this);
        this.endNode();
    },
    visitPathExprNode: function(n) {
        this.startNode("PathExprNode");
        if (n.filterExpr)
            n.filterExpr.accept(this);
        if (n.path)
            n.path.accept(this);
        this.endNode();
    },
    visitFilterExprNode: function(n) {
        this.startNode("FilterExprNode");
        n.expr.accept(this);
        if (n.predicates)
            n.predicates.accept(this);
        this.endNode();
    },
    visitUnionExprNode: function(n) {
        this.startNode("UnionExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitOrExprNode: function(n) {
        this.startNode("OrExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitAndExprNode: function(n) {
        this.startNode("AndExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitEqExprNode: function(n) {
        this.startNode("EqExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitNeqExprNode: function(n) {
        this.startNode("NeqExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitLtExprNode: function(n) {
        this.startNode("LtExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitGtExprNode: function(n) {
        this.startNode("GtExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitLteExprNode: function(n) {
        this.startNode("LteExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitGteExprNode: function(n) {
        this.startNode("GteExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitAddExprNode: function(n) {
        this.startNode("AddExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitSubExprNode: function(n) {
        this.startNode("SubExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitMulExprNode: function(n) {
        this.startNode("MulExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitDivExprNode: function(n) {
        this.startNode("DivExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitModExprNode: function(n) {
        this.startNode("ModExprNode");
        n.lhs.accept(this);
        n.rhs.accept(this);
        this.endNode();
    },
    visitNegExprNode: function(n) {
        this.startNode("NegExprNode");
        n.expr.accept(this);
        this.endNode();
    }
});

xpath.printer = {
    newPrettyPrinter: function(ast) {
        return new PrettyPrinter(ast);
    },
    newASTListPrinter: function(ast) {
        return new ASTListPrinter(ast);
    }
};

})();
