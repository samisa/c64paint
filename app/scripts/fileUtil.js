define(["jquery",
        "underscore",
        "utils",
        "json!palette.json"],

function($, _, utils, COLORS) {
    'use strict';

    // // assume input bytes contain nothin but color indices
    // // of 320*200 pixels (16 color c64 palette)
    // var bytesToColorIndexMap = function(bytes) {

    // };

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

                var byteArray = _colorsToC64ColorIndices(colors, mode);
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
    //return [320*200]c64index byte array, with 2 adjacent pixels averaged to closest match in c64 palette
    //TODO:  mci, ifli
    var _colorsToC64ColorIndices = function(colors, mode) {
        var buffer = new window.ArrayBuffer(200 * 320);
        var bytes = new window.Int8Array(buffer);
        var i, j;

        for (j = 0; j < 200; j++) {
            for (i = 0; i < 320; i++) {
                bytes[j * 320 + i] = utils.toc64ColorIndex(colors[j*320 + i]);
            }
        }

        if (mode === 'multicolor' || mode === 'fli') {
            utils.downSample(bytes);
        }

         return bytes;
     };

     var saveImg = function(imgRef) {
        window.open(imgRef.toDataURL("image/png"));
    };

    var saveAsBinary = function(pixels, settings) {
        var saveLink = document.createElement("a");
        var array = _imgToBinary(pixels, settings);
        var blob = new window.Blob([array], { type: 'application/octet-binary' });

        var url = window.URL.createObjectURL(blob);
        saveLink.href = url;
        saveLink.download = 'foo.bin';
        saveLink.click();
        window.URL.revokeObjectURL(url);
    };

    // arrange to 25*40 cells each of size 4*8 or 8*8 depending on mode
    function _toCells(pixels, mode) {
        var x, y;
        var cells = [];
        var xRes = (mode === 'multicolor' ? 160 : 320);
        var xResPerBlock = (mode === 'multicolor' ? 4 : 8);
        var xPixelWidth = (mode === 'multicolor' ? 2 : 1);
        for (y = 0; y < 200; y++) {
            for(x = 0; x < xRes; x++) {
                var cell = Math.floor(y/8)*40 + Math.floor(x/xResPerBlock);
                var inCellX = x - Math.floor(x/xResPerBlock) * xResPerBlock;
                var inCellY = y - Math.floor(y/8) * 8;
                var inCellPixelPos = inCellX + inCellY * xResPerBlock;
                var pixelPos = inCellPixelPos + cell*xResPerBlock*8;
                cells[pixelPos] = pixels[y*320 + x*xPixelWidth];
            }
        }

        return cells;
    }

    var _imgToBinary = function(pixels, settings) {
        function fix(clr, bgr, colors) {
            return  clr === bgr ? 0 : colors.indexOf(clr)+1;
        }

        if (settings.mode !== 'multicolor' && settings.mode !== 'hires')  {
            throw 'HERE';
        }

        var buffer = settings.mode === 'multicolor' ? new ArrayBuffer(10001) :
                new ArrayBuffer(9000);
        var array = new window.Uint8Array(buffer);


        //TODO:s
        /* 3: support fli*/
        /* 4: mci, ifli*/
        /* 5: data layout chosen by user */

        var cells = _toCells(pixels, settings.mode);
        var bgr = settings.backgroundColor;


        var SCREENDATAORIGIN = 8000;
        var COLORDATAORIGIN = 9000; //hires mode does not use this nor background
        var BACKGROUNDCOLORORIGIN = 10000;

        var xres = settings.mode === 'multicolor' ? 4 : 8;
        for (var cell = 0; cell < 40 * 25; cell++) {
            var colorsInCell = _(cells.slice(cell*8*xres, (cell+1)*8*xres))
                    .chain()
                    .uniq()
                    .without(bgr)
                    .value();

            if (colorsInCell.length > 0) {
                array[SCREENDATAORIGIN + cell] = colorsInCell[0] << 4;
                if (colorsInCell.length > 1) {
                    array[SCREENDATAORIGIN + cell] |= colorsInCell[1];
                    if (colorsInCell.length > 2) {
                        array[COLORDATAORIGIN + cell] = colorsInCell[2];
                    }
                }
            }

            for (var i = 0; i < 8; i++) { //loop over lines in cell. Each line will be represented by one byte in the bitmap
                var posInArray = cell*8 + i;
                var posInCells;

                if (settings.mode === 'multicolor') {
                    posInCells = cell*8*4 + i*4;
                    array[posInArray] =
                        (fix(cells[posInCells], bgr, colorsInCell) << 6) |
                        (fix(cells[posInCells+1], bgr, colorsInCell) << 4) |
                        (fix(cells[posInCells+2], bgr, colorsInCell) << 2) |
                         fix(cells[posInCells+3], bgr, colorsInCell);
                } else if (settings.mode === 'hires') {
                    posInCells = cell*8*8 + i*8;
                    array[posInArray] =
                      ~((colorsInCell.indexOf(cells[posInCells]) << 7) |
                        (colorsInCell.indexOf(cells[posInCells+1]) << 6) |
                        (colorsInCell.indexOf(cells[posInCells+2]) << 5) |
                        (colorsInCell.indexOf(cells[posInCells+3]) << 4) |
                        (colorsInCell.indexOf(cells[posInCells+4]) << 3) |
                        (colorsInCell.indexOf(cells[posInCells+5]) << 2) |
                        (colorsInCell.indexOf(cells[posInCells+6]) << 1) |
                        (colorsInCell.indexOf(cells[posInCells+7])));
                }
            }
        }

        if (settings.mode === 'multicolor') {
            array[BACKGROUNDCOLORORIGIN] = bgr;
        }

        return array;
    };

    return {
        //bytesToColorIndexMap: bytesToColorIndexMap,
        imageFileToc64: imageFileToc64,
        saveImg: saveImg,
        saveAsBinary: saveAsBinary
    };
});
