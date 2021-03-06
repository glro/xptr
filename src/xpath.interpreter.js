/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * The XPath AST interpreter. 
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */
(function() {

var xpath = window.xpath = window.xpath || {};
var interpreter = xpath.interpreter = {};

var extend = xpath.util.extend;
var Class = xpath.util.Class;

// Simple functions for node tests
function isCommentNode(n) { return n.nodeType == n.COMMENT_NODE; }
function isTextNode(n) { return n.nodeType == n.TEXT_NODE; }
function isProcessingInstructionNode(n) { return n.nodeType == n.PROCESSING_INSTRUCTION_NODE; }
function isAnyNode(n) { return true; }

// Local reference to xpath.core
var core = xpath.core;

/**
 * The evaluation context is used during the evaluation of a compiled XPath 
 * expression.
 */
var EvaluationContext = xpath.interpreter.EvaluationContext = Class({

    /**
     * Constructs the evaluation context. This context takes the initial context
     */
    init: function(ctxt, vars) {
        ctxt = xpath.util.isList(ctxt) ? ctxt : [ctxt];
        if (ctxt.length == 0)
            /// @todo Throw proper XPath error
            throw new Error("Context size cannot be 0");
        
        // Used by pushContext()/popContext()
        this.contextStack = [];
        
        // The current item being processed - this will always be a node
        this.item = ctxt[0];
        
        // The position in the sequence of items that the current item is at.
        // NOTE: In XPath, lists are 1-indexed; pos() = this.pos + 1
        this.pos = 0;
        
        // The current size of the sequence of items being processed
        this.size = ctxt.length;
        
        // An iterator to iterate over all nodes in context
        this.iter = createArrayContextIterator(this, ctxt);
        
        // An object w/ QName: Value pairs for each variable in the expression.
        // Variables can also be functions. If they are, then the value returned
        // will be the return value of calling the function, the context as this
        this.variables = extend({}, vars || {}, {
            dot: this.dot,              // $dot
            position: this.position,    // $position
            last: this.last,            // $last
        });
        
        // Function library
        this.functions = xpath.core.library;
        
        // The owning document of the context items/nodes
        if (this.item.nodeType == this.item.DOCUMENT_NODE)
            this.document = this.item;
        else
            this.document = this.item.ownerDocument;
        
        // Separates the axis guide from the interpreter implementation
        this.axisGuideManager = new xpath.core.AxisGuideManager();
        
        this.namespaceResolver = this.document;
    },
    
    
    /**
     * Saves the current context so it can be restored later.
     */
    pushContext: function() {
        this.contextStack.push({
                iter: this.iter,
                size: this.size,
                item: this.item,
                pos: this.pos
            });
    },
    
    
    /**
     * Restore the most recently saved (pushed) context.
     */
    popContext: function() {
        var ctxt = this.contextStack.pop();
        this.iter = ctxt.iter;
        this.size = ctxt.size;
        this.item = ctxt.item;
        this.pos  = ctxt.pos;
    },
    
    
    update: function(item, pos) {
        this.item = item;
        this.pos = pos;
    },
    
    
    /**
     * Iterates over all nodes in the context, each time calling back the
     * function cb with the current node.
     */
    contextIterator: function(cb) {
        this.iter(cb);
    },
    
    
    /**
     * Returns the current item being evaluated
     */
    dot: function() {
        return this.item;
    },
    
    
    /**
     * Returns the XPath position of the current item (ie. 1-based)
     */
    position: function() {
        return this.pos;
    },
    
    
    /**
     * Returns the size of the context/position of the last item in the context
     */
    last: function() {
        return this.size;
    },
    
    
    /**
     * Returns the value of the variable referenced by {@code varRef}.
     *
     * @param varRef The name of the variable
     * @return The value of the variable {@code varRef}
     * @throws Error if there is no variable with name {@code varRef}
     */
    getValue: function(varRef) {
        if (typeof this.variables[varRef] == "undefined") {
            /// @todo Raise proper exception
            throw new Error("XPath Variable " + varRef + " is undefined.");
        }
        
        var value = this.variables[varRef];
        
        /// @todo Apparently this will fail in IE in "cross-window calls"
        /// Fix: http://code.google.com/p/closure-library/source/browse/trunk/closure/goog/base.js#597
        if (typeof value == "function")
            value = value.call(this);
        switch (typeof value) {
        case "boolean":
            return core.newBoolean(value);
        case "number":
            return core.newNumber(value);
        case "string":
            return core.newString(value);
        default:
            // We'll naively assume its elements are nodes for now
            if (xpath.util.isList(value))
                return core.newNodeSet(value);
        }
        // Can't convert the variable's value to a known type.
        throw new Error("The type of variable '$" + varRef + "' cannot be determined.");
    },
    
    
    /**
     * Sets the value of the variable with reference {@code varRef}.
     * 
     * @param varRef The name used to reference the variable.
     * @param value  The value of the variable
     * @return {@code value}
     */
     setValue: function(varRef, value) {
        /// @todo Should ensure varRef is not dot, last, or position
        return this.variables[varRef] = value;
     },
     
     
     /**
      * Call a function in the function library with name funcName using 
      * arguments args. The return type depends on the function being called.
      *
      * @param funcName A string with the function name to call
      * @param args An array of arguments to apply to the function
      */
     call: function(funcName, args) {
        var func = this.functions.getFunction(funcName);
        if (typeof func == "undefined")
            throw new Error("The function '" + funcName + "' does not exist.");
        if (!xpath.util.isArray(args))
            args = Array.prototype.slice.call(arguments, 1);
        return func.apply(this, args);
     },
     
     
     /**
      * Returns an axis guide for axis. By default, this function supports all
      * standard axes specified by XPath 1. The axis guide returned is a
      * function that takes 2 arguments, a node and a callback. The first
      * argument is the node to use as the context of the axis. The second
      * argument is the callback function to call each time a new node is
      * traversed. The callback function should take 1 argument, a node.
      *
      * @param axis A string describing the axis guide to return (eg. 'child')
      * @return A function that can be used to traverse an axis for a node
      */
     getAxisGuide: function(axis) {
        return this.axisGuideManager.getAxisGuide(axis);
     },
     
     
     /**
      * Returns a function that can check whether a node is of the given type
      * (nodeType is a string), checked against the arguments. If no function
      * can be returned for the given nodeType or arguments, then null is
      * returned.
      *
      * @param nodeType The type of node, given as a string (eg. 'comment')
      * @param args Arguments to the node type test
      * @return A function that will return true or false given a node, or null
      */
     getNodeTypeTest: function(nodeType, args) {
        switch (nodeType) {
        case 'node':
            if (!args.length)
                return isAnyNode;
        case 'comment':
            if (!args.length)
                return isCommentNode;
        case 'text':
            if (!args.length)
                return isTextNode;
        case 'processing-instruction':
            if (args.length == 0) {
                return isProcessingInstructionNode;
            } else if (args.length == 1) {
                return function(n) {
                        return n.nodeType == n.PROCESSING_INSTRUCTION_NODE
                               && n.target == args[0].value;
                    };
            }
        }
        return null;
     },
     
     
     /**
      * Returns the local name and namespace URI of the node. The namespaceURI
      * may be null. If the node does not have an "expanded-name", then null
      * will be returned.
      */
     getExpandedName: function(node) {
        var localName = null,
            namespaceUri = null;
        
        switch (node.nodeType) {
        case 1:     // ELEMENT_NODE
        case 2:     // ATTRIBUTE_NODE
            // Note: This may be wrong, but node.namespaceURI returns null in FF
            //       and localName returns the prefix (eg. xml:lang). Also,
            //       localName doesn't exist in IE (untested, based on w3c site)
            var parts = node.nodeName.split(":");
            if (parts.length > 1) {
                localName = parts[1];
                namespaceUri = node.lookupNamespaceURI(parts[0]);
            } else {
                localName = parts[0];
            }
            break;
            
        case 7:     // PROCESSING_INSTRUCTION_NODE
            localName = node.target;
            break;
            
        default:
            return null;
        }
        
        return { 'localName': localName, 'namespaceURI': namespaceUri };
     }
});


var XPathInterpreter = xpath.interpreter.Interpreter = Class(xpath.ast.ASTVisitor, {
    init: function(evalContext) {
        this.context = evalContext;
    },
    
    toBoolean: function(result) {
        return this.context.call("boolean", [result]).value;
    },
    
    interpret: function(root) {
        this.resultStack = [];
        
        root.accept(this);
        
        var result = this.resultStack.pop();
        if (typeof result == "undefined")
            return null;
        if (result.type == core.types.NODE_SET) {
            var nodes = [];
            result.value.each(function() { nodes.push(this) });
            return nodes;
        } else {
            return result.value;
        }
    },
    
    /* An XPathExprNode is just a top level node for an expression, but has no
     * real value as of now.
     */
    visitXPathExprNode: function(n) {
        n.expr.accept(this);
    },
    
    /* Initialize the context for a new path. If the path is absolute, then the
     * context is simply initialized to the document, otherwise the context
     * is initialized the current item. This does preserve the context. If the
     * context should be preserved, then a call to this method must be wrapped
     * in a pushContext()/popContext() pair.
     */
    visitPathNode: function(path) {
        if (path.isAbsolute) {
            this.context.size = 1;
            this.context.iter = createArrayContextIterator(this.context, [this.context.document]);
        }
        
        for (var i = 0, numSteps = path.steps.length; i < numSteps; i++)
            path.steps[i].accept(this);
    },
    
    /* Process a step node. We do this by grabbing the appropriate axis guide.
     * We then loop through all nodes on the top of the stack, each time using
     * the guide to traverse the tree, pushing the resulting nodes onto the
     * stack. We then apply the node test, to prune the results. Afterwards, we
     * apply the predicates, in order.
     */
    visitStepNode: function(step) {
        var guide = this.context.getAxisGuide(step.axis),
            interpreter = this,
            context = this.context,
            result = [];
            
        if (!guide)
            /// @todo Throw proper error
            throw new Error("Invalid axis: '" + step.axis + "'");

        context.contextIterator(function(n) {
                // Save the context
                context.pushContext();
            
                // Get the count first.
                var count = 0;
                guide(n, function() {
                        count++;
                    });
                
                // Update the size and context iterator.
                context.size = count;
                context.iter = function(cb) {
                        var pos = 1;
                        return guide(n, function(n) {
                                context.pos = pos++;
                                context.item = n;
                                return cb(context.item, context.pos);
                            });
                    };
                
                // Apply the predicates
                step.nodeTest.accept(interpreter);
                step.predicates.accept(interpreter);
                
                // Append the found items to the final result for the next step
                context.contextIterator(function(m) {
                        result.push(m);
                    });
                
                // Restore the context
                context.popContext();
            });

        // This will force the result into document order and remove duplicates
        var nodeset = new core.NodeSet(result);
        this.context.size = nodeset.size();
        this.context.iter = createNodeSetContextIterator(context, nodeset);
    },
    
    /* Predicate lists are an in-order list of all the predicates. We simply
     * apply each predicate, one by one.
     */
    visitPredicateListNode: function(list) {
        var predicates = list.predicates;
        for (var i = 0, numPreds = predicates.length; i < numPreds; i++) {
            predicates[i].accept(this);
        }
    },
    
    /* Applies the predicate to the current context. It will evaluate the
     * expression for each node in the context. If the expression is a number,
     * then it will add the node if its position is equal to that number.
     * Otherwise, it converts the expression's result to boolean and add the
     * node to the new context if it evaluates to true.
     */
    visitPredicateNode: function(predicate) {
        var interpreter = this,
            nodes = [],
            context = this.context;
        this.context.contextIterator(function(n) {
        
                /// @todo Cache result if only constants (ie. literals or numbers)
                /// are used.
                
                predicate.expr.accept(interpreter);
                var result = interpreter.resultStack.pop();
                if (result.type == core.types.NUMBER) {
                    /// @todo If number is constant, then STOP iteration
                    if (context.position() == result.value)
                        nodes.push(n);
                    
                } else {
                    // Convert the result to a boolean value
                    if (interpreter.toBoolean(result))
                        nodes.push(n);
                }
            });
        context.size = nodes.length;
        context.iter = createArrayContextIterator(context, nodes);
    },
    
    /* Perform a Node Test on the nodes in the current context.
     */
    visitNodeTestNode: function(nodeTest) {
        var parts = nodeTest.name.split(":"),
            localName = parts.length > 1 ? parts[1] : parts[0],
            namespaceURI = parts.length > 1 ? parts[0] : null,
            args = [];
        
        if (nodeTest.args) {
            nodeTest.args.accept(this);
            var numArgs = nodeTest.args.args.length;
            if (numArgs)
                args = this.resultStack.splice(-numArgs);   // Pop off numArgs items
        }
        var nodeTypeCheck = this.context.getNodeTypeTest(nodeTest.type, args);
        if (nodeTest.type && !nodeTypeCheck) {
            /// @todo Throw a proper error
            throw new Error("Invalid node type in node test: '" + nodeTest.type + "'");
        }
        
        // Don't want to overwrite axis iterator if we can avoid it
        if (localName == '*' && namespaceURI == null && (!nodeTest.type || nodeTest.type == "node"))
            return;

        // Get all matching nodes an update the context with an array iterator.
        var results = [],
            context = this.context;
        this.context.contextIterator(function(n) {
                // Perform the name test, if any
                if (localName != '*' || namespaceURI != null) {
                    var expandedName = context.getExpandedName(n);
                    if (expandedName == null
                        || (localName != '*' && localName != expandedName.localName)
                        || namespaceURI != expandedName.namespaceURI) {
                        return true;    // Skip this node
                    }
                }
                
                // Perform the node type check, if any
                if (nodeTypeCheck && !nodeTypeCheck(n))
                    return true;        // Skip this node
                
                results.push(n);
            });
        context.size = results.length;
        context.iter = createArrayContextIterator(context, results);
    },
    
    /* Each argument is an expression, so each expression is evaluated, in
     * order, and pushed onto the stack. The values stored on the result stack 
     * will be in reverse order.
     */
    visitArgumentListNode: function(argList) {
        var args = argList.args;
        for (var i = 0; i < args.length; i++) {
            args[i].accept(this);
        }
    },
    
    visitNumberNode: function(num) {
        this.resultStack.push(core.newNumber(num.val));
    },
    
    visitLiteralNode: function(literal) {
        this.resultStack.push(core.newString(literal.val));
    },
    
    /* The variable's value is grabbed from the context and pushed onto the
     * stack.
     */
    visitVariableRefNode: function(varRef) {
        try {
            this.resultStack.push(this.context.getValue(varRef));
        } catch (e) {
            throw new Error("Variable '$" + varRef + "' does not map to any value.");
        }
    },
    
    /* This evalutes all arguments first, then uses the results as the arguments
     * to the function. The function is called using the call() method on the
     * context, passing in the name and args and the result is stored on the
     * result stack.
     */
    visitFunctionCallNode: function(func) {
        func.args.accept(this);
        var args = func.args.args.length 
                        ? this.resultStack.splice(-func.args.args.length) 
                        : [];
        this.resultStack.push(this.context.call(func['name'], args));
    },
    
    /* This is an expression, which means the result is pushed onto the stack.
     * More specifically, this will put the nodes found onto the top of the 
     * result stack. The context will be saved/restored at the start/end of this
     * method.
     */
    visitPathExprNode: function(pathExpr) {
        this.context.pushContext();
        
        if (pathExpr.filterExpr) {
            pathExpr.filterExpr.accept(this);
            var result = this.resultStack.pop();
            this.context.size = result.value.size();
            this.context.iter = createNodeSetContextIterator(this.context, result.value);
        } else {
            this.context.size = 1;
            this.context.iter = createArrayContextIterator(this.context, [this.context.item]);
        }

        var result = [],
            context = this.context,
            interpreter = this;
        this.context.contextIterator(function() {
                context.pushContext();
                pathExpr.path.accept(interpreter);
                context.contextIterator(function(n) {
                        result.push(n);
                    });
                context.popContext();
            });
        this.resultStack.push(core.newNodeSet(result));
        this.context.popContext();
    },
    
    /* A filter node could be standalone expression, so its result must be
     * pushed onto the stack. Since the result is on the stack, we also preserve
     * the context state.
     */
    visitFilterExprNode: function(filter) {
        this.context.pushContext();
        
        filter.expr.accept(this);
        var result = this.resultStack.pop();
        if (result.type != core.types.NODE_SET)
            throw new Error("Predicates can be applied to type '" + result.type + "'");
        var nodeset = result.value;
        this.context.size = nodeset.size();
        this.context.iter = createNodeSetContextIterator(this.context, nodeset);
        filter.predicates.accept(this);
        
        var result = [];
        this.context.contextIterator(function(n) {
                result.push(n);
            });
        this.resultStack.push(core.newNodeSet(result));
        
        this.context.popContext();
    },
    
    visitUnionExprNode: function(_union) {
        _union.lhs.accept(this);
        _union.rhs.accept(this);
        this.resultStack.push(this.context.call("union", this.resultStack.splice(-2)));
    },
    
    /* An "or" expression first evaluates the LHS. If it evaluates to true, then
     * the value of the LHS is pushed onto the result stack and the RHS is not
     * evaluated. Otherwise the RHS is evaluated and the result of the RHS is
     * pushed onto the result stack.
     */
    visitOrExprNode: function(or) {
        or.lhs.accept(this);
        var lhs = this.resultStack.pop();
        if (this.toBoolean(lhs))
            this.resultStack.push(lhs);
        else
            or.rhs.accept(this);    // Keep the result on the stack
    },
    
    /* An "and" expression first evaluates the LHS. If it evaluates to false,
     * then the value of the LHS is pushed onto the result stack and the RHS is
     * not evaluated. Otherwise, the result of the evaluation of the RHS is
     * pushed onto the result stack.
     */
    visitAndExprNode: function(and) {
        and.lhs.accept(this);
        var lhs = this.resultStack.pop();
        if (!this.toBoolean(lhs))
            this.resultStack.push(lhs);
        else
            and.rhs.accept(this);   // Keep the result on the stack
    },
    
    visitEqExprNode: function(eq) {
        eq.lhs.accept(this);
        eq.rhs.accept(this);
        this.resultStack.push(this.context.call("equals", this.resultStack.splice(-2)));
    },
    visitNeqExprNode: function(neq) {
        neq.lhs.accept(this);
        neq.rhs.accept(this);
        this.resultStack.push(this.context.call("not-equals", this.resultStack.splice(-2)));
    },
    visitLtExprNode: function(lt) {
        lt.lhs.accept(this);
        lt.rhs.accept(this);
        this.resultStack.push(this.context.call("less-than", this.resultStack.splice(-2)));
    },
    visitGtExprNode: function(gt) {
        gt.lhs.accept(this);
        gt.rhs.accept(this);
        this.resultStack.push(this.context.call("greater-than", this.resultStack.splice(-2)));
    },
    visitLteExprNode: function(lte) {
        lte.lhs.accept(this);
        lte.rhs.accept(this);
        this.resultStack.push(this.context.call("less-than-or-equal", this.resultStack.splice(-2)));
    },
    visitGteExprNode: function(gte) {
        gte.lhs.accept(this);
        gte.rhs.accept(this);
        this.resultStack.push(this.context.call("greater-than-or-equal", this.resultStack.splice(-2)));
    },
    visitAddExprNode: function(add) {
        add.lhs.accept(this);
        add.rhs.accept(this);
        this.resultStack.push(this.context.call("add", this.resultStack.splice(-2)));
    },
    visitSubExprNode: function(sub) {
        sub.lhs.accept(this);
        sub.rhs.accept(this);
        this.resultStack.push(this.context.call("subtract", this.resultStack.splice(-2)));
    },
    visitMulExprNode: function(mul) {
        mul.lhs.accept(this);
        mul.rhs.accept(this);
        this.resultStack.push(this.context.call("multiply", this.resultStack.splice(-2)));
    },
    visitDivExprNode: function(div) {
        div.lhs.accept(this);
        div.rhs.accept(this);
        this.resultStack.push(this.context.call("divide", this.resultStack.splice(-2)));
    },
    visitModExprNode: function(mod) {
        mod.lhs.accept(this);
        mod.rhs.accept(this);
        this.resultStack.push(this.context.call("modulus", this.resultStack.splice(-2)));
    },
    visitNegExprNode: function(neg) {
        neg.expr.accept(this);
        var result = this.resultStack.pop();
        this.resultStack.push(this.context.call("negate", this.resultStack.pop()));
    }
});


function createArrayContextIterator(context, nodes) {
    return function(cb) {
            for (var i = 0, len = nodes.length; i < len; i++) {
                context.pos = i + 1;
                context.item = nodes[i];
                if (cb(context.item, context.pos) === false)
                    return false;
            }
            return true;
        };
}


function createNodeSetContextIterator(context, nodeSet) {
    return function(cb) {
            var pos = 1;
            return nodeSet.each(function() {
                    context.pos = pos++;
                    context.item = this;
                    return cb(context.item, context.pos);
                });
        };
}

})();
