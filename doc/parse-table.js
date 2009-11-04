(function() {

var xpath = window.xpath;
xpath.doc = {};

var sym = xpath.symbol;

var getAbbrHtml = function(tok) {
    var abbr = getAbbr(tok);
    if (abbr) {
        return "<abbr title=\"" + xpath.symbol.symbolToString(tok) + "\">" + abbr + "</abbr>";
    }
    return false;
}

var getAbbr = function(tok) {
    switch (tok) {
        case sym.EMPTY:
            return "\u03B5";
        case sym.EOS:
            return '$';
        case sym.OP_PATH_SLASH:
            return "'/'";
        case sym.OP_PATH_DBL_SLASH:
            return "'//'";
        case sym.LEFT_PAREN:
            return "'('";
        case sym.RIGHT_PAREN:
            return "')'";
        case sym.DOT:
            return "'.'";
        case sym.DOT_DOT:
            return "'..'";
        case sym.AT_SIGN:
            return "'@'";
        case sym.LEFT_BRACKET:
            return "'['";
        case sym.RIGHT_BRACKET:
            return "']'";
        case sym.COMMA:
            return "','";
        case sym.OP_PATH_UNION:
            return "'|'";
        case sym.OP_BOOL_OR:
            return "'or'";
        case sym.OP_BOOL_AND:
            return "'and'";
        case sym.OP_REL_EQ:
            return "'='";
        case sym.OP_REL_NEQ:
            return "'!='";
        case sym.OP_REL_LT:
            return "'<'";
        case sym.OP_REL_GT:
            return "'>'";
        case sym.OP_REL_LTE:
            return "'<='";
        case sym.OP_REL_GTE:
            return "'>='";
        case sym.OP_ARI_PLUS:
            return "'+'";
        case sym.OP_ARI_MINUS:
            return "'-'";
        case sym.OP_ARI_DIV:
            return "'div'";
        case sym.OP_ARI_MOD:
            return "'mod'";
        default:
            return false;
    }
}

xpath.doc.fillGrammarTable = function(prodTable) {
    var xpath = window.xpath;
    var i, j;
    var rules = xpath.parser.grammar.rules;
    var rulesArrLen = rules.length;

    var prevSymbol = -1;

    for (i = 0; i < rulesArrLen; i++) {
        var r = rules[i];
        var lhs, rhs = [];

        if (prevSymbol != r.lhs)
            lhs = xpath.symbol.symbolToString(r.lhs);
        else
            lhs = '';

        for (j = 0; j < r.rhs.length; j++) {
            if (getAbbr(r.rhs[j]))
                rhs[j] = getAbbrHtml(r.rhs[j]);
            else
                rhs[j] = xpath.symbol.symbolToString(r.rhs[j]);
        }
        if (rhs.length == 0)
            rhs[0] = "\u03B5";

        var row = $("<tr></tr>");
        row.append($("<td>" + i + "</td>"));
        row.append($("<td>" + lhs + "</td>"));
        if (lhs)
            row.append($("<td>::=</td>"));
        else
            row.append($("<td>|</td>"));
        row.append($("<td>" + rhs.join(' ') + "</td>"));
        prodTable.append(row);

        prevSymbol = r.lhs;
    }

    $("table tr:even").addClass("even");
    
    return prodTable;
};

xpath.doc.fillFirstTable = function(tbl) {
    var getFirstStr = function(symbol, rule) {
        if (typeof rule !== 'number') {
            rule = undefined;
        }

        var first = xpath.parser.grammar.first(symbol, rule);
        var firstStr = [];

        for (var j = 0; j < first.length; j++) {
            if (getAbbr(first[j])) {
                firstStr.push(getAbbrHtml(first[j]));
            } else {
                firstStr.push(xpath.symbol.symbolToString(first[j]));
            }
        }
        return "{ " + firstStr.join(', ') + " }";
    };

    var g = xpath.parser.grammar;
    var nonTerminals = g.nonTerminals();

    for (var i = 0, i_len = nonTerminals.length; i < i_len; i++) {
        var symbol = nonTerminals[i];
        var rules = g.productionRules(symbol);
        var row;

        row = $("<tr></tr>");
        row.append("<td rowspan=\"" + (rules.length + 1) + "\">" + xpath.symbol.symbolToString(symbol) + "</td>");
        row.append("<td>*</td>");
        row.append("<td>" + getFirstStr(symbol) + "</td>");

        tbl.append(row);

        for (var j = 0, len = rules.length; j < len; j++) {
            row = $("<tr></tr>");
            row.append("<td>" + rules[j] + "</td>");
            row.append("<td>" + getFirstStr(symbol, rules[j]) + "</td>");
            tbl.append(row);
        }
    }

    return tbl;
};

xpath.doc.fillFollowTable = function(followTable) {
    var g = xpath.parser.grammar;
    var nonTerminals = g.nonTerminals();

    for (var i = 0, len = nonTerminals.length; i < len; i++) {
        var nt = nonTerminals[i];
        var follow = g.follow(nt);
        var row = $("<tr></tr>");

        var followStr = [];
        for (var j = 0, j_len = follow.length; j < j_len; j++) {
            if (getAbbr(follow[j])) {
                followStr.push(getAbbrHtml(follow[j]));
            } else {
                followStr.push(xpath.symbol.symbolToString(follow[j]));
            }
        }

        row.append("<td>" + xpath.symbol.symbolToString(nt) + "</td>");
        row.append("<td>{ " + followStr.join(', ') + " }</td>");
        followTable.append(row);
    }
};

xpath.doc.fillParseTable = function(domTbl) {
    var g = xpath.parser.grammar;
    var tbl = g.parseTable();
    var terms = g.terminals();

    var row = $("<tr><th></th></tr>");
    for (var i = 0, len = terms.length; i < len; i++) {
        if (getAbbr(terms[i]))
            row.append("<th>" + getAbbrHtml(terms[i]) + "</th>");
        else
            row.append("<th>" + xpath.symbol.symbolToString(terms[i]) + "</th>");
    }
    domTbl.append(row);

    for (nt in tbl) {
        row = $("<tr></tr>");
        row.append("<td>" + xpath.symbol.symbolToString(nt) + "</td>");

        for (var i = 0, len = terms.length; i < len; i++) {
            var t = terms[i];

            if (t in tbl[nt]) {
                row.append("<td>" + tbl[nt][t] + "</td>");
            } else {
                row.append("<td>-</td>");
            }
        }

        domTbl.append(row);
    }
};

})();
