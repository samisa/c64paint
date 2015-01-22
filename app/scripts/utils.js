define(["jquery",
        "underscore",
        "json!palette.json"],

function($, _, COLORS) {

    var colors_ = _(COLORS).chain();

    // gets index of c64 color that is closest to given rgb color
    // need to be fast
    var toc64ColorIndex = function(c) {
        var closestColor = 0;
        var closestDist = 10000000;
        for (var i = 0; i < COLORS.length; i++) {
            var clr = COLORS[i];
            var dist = Math.pow(c[0] - clr[0], 2) + Math.pow(c[1] - clr[1], 2) + Math.pow(c[2] - clr[2], 2);
            if (dist < closestDist) {
                closestColor = i;
                closestDist = dist;
            }
        };

        return closestColor;
    };

    var downSample = function(colorMap) {
        var avrg = function(a1, a2) {
            return [
                (a1[0] + a2[0]) / 2,
                (a1[1] + a2[1]) / 2,
                (a1[2] + a2[2]) / 2
            ];
        };

        var i, j;
        for (j = 0; j < 200; j++) {
            for (i = 0; i < 160; i++) {
                colorMap[j * 320 + 2 * i] = colorMap[j * 320 + 2 * i + 1] =
                    toc64ColorIndex(avrg(COLORS[colorMap[j * 320 + 2 * i]],
                                         COLORS[colorMap[j * 320 + 2 * i + 1]]
                                        )
                                   );
            }
        }
    };

    return {
        toc64ColorIndex: toc64ColorIndex,
        downSample: downSample
    };
});
