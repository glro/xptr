/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * Defines the symbols used by the lexer (xpath.lexer) and grammar definition
 * (xpath.parser.grammar).
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */

(function() {

var xpath = window.xpath;

xpath.symbol = {
    EMPTY           : -1,
    NONE            :  0,
    EOS             :  0,
    NUMBER          :  1,
    LEFT_PAREN      :  2,
    RIGHT_PAREN     :  3,
    LEFT_BRACKET    :  4,
    RIGHT_BRACKET   :  5,
    DOT             :  6,
    DOT_DOT         :  7,
    AT_SIGN         :  8,
    COMMA           :  9,
    DOUBLE_COLON    : 10,
    STAR            : 11,
    LITERAL         : 12,
    
    // operators
    OP_ARI_PLUS     : 13,
    OP_ARI_MINUS    : 14,
    OP_ARI_DIV      : 15,
    OP_ARI_INT_DIV  : 16,
    OP_ARI_MUL      : 17,
    OP_ARI_MOD      : 18,
    
    OP_REL_EQ       : 19,
    OP_REL_NEQ      : 20,
    OP_REL_LT       : 21,
    OP_REL_GT       : 22,
    OP_REL_LTE      : 23,
    OP_REL_GTE      : 24,
    
    OP_BOOL_OR      : 25,
    OP_BOOL_AND     : 26,
    
    OP_PATH_SLASH   : 27,
    OP_PATH_DBL_SLASH : 28,
    OP_PATH_UNION   : 29,
    
    NAME_TEST       : 30,
    AXIS_NAME       : 31,
    VARIABLE_REF    : 32,
    NODE_TYPE_OR_FUNC_NAME : 33,
    NODE_TYPE       : 34,
    FUNC_NAME       : 35,
    
    // Non terminals
    
    LocationPath            : 40,
    AbsoluteLocationPath    : 41,
    AbsoluteLocationPathTail: 42,
    RelativeLocationPath    : 43,
    RelativeLocationPathTail: 44,
    Step                    : 45,
    PredicateList           : 46,
    AxisSpecifier           : 47,
    NodeTest                : 48,
    Predicate               : 49,
    Expr                    : 50,
    PrimaryExpr             : 51,
    FunctionCall            : 52,
    ArgumentList            : 53,
    ArgumentListTail        : 54,
    UnionExpr               : 55,
    UnionExprTail           : 56,
    PathExpr                : 57,
    PathExprTail            : 58,
    FilterExpr              : 59,
    FilterExprTail          : 60,
    OrExpr                  : 61,
    OrExprTail              : 62,
    AndExpr                 : 63,
    AndExprTail             : 64,
    EqualityExpr            : 65,
    EqualityExprTail        : 66,
    RelationalExpr          : 67,
    RelationalExprTail      : 68,
    AdditiveExpr            : 69,
    AdditiveExprTail        : 70,
    MultiplicativeExpr      : 71,
    MultiplicativeExprTail  : 72,
    UnaryExpr               : 73,
    S                       : 74
};

xpath.symbol.isTerminal = function(symbol) {
    return symbol < 40;
};

xpath.symbol.operatorNameToToken = function(opName) {
    if (opName.match(/^\s*and\s*$/i)) {
        return xpath.symbol.OP_BOOL_AND;
    } else if (opName.match(/^\s*or\s*$/i)) {
        return xpath.symbol.OP_BOOL_OR;
    } else if (opName.match(/^\s*mod\s*$/i)) {
        return xpath.symbol.OP_ARI_MOD;
    } else if (opName.match(/^\s*div\s*$/i)) {
        return xpath.symbol.OP_ARI_DIV;
    } else {
        return 0;
    }
};

xpath.symbol.isOperator = function(tok) {
    return tok >= xpath.symbol.OP_ARI_PLUS && tok <= xpath.symbol.OP_PATH_UNION;
};

// This is naive, only use in debugging
xpath.symbol.symbolToString = function(sym) {
    for (var name in xpath.symbol) {
        if (sym == xpath.symbol[name])
            return name;
    }
    return null;
};

})();
