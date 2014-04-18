define(["jquery", 
        "underscore"
], 
function($, _) {

    function getEventCoords(ev) {
        var x, y;
        if (ev.layerX || ev.layerX == 0) { // Firefox
            x = ev.layerX;
            y = ev.layerY;
        } else if (ev.offsetX || ev.offsetX == 0) { // Opera
            x = ev.offsetX;
            y = ev.offsetY;
        }
        
        return [x,y];
    }

    var Brush = function(canvasView) {
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
            painting = false;
        };

        function mouseOut() {
            painting = false;
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
        }
    };

    var Bucket = function(canvasView){
        var colormap = canvasView.getDataRef();
        var $canvas = canvasView.get$Canvas();

        function fill(ev) {
            var xy = getEventCoords(ev);
            var ij = canvasView.toijCoord(xy[0], xy[1]);
            var startColor = colormap[ij[0] + ij[1] * 160];
            floodFill(ij[0], ij[1], canvasView.currentPrimaryColorIndex, startColor);
            canvasView.repaint();
            return false;
        }

        var floodFill = function(i, j, color, startColor) {            
            function paintPoint(i, j) {
                if (colormap[j * 160 + i] === color ||
                    colormap[j * 160 + i] !== startColor || 
                    i < 0 || j < 0 || i > 160 || j > 200) {
                    return false;
                } else {
                    colormap[j * 160 + i] = color;
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
        }

        // this will blow the stack wothout tail call optimization...
        var floodFillRec = function(i, j, color, startColor) {
            if (colormap[j * 160 + i] !== startColor || i < 0 || j < 0 || i > 160 || j > 200) {
                return;
            } else {
                colormap[j * 160 + i] = color;
                floodFillRec(i + 1, j, color, startColor);
                floodFillRec(i - 1, j, color, startColor);
                floodFillRec(i, j + 1, color, startColor);
                floodFillRec(i, j - 1, color, startColor);
            }
        }

        $canvas.on('click', fill);

        this.remove = function() {
            $canvas.off('click', fill);            
        }
    };
    
    function getTool(key, canvasView) {
        if (key === 'brush') {
            return new Brush(canvasView);
        } else if (key === 'bucket') {
            return new Bucket(canvasView);
        } 
    };

    return {
        getTool: getTool
    }    
});