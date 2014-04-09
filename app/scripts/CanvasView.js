define(["jquery", 
        "underscore",
        "backbone",
        "ColorSelector",
        "ZoomControl"], 
       function($, _, Backbone, ColorSelector, ZoomControl) {

    var ASPECT = 320/200;

    var COLORS = [
        'rgb(0,0,0)',
        'rgb(255, 255, 255)',
        'rgb(116, 66, 53)',
        'rgb(124, 172, 186)',
        'rgb(123, 72, 144)',
        'rgb(100, 151, 79)',
        'rgb(64, 50, 133)',
        'rgb(191, 205, 122)',
        'rgb(123, 91, 47)',
        'rgb(79, 69, 0)',
        'rgb(163, 114, 101)',
        'rgb(80, 80, 80)',
        'rgb(120, 120, 120)',
        'rgb(164, 215, 142)',
        'rgb(120, 106, 189)',
        'rgb(159, 159, 159)'
    ];
    

    return Backbone.View.extend({
	tagName: "div",
        className: 'c64-CanvasView',

	events: {
            "mousemove .c64-paintCanvas": "mouseMove",
            "mousedown .c64-paintCanvas": "mouseDown",
            "mouseup .c64-paintCanvas": "mouseUp",
            "mouseout .c64-paintCanvas": "mouseOut",
            "contextmenu .c64-paintCanvas": function(e) {
                //prevent context menu
                return false;
            },
            "click .c64-toggleGrid": "toggleGrid"
	},

	initialize: function() {            
            this.painting = false;
            this.$canvas = $('<canvas>').addClass('c64-paintCanvas');    
            this.$el.append(this.$canvas);
            this.ctx = this.$canvas[0].getContext("2d");
            
            this.w = 640;
            this.h = 400;
            this.$canvas.attr({'width': '640px'});
            this.$canvas.attr({'height': '400px'});
            
            this.scale = 1;
            this.boxcorner = [0, 0];
            var buffer = new ArrayBuffer(200 * 160);
            this.colormap = new Int8Array(buffer);
            
            var zoomControl = new ZoomControl({ bitmapRef: this.colormap, colors: COLORS });
            this.$el.append(zoomControl.$el);
            this.listenTo(zoomControl, 'c64:zoomRectChanged', this.setViewBox);

            var colorSelector = new ColorSelector({ colors: COLORS });
            this.$el.append(colorSelector.$el);

            this.listenTo(colorSelector, 'c64:colorSelected:primary', this.setPrimaryColor);
            this.listenTo(colorSelector, 'c64:colorSelected:secondary', this.setSecondaryColor);
            colorSelector.selectPrimaryColor(1);
//            this.setColor(2);


            this.$el.append($('<button>').addClass('c64-toggleGrid').text('Toggle grid'));
            this.$el.append($('<button>').addClass('c64-toggleValidation').text('Toggle Validation'));

            this.repaint();
        },

        getDataRef: function() {
            return this.colormap;
        },

        setImage: function(pixels) {//assume 200x320 pixels
            for (j = 0; j < 200; j++) {
                for (i = 0; i < 160; i++) {
                    this.colormap[j*160 + i] = pixels[j*320 + 2 * i];
                }
            }
            this.repaint();
        },

        setViewBox: function(vals) {
            this.scale = vals.scale;
            // box corner is in i,j coords
            this.boxcorner = [Math.floor(vals.center[0] - 80/vals.scale),
                              Math.floor(vals.center[1] - 100/vals.scale)];
            this.repaint();
        },

        setPrimaryColor: function(i) {
            this.currentPrimaryColorIndex = i;
        },

        setSecondaryColor: function(i) {
            this.currentSecondaryColorIndex = i;
        },

        repaint: function() {
            var i, j;
            for (j = 0; j < 200; j++) {
                for (i = 0; i < 160; i++) {
                    this.drawPoint(i, j, COLORS[this.colormap[j * 160 + i]]);
                }
            }

            if (this.showGrid) {
                //scaled  xy-coordinates
                var gap = this.scale * this.w/320*8;
                var offsetX = (gap / 8) * (this.boxcorner[0] % 4) * 2;
                var offsetY = (gap / 8) * (this.boxcorner[1] % 8);

                var vertLineCount = this.w / gap;
                var horLineCount = this.h / gap;

                this.ctx.save();
                this.ctx.strokeStyle = "rgb(255, 0, 0)";
                this.ctx.lineWidth = 0.5;
                for (i = 0; i <= vertLineCount; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(i*gap + offsetX, 0);
                    this.ctx.lineTo(i*gap + offsetX, this.h);
                    this.ctx.closePath();
                    this.ctx.stroke();
                }

                for (i = 0; i <= horLineCount; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, i*gap + offsetY);
                    this.ctx.lineTo(this.w, i * gap + offsetY);
                    this.ctx.closePath();
                    this.ctx.stroke();
                }

                this.ctx.restore();
            }
        },

        toijCoord: function(x, y) {
            return  [Math.floor(x / (this.w *this.scale) * 160) + this.boxcorner[0], Math.floor(y / (this.h *this.scale) * 200) + this.boxcorner[1]];
        },

        getRect: function(i, j) {
            return [this.w/160 * (i - this.boxcorner[0]), 
                    this.h/200 * (j - this.boxcorner[1]),
                    this.w/160, 
                    this.h/200];
        },

        drawPoint: function(i, j, color) {
            this.ctx.save();

            //other option is to translate -> scale -> draw at origin
            this.ctx.scale(this.scale, this.scale);
            var rect = this.getRect(i, j);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);

            this.ctx.restore();
        },

        mouseDown: function(ev) {
            var x, y;
            if (ev.layerX || ev.layerX == 0) { // Firefox
                x = ev.layerX;
                y = ev.layerY;
            } else if (ev.offsetX || ev.offsetX == 0) { // Opera
                x = ev.offsetX;
                y = ev.offsetY;
            }

            var ij = this.toijCoord(x, y);

            var color = ev.button > 1 ?  this.currentSecondaryColorIndex: this.currentPrimaryColorIndex;
            this.colormap[ij[0] + ij[1] * 160] = color;
            this.drawPoint(ij[0], ij[1], COLORS[color]);
            this.painting = true;

            return false;//To prevent text select cursor when painting
        },

        mouseMove: function(ev) {
            if (!this.painting) {
                return;
            }
            
             // Get the mouse position relative to the canvas element.
            var x, y;
            if (ev.layerX || ev.layerX == 0) { // Firefox
                x = ev.layerX;
                y = ev.layerY;
            } else if (ev.offsetX || ev.offsetX == 0) { // Opera
                x = ev.offsetX;
                y = ev.offsetY;
            }

            var ij = this.toijCoord(x, y);
            var color = ev.button > 1 ?  this.currentSecondaryColorIndex: this.currentPrimaryColorIndex;
            this.colormap[ij[0] + ij[1] * 160] = color;
            this.drawPoint(ij[0], ij[1], COLORS[color]);
        },

        mouseUp: function() {
            this.painting = false;
        },
                                    
        mouseOut: function() {
            this.painting = false;
        },

        toggleGrid: function() {
            this.showGrid = !this.showGrid;
            this.repaint();
        }
    });
});