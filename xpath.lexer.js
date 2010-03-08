/* Copyright (c) 2009, International Joint Commission
 * 
 * This file is licensed under the ISCL. A copy of the license should be 
 * distributed with the software; if not, you can obtain a copy here: 
 * http://www.opensource.org/licenses/isc-license.txt
 */

/** @fileoverview
 * This file defines the lexer (Lexical Analyser) used by the parser to parse
 * XPath expressions. This lexer is a hand-coded lexer... I know I got the 
 * state-diagram hanging around somewhere if needed. A pure-JS lexer generator
 * would be welcomed...
 *
 * @author Tom Switzer (switzert@windsor.ijc.org)
 */

(function() {

var xpath = window.xpath = window.xpath || {};
var lexer = xpath.lexer = {};

// Speed up access to some oft-used functions and objects
var sym = xpath.symbol;
var Class = xpath.util.Class;


/**
 * Class used be lexer to obtain characters in the Stream.
 */
var Stream = xpath.lexer.Stream = Class({
    /** Return the next character in the stream and move forward by 1 char. */
    getChar: function() { return ''; },
    
    /** Peek at and return the next character in the stream. */
    peekChar: function() { return ''; },
    
    /** Returns true if we are at the end of the stream. */
    eos: function() { return true; }
});


/**
 * A valid Stream that wraps a regular string.
 *
 * @param s a strings to use as the input
 */
var StringStream = xpath.lexer.StringStream = Class(Stream, {
    init: function(s) {
        this.pos = 0;
        this.str = s;
    },
    
    getChar: function() {
        // Note: if i >= str.length, then '' (the empty string is returned) 
        //  - Sec 15.5.4.4, EMCA-262
        return this.str.charAt(this.pos++);
    },
    
    peekChar: function() {
        return this.str.charAt(this.pos);
    },
    
    eos: function() {
        return this.pos >= this.str.length;
    }
});


/**
 * Create a lexer. The lexer can take either a simple string or a "stream." A 
 * stream is an object which defines 3 argument-less methods: getChar(), 
 * peekChar() and eos(). getChar() should return the next character in the 
 * stream. Repeated calls to getChar() would return a sequence of characters 
 * from the stream. If the end of the stream (EOS) is reached, getChar() should
 * return the empty string. peekChar() should behave like getChar(), but 
 * without moving forward in the stream. Repeated calls to peekChar() would
 * return the same character from the stream, over and over again. The
 * function eos() should return true if the end-of-stream has been reached,
 * false otherwise.
 *
 * @param stream         Either a string or a stream object
 * @param nodeTypes
 * @param includeDefaultNodeTypes
 */
var Lexer = xpath.lexer.Lexer = Class({
    init: function(stream, nodeTypes, includeDefaultNodeTypes) {
        if (typeof stream == 'string')
            stream = new StringStream(stream);
        
        /** @todo nodeTypes & includeDef... should be re-worked into 1 optional
            argument (opts). Also, should consider not using an object for nodeTypes
            since I doubt the speed up for the containment check will really make a
            big difference in performance, but it certainly kills readability. */
        
        var defaultNodeTypes = { 'node': true, 'text': true, 'processing-instruction': true, 'comment': true };
        if (typeof nodeTypes == "undefined") {
            nodeTypes = defaultNodeTypes;
            
        } else if (includeDefaultNodeTypes) {
            for (var i = 0; i < nodeTypes.length; i++)
                defaultNodeTypes[nodeTypes[i]] = true;
            nodeTypes = defaultNodeTypes;
        }
        
        this.tok = 0;
        this.tokVal = '';
        this.stream = stream;
        this.nodeTypes = nodeTypes;
    },

    
    /**
     * Finds and emits the next token. This is a private method, for all intents
     * and purposes. Do NOT use this publicly.
     */
    findNextToken: function() {
        var l = this;
        
        /**
         * Indicates that the token <code>tok</code> should be "emitted" (returned),
         * whose value is <code>val</code>.
         */
        var emitToken = function(token, value) {
            l.tok    = token;
            l.tokVal = value;
        };
        
        var state = 0;
        var ch = '';
        var val = '';
        var literalStarChar = '"';
        var prevToken = this.tok;
        this.tok = 0;
        
        while (!(this.tok)) {
            val += ch;
            ch = this.stream.peekChar();
            
            // Sexy hard/hand coded state machine... *gag*
            switch (state) {
                case 0:
                    switch (ch) {
                        case '':
                            emitToken(sym.EOS);
                            break;
                            
                        case '.':
                            state = 4;  // Init. Dot state
                            break;
                            
                        case ':':
                            state = 6;  // Start of Double token
                            break;
                        
                        case '*':
                            state = 8;  // Multiply handled in state 8 as well
                            break;
                        
                        case '(':
                        case ')':
                        case '[':
                        case ']':
                        case '@':
                        case ',':
                            state = 3;
                            break;
                        
                        case '$':
                            state = 28;
                            break;
                        
                        case '"':
                            literalStartChar = '"';
                            state = 9;
                            break;
                            
                        case "'":
                            literalStartChar = "'";
                            state = 9;
                            break;
                            
                        case '|':
                        case '+':
                        case '-':
                        case '=':
                            state = 11;
                            break;
                            
                        case '/':
                            state = 12;
                            break;
                        
                        case '!':
                            state = 14;
                            break;
                        
                        case '<':
                            state = 16;
                            break;
                            
                        case '>':
                            state = 18;
                            break;
                            
                        case "\u0020":
                        case "\u0009":
                        case "\u000D":
                        case "\u000A":
                            // Do nothing, whitespace
                            break;
                            
                        default:
                            if (isNameStartChar(ch) && ch != ':') {
                                state = 20;
                                
                            } else if (isDigit(ch)) {
                                // The XPath spec actually uses [0-9], not Unicode digits... hrmm...
                                state = 1;
                            }
                            
                            break;
                    }
                    
                    break;
                    
                    
                /* 
                 * Numbers: states 1 & 2
                 */
                
                case 1:
                    if (isDigit(ch)) {
                        // Do nothing...
                        
                    } else if (ch == '.') {
                        state = 2;
                        
                    } else {
                        emitToken(sym.NUMBER, parseInt(val));
                    }
                    
                    break;
                
                case 2:
                    if (isDigit(ch)) {
                        // Do nothing
                        
                    } else {
                        emitToken(sym.NUMBER, parseFloat(val));
                    }
                    
                    break;
                    
                    
                /*
                 * Special characters; these are handled together in one state (3)
                 */
                
                case 3:
                    switch (trim(val)) {
                        case '(':
                            emitToken(sym.LEFT_PAREN);
                            break;
                            
                        case ')':
                            emitToken(sym.RIGHT_PAREN);
                            break;
                            
                        case '[':
                            emitToken(sym.LEFT_BRACKET);
                            break;
                            
                        case ']':
                            emitToken(sym.RIGHT_BRACKET);
                            break;
                            
                        case '@':
                            emitToken(sym.AT_SIGN);
                            break;
                            
                        case ',':
                            emitToken(sym.COMMA);
                            break;
                            
                        default:
                            // won't be reached
                    }
                    break;
                
                
                /*
                 * Dots (one or 2 dots): states 4 & 5
                 */
                
                // .
                case 4:                 // Single Dot
                    if (ch == '.') {
                        state = 5;
                    } else if (isDigit(ch)) {
                        state = 2; // Go to fraction part of Number state
                    } else {
                        emitToken(sym.DOT);
                    }
                    
                    break;
               
                // ..
                case 5:                 // Double Dot
                    emitToken(sym.DOT_DOT);
                    break;
                    
                
                /*
                 * Colons, special: states 6 & 7
                 */
                
                case 6:
                    if (ch == ':') {
                        state = 7;
                        
                    } else {
                        // throw an exception
                    }
                    break;
               
                case 7:
                    emitToken(sym.DOUBLE_COLON);
                    break;
                    
                
                /*
                 * Stars (and multiply): state 8
                 */
                
                case 8:
                    /// @see http://www.w3.org/TR/xpath#exprlex List of "special" rules
                    
                    if (prevToken != undefined
                            && prevToken != sym.AT_SIGN 
                            && prevToken != sym.DOUBLE_COLON 
                            && prevToken != sym.LEFT_PAREN 
                            && prevToken != sym.LEFT_BRACKET
                            && prevToken != sym.COMMA
                            && !sym.isOperator(prevToken)) {

                        emitToken(sym.OP_ARI_MUL);
                        
                    } else {
                        emitToken(sym.NAME_TEST, "*");
                    }
                    
                    break;
                    
                    
                /*
                 * Literals: Handles both single & double quotes
                 */
                 
                case 9:
                    if (literalStartChar == ch)
                        state = 10;
                    break;
                
                case 10:
                    emitToken(sym.LITERAL, val.substring(
                            val.indexOf(literalStartChar) + 1, 
                            val.lastIndexOf(literalStartChar)
                        ));
                    break;
                 
                
                /*
                 * Operators! States 11 - ?
                 */ 
                
                // Unique single character ops
                case 11:
                    switch (removeWhiteSpace(val)) {
                        case '|':
                            emitToken(sym.OP_PATH_UNION);
                            break;
                            
                        case '+':
                            emitToken(sym.OP_ARI_PLUS);
                            break;
                            
                        case '-':
                            emitToken(sym.OP_ARI_MINUS);
                            break;
                            
                        case '=':
                            emitToken(sym.OP_REL_EQ);
                            break;
                    }
                    break;
                    
                // Division
                case 12:
                    if (ch == '/') {
                        state = 13;
                        
                    } else {
                        emitToken(sym.OP_PATH_SLASH);
                    }
                    break;
                  
                // Integer Division
                case 13:
                    emitToken(sym.OP_PATH_DBL_SLASH);
                    break;
                
                // Not-Equals (states 14 & 15)
                case 14:
                    if (ch == '=') {
                        state = 13;
                    } else {
                        // throw an exception: Expected '=' after '!'
                    }
                    break;
                    
                case 15:
                    emitToken(sym.OP_REL_NEQ);
                    break;
                    
                // < & <= operators: states 16 & 17
                case 16:
                    if (ch == '=') {
                        state = 16;
                        
                    } else {
                        emitToken(sym.OP_REL_LT);
                    }
                    break;
                
                case 17:
                    emitToken(sym.OP_REL_LTE);
                    break;
                    
                // > & >= operators: states 18 & 19
                case 18:
                    if (ch == '=') {
                        state = 19;
                        
                    } else {
                        emitToken(sym.OP_REL_GT);
                    }
                    break;
                
                case 19:
                    emitToken(sym.OP_REL_GTE);
                    break;
                    
                    
                /*
                 * Alphabetic-things (Names)
                 */
                
                // NCName
                case 20:
                    if (ch == ':') {
                        state = 21;
                    
                    } else if (isWhiteSpace(ch)) {
                        state = 24; // Check for FunctionName or NodeType
                        
                    } else if (ch == '(') {
                        var name = trim(val);
                        
                        if (val in this.nodeTypes)
                            emitToken(sym.NODE_TYPE, name);
                        else
                            emitToken(sym.FUNC_NAME, name);
                    
                    } else if (isNameChar(ch)) {
                        // Do nothing
                                      
                    } else {
                        var opTok = 0;
                        
                        if (prevToken != undefined
                                && prevToken != sym.AT_SIGN 
                                && prevToken != sym.DOUBLE_COLON 
                                && prevToken != sym.LEFT_PAREN 
                                && prevToken != sym.LEFT_BRACKET
                                && prevToken != sym.COMMA
                                && !sym.isOperator(prevToken)
                                && (opTok = xpath.symbol.operatorNameToToken(val))) {
                            emitToken(opTok);
                            
                        } else {
                            emitToken(sym.NAME_TEST, val)
                        }
                    }
                    
                    break;
                
                // NCName ':' ?
                case 21:
                    if (ch == '*') {
                        state = 22;
                        
                    } else if (ch == ':') {
                        state = 26;     // NCName is an Axis name
                        
                    } else if (isNameStartChar(ch)) {
                        state = 23;
                        
                    } else {
                        // throw an exception: Expected '*' or NameStartChar, found _
                    }
                    
                    break;
                
                // NCName ':' *
                case 22:
                    emitToken(sym.NAME_TEST, val);
                    break;
                
                // NCName ':' NameStartChar NameChar*
                case 23:
                    if (ch == '(') {
                        emitToken(sym.FUNC_NAME, trim(val));
                        
                    } else if (isWhiteSpace(ch)) {
                        state = 25;
                    
                    } else if (isNameChar(ch)) {
                        // Do Nothing
                            
                    } else {
                        emitToken(sym.NAME_TEST, val);
                    }
                    break;
                       
                // NCName \s* 
                case 24:
                    if (isWhiteSpace(ch)) {
                        // Do nothing
                        
                    } else if (ch == ':') {
                        state = 27;
                        
                    } else if (ch == '(') {
                        var name = trim(val);
                        if (name in this.nodeTypes)
                            emitToken(sym.NODE_TYPE, name);
                        else
                            emitToken(sym.FUNC_NAME, name);
                        
                    } else {
                        var opTok;
                        
                        if (prevToken != undefined
                                && prevToken != sym.AT_SIGN 
                                && prevToken != sym.DOUBLE_COLON 
                                && prevToken != sym.LEFT_PAREN 
                                && prevToken != sym.LEFT_BRACKET
                                && prevToken != sym.COMMA
                                && !sym.isOperator(prevToken)
                                && (opTok = xpath.symbol.operatorNameToToken(val))) {
                                
                            // emit OPERATOR_NAME
                            emitToken(opTok);
                            
                        } else {
                            emitToken(sym.NAME_TEST, trim(val));
                        }
                    }
                    
                    break;
                    
                // QName \s*
                case 25:
                    if (isWhiteSpace(ch)) {
                        // Do nothing - do not tack ch onto the end
                        
                    } else if (ch == '(') {
                        emitToken(sym.FUNC_NAME, trim(val));
                        
                    } else {
                        emitToken(sym.NAME_TEST, trim(val));
                    }
                    
                    break;
                    
                // NCName '::'
                case 26:
                    emitToken(sym.AXIS_NAME, trim(val.substring(0, val.length - 2)));
                    break;
                
                // NCName \s* ':'
                case 27:
                    if (ch == ':') {
                        state = 26;
                    } else {
                        // throw an exception; expecting ':', found ?
                    }
                    break;
                    
                // '$' NCName
                case 28:
                    if (ch == ':') {
                        state = 29;
                    
                    } else if (isNameChar(ch)) {
                        // Do nothing
                            
                    } else {
                        emitToken(sym.VARIABLE_REF, trim(val));
                    }
                    break;
                    
                // '$' NCName ':'
                case 29:
                    if (isNameStartChar(ch)) {
                        state = 30;
                        
                    } else {
                        // throw an exception: Expected NameStartChar, found _
                    }
                    break;
                    
                // '$' NCName ':' NameStartChar NameChar*
                case 30:
                    if (!isNameChar(ch))
                        emitToken(sym.VARIABLE_REF, trim(val));
                    break;
            }
            
            // Last token we'll get
            if (!ch)
                break;
            
            // Skip to next char if we still haven't found token
            if (!(this.tok))
                this.stream.getChar();
        }
    },
    
    // Public methods - KISS
    
    /**
     * Returns the next token from the stream. If there are no more tokens, then
     * the EOS token will be returned.
     *
     * @return The next token
     */
    nextToken: function() {
        this.findNextToken();
        return this.tok;
    },
    
    /**
     * Returns the value of the last token returned by {@code nextToken()}. The
     * value is dependent on the actual token itself and could be undefined, a
     * string, or a number.
     *
     * @return A token-dependent value
     */
    getValue: function() {
        return this.tokVal;
    }
});


/* ==========================================================================
 * Utility Functions used by the lexer
 * ========================================================================== */


/* Regular expressions used for character classification */

var re = xpath.lexer.re = {
    // From http://www.w3.org/TR/REC-xml/#NT-Letter: Character classes...    

    digit: /^[\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE7-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29]$/,
    
    // From http://www.w3.org/TR/REC-xml/#NT-NameChar
    // Note: Javascript cannot support the range \u10000-\uEFFFF
    
    nameStartChar: /^[_:A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]$/,
    
    nameChar:      /^[-_\.:0-9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040]$/,
    
    name:          /^[_:A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][-_\.:0-9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040]*$/,
    
    whiteSpace:    /^[\u0020\u0009\u000D\u000A]$/
};
    
function isNameStartChar(ch) {
    return ch.match(re.nameStartChar);
}
    
function isNameChar(ch) {
    return ch.match(re.nameChar);
}

function isName(str) {
    return str.match(re.name);
}

function isDigit(ch) {
    return ch.match(re.digit);
}

function isWhiteSpace(ch) {
    return ch.match(re.whiteSpace);
}

function contains(haystack, needle) {
    var i = 0;
    for (; i < haystack.length; i++) {
        if (haystack[i] == needle)
            return true;
    }
    return false;
}

function trim(s) {
    return s.replace(/[\u0020\u0009\u000D\u000A]+$/, "")
            .replace(/^[\u0020\u0009\u000D\u000A]+/, "");
}

function removeWhiteSpace(s) {
    return s.replace(/[\u0020\u0009\u000D\u000A]/g, "");
}

})();
