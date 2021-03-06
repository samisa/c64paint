define(["jquery",
        "underscore",
        'backbone',
        'SwapColorDialog'
],
function($, _, Backbone, SwapColorDialog) {

    function getEventCoords(ev) {
        var x, y;

        var canoffset = $(ev.target).offset();
        x = ev.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canoffset.left);
        y = ev.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canoffset.top) + 1;

        return [x,y];
    }

    var Brush = function(canvasView) {
        var that = this;
        var painting = false;
        var $canvas = canvasView.get$Canvas();

        function mouseDown(ev) {
            var xy = getEventCoords(ev);
            canvasView.paintPixel(xy[0], xy[1], ev.button > 1);
            painting = true;
            return false;//To prevent text select cursor when painting
        };

        function mouseMove(ev) {
            if (!painting) {
                return;
            }

            var xy = getEventCoords(ev);
            canvasView.paintPixel(xy[0], xy[1], ev.button > 1);
        };

        function mouseUp() {
            that.trigger('c64-paintevent');
            painting = false;
        };

        function mouseOut() {
            if (painting) {
                that.trigger('c64-paintevent');
                painting = false;
            }
            //TODO: on mouse in check if button is down and painting...
        };

        $canvas.on('mousemove', mouseMove);
        $canvas.on('mouseup', mouseUp);
        $canvas.on('mousedown', mouseDown);
        $canvas.on('mouseout', mouseOut);

        this.remove = function() {
            $canvas.off('mousemove', mouseMove);
            $canvas.off('mouseup', mouseUp);
            $canvas.off('mousedown', mouseDown);
            $canvas.off('mouseout', mouseOut);
            that.off();
        };
    };

    var Bucket = function(canvasView){
        var colormap = canvasView.getIndexedColorMap();
        var $canvas = canvasView.get$Canvas();
        var that = this;

        function fill(ev) {
            var xy = getEventCoords(ev);
            var ij = canvasView.toijCoord(xy[0], xy[1]);
            var startColor = colormap[ij[0] + ij[1] * 320];
            floodFill(ij[0], ij[1], canvasView.currentPrimaryColorIndex, startColor);
            canvasView.setIndexedColorMap(colormap);
            that.trigger('c64-paintevent');
            return false;
        }

        var floodFill = function(i, j, color, startColor) {
            function paintPoint(i, j) {
                if (colormap[j * 320 + i] === color ||
                    colormap[j * 320 + i] !== startColor ||
                    i < 0 || j < 0 || i > 320 || j > 200) {
                    return false;
                } else {
                    colormap[j * 320 + i] = color;
                    return true;
                }
            }

            var stack = [[i,j]];

            while(stack.length) {
                var point = stack.pop();
                var contin = paintPoint(point[0], point[1]);
                if (contin) {
                    stack.push([point[0] + 1, point[1]]);
                    stack.push([point[0] - 1, point[1]]);
                    stack.push([point[0], point[1] + 1]);
                    stack.push([point[0], point[1] - 1]);
                }

            }
        };

        // // ahh... woulde be so nice recursively. this will blow the stack...
        // var floodFillRec = function(i, j, color, startColor) {
        //     if (colormap[j * 320 + i] !== startColor || i < 0 || j < 0 || i > 320 || j > 200) {
        //         return;
        //     } else {
        //         colormap[j * 320 + i] = color;
        //         floodFillRec(i + 1, j, color, startColor);
        //         floodFillRec(i - 1, j, color, startColor);
        //         floodFillRec(i, j + 1, color, startColor);
        //         floodFillRec(i, j - 1, color, startColor);
        //     }
        // };

        $canvas.on('click', fill);

        this.remove = function() {
            $canvas.off('click', fill);
            that.off();
        };
    };

    var ColorSwapper = function(canvasView) {
        var colormap = canvasView.getIndexedColorMap();
        var $canvas = canvasView.get$Canvas();
        var that = this;

        function swapColor(startColor, color) {
            for (var i = 0; i < colormap.length; i++) {
                if (colormap[i] === startColor) {
                    colormap[i] = color;
                }
            }

            canvasView.setIndexedColorMap(colormap);
            that.trigger('c64-paintevent');
        };

        function promptSwapColor(ev) {
            var xy = getEventCoords(ev);
            var ij = canvasView.toijCoord(xy[0], xy[1]);
            var startColor = colormap[ij[0] + ij[1] * 320];

            var dialog = new SwapColorDialog({ startColor: startColor }).show();
            dialog.getColor()
                .done(function(color) {
                    swapColor(startColor, color);
                })
                .always(function() {
                    dialog.dismiss();
                });
        };

        $canvas.on('click', promptSwapColor);

        this.remove = function() {
            $canvas.off('click', promptSwapColor);
            that.off();
        };

    };

    function getTool(key, canvasView) {
        if (key === 'brush') {
            return new Brush(canvasView);
        } else if (key === 'bucket') {
            return new Bucket(canvasView);
        } else if (key === 'colorswapper') {
            return new ColorSwapper(canvasView);
        }
    }

    _.extend(Brush.prototype, Backbone.Events);
    _.extend(Bucket.prototype, Backbone.Events);
    _.extend(ColorSwapper.prototype, Backbone.Events);

    return {
        getTool: getTool
    }
});
