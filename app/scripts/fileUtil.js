define(["jquery",
        "underscore",
        "json!palette.json"],

function($, _, COLORS) {
    'use strict';

    // assume input bytes contain nothin but color indices
    // of 320*200 pixels (16 color c64 palette)
    var bytesToColorIndexMap = function(bytes) {

    };

    // due to lack of good imagefile manipulation libs, use canvas for that purpose
    // convert to appropriate resolution and find closest match from palette, based on slelcted graphics mode
    var imageFileToc64 = function(file, mode) {
        var reader = new window.FileReader();
        var def = $.Deferred();

        reader.onload = function(e) {
            var $canvas = $('<canvas>');
            var ctx = $canvas[0].getContext("2d");
            $canvas.attr({'width': '320px'});
            $canvas.attr({'height': '200px'});

            var img = new window.Image();
            img.onload = function(){
                var scale = img.width < 320 && img.height < 200 ?
                        Math.min(img.width/320, img.height/200):
                        Math.max(img.width/320, img.height/200);

                ctx.drawImage(img,0,0, img.width/scale, img.height/scale);
                var imageData = ctx.getImageData(0,0, 320, 200);
                var data = imageData.data;

                var colors = [];
                for (var i = 0, n = data.length/4; i < n; i++) {
                    colors[i] = [data[i*4], data[i*4 + 1], data[i*4 + 2]]; // rgb, ignore alpha
                }

                var byteArray = _colorsToC64ColorIndices(colors);
                def.resolve(byteArray);
            };

            img.src = e.target.result;
        };

        reader.onerror = function(e) {
            def.reject(e.target.result);
        };

        reader.readAsDataURL(file);

        return def.promise();
    };

    //expect [320*200][r,g,b] data
    //return [320*200]c64index byte array, with 2 adjacent pixels averaged
    //TODO: now assumes mode=multicolor, next ones to support: hires, mci, ifli
    var _colorsToC64ColorIndices = function(colors, mode) {
        var buffer = new window.ArrayBuffer(200 * 320);
        var bytes = new window.Int8Array(buffer);
        var i, j;

        for (j = 0; j < 200; j++) {
            for (i = 0; i < 160; i++) {
                var color1 = colors[j*320 + 2 * i];
                var color2 = colors[j*320 + 2 * i + 1];
                var avrg = _avrg(color1, color2);
                bytes[j * 320 + 2 * i] = bytes[j * 320 + 2 * i + 1] = _toc64ColorIndex(avrg);
            }
        }

        return bytes;
    };

    function _avrg(a1, a2) {
        return [
            (a1[0] + a2[0]) / 2,
            (a1[1] + a2[1]) / 2,
            (a1[2] + a2[2]) / 2
        ];
    };

    var _toc64ColorIndex = (function() {


        return function(c) {
            var dist2Toc = function(clr, i) {
                return [
                    Math.pow(c[0] - clr[0], 2) + Math.pow(c[1] - clr[1], 2) + Math.pow(c[2] - clr[2], 2),
                    i
                ];
            };

            return _(COLORS)
                .chain()
                .map(dist2Toc)
                .min(function(distAndIndex) { return distAndIndex[0] })
                .value()[1];
        };

    })();

    var saveImg = function(data) {
        var $canvas = $('<canvas>');
        var ctx = $canvas[0].getContext("2d");
        $canvas.attr({'width': '320px'});
        $canvas.attr({'height': '200px'});

        for (var j = 0; j < 200; j++) {
            for (var i = 0; i < 160; i++) {
                ctx.fillStyle = COLORS[data[160*j + i]];
                ctx.fillRect(i*2, j, 2, 1 );
            }
        }

        window.open($canvas[0].toDataURL("image/png"));
    };

    return {
        bytesToColorIndexMap: bytesToColorIndexMap,
        imageFileToc64: imageFileToc64,
        saveImg: saveImg
    };
});
