$(document).ready(function() {
    module("xpath.util");
    
    test("binarySearch", function() {
        equals(xpath.util.binarySearch([], 0), 0, "Empty array");
        ok(xpath.util.binarySearch([1], 2) == 1 && xpath.util.binarySearch([1], 0) == 0, "List of 1");
        equals(xpath.util.binarySearch([1,2,3,4,5], 99), 5, "Search for maximal value");
        equals(xpath.util.binarySearch([1,2,3,4,5], -2), 0, "Search for minimal value");
        equals(xpath.util.binarySearch([1,2,3,4], 2), 1, "Even sized list, odd index");
        equals(xpath.util.binarySearch([1,2,3,4], 1), 0, "Even sized list, even index");
        equals(xpath.util.binarySearch([1,2,3,4,5], 2), 1, "Odd sized list, odd index");
        equals(xpath.util.binarySearch([1,2,3,4,5], 1), 0, "Odd sized list, even index");
        
        var bigList = [];
        for (var i = 0; i < 1000; i++)
            bigList[i] = i * 2;
        equals(xpath.util.binarySearch(bigList, 333), 167, "Value not in big list");
        equals(xpath.util.binarySearch(bigList, 788), 394, "Value in big list");
        
        var reverseCmp = function(a, b) { return b < a ? -1 : 1; };
        bigList.reverse();
        // Note: the index SHOULD be floor(1000 - value / 2 + 1)
        equals(xpath.util.binarySearch(bigList, 33, reverseCmp), 983, "Custom cmp, value not in list");
        equals(xpath.util.binarySearch(bigList, 900, reverseCmp), 549, "Custom cmp, value in list");
    });
});
