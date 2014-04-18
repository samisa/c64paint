define(["jquery", 
        "underscore",
        "backbone",
        "ColorSelector",
        "ZoomControl",
        "paintTools"], 
       function($, _, Backbone, ColorSelector, ZoomControl, tools) {

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

    //input = 200 * 160 array
    var validateMulticolor = function(colorIndexArray) {
        var blocks = []; //pixels to blocks
        for (var j = 0; j < 200; j++) {
            for (var i = 0; i < 160; i++) {
                //blocks per row = 40
                var blockIndex = (40 * Math.floor(j / 8)) + Math.floor(i / 4);
                blocks[blockIndex] = blocks[blockIndex] || [];
                blocks[blockIndex].push(colorIndexArray[160*j + i]);
            }
        }

        return _.chain(blocks).map(function(b) { 
            return _.uniq(b).length <= 4 
        }).value();
    }

    return Backbone.View.extend({
	tagName: "div",
        className: 'c64-CanvasView',

	events: {
            // "mousemove .c64-paintCanvas": "mouseMove",
            // "mousedown .c64-paintCanvas": "mouseDown",
            // "mouseup .c64-paintCanvas": "mouseUp",
            // "mouseout .c64-paintCanvas": "mouseOut",
            "contextmenu .c64-paintCanvas": function(e) {
                //prevent context menu
                return false;
            },
            "click .c64-toggleGrid": "toggleGrid",
            "click .c64-toggleValidation": "toggleValidation",
            "click .c64-tool-brush": function() { this.selectTool('brush'); },
            "click .c64-tool-bucket": function() { this.selectTool('bucket'); }

	},

	initialize: function() {            
            this.painting = false;
            this.$canvas = $('<canvas>').addClass('c64-paintCanvas');    
            this.$el.append(this.$canvas);
            this.ctx = this.$canvas[0].getContext("2d");
            
            this.w = 750;
            this.h = this.w/ASPECT;
            this.$canvas.attr({'width': this.w + 'px'});
            this.$canvas.attr({'height': this.h + 'px'});
            
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
            colorSelector.selectSecondaryColor(0);
//            this.setColor(2);

            this.$el.append($('<div>').addClass('c64-toolBox').append(
                $('<div>').addClass('c64-tool-brush'),
                $('<div>').addClass('c64-tool-bucket')));
            this.$el.append($('<button>').addClass('c64-toggleGrid').text('Toggle grid'));
            this.$el.append($('<button>').addClass('c64-toggleValidation').text('Toggle Validation'));

            this.selectTool('brush');
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
                var offsetX = -(gap / 8) * (this.boxcorner[0] % 4) * 2;
                var offsetY = -(gap / 8) * (this.boxcorner[1] % 8);

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

            var that = this;
            if (this.showValidation) {
                that.ctx.save();
                that.ctx.lineWidth = 1.0;
                that.ctx.strokeStyle = 'rgb(255,0,200)';
                that.ctx.scale(that.scale, that.scale);
                
                _(this.invalidBlocks).each(function(blockIndex) {
                    var n = Math.floor(blockIndex/40);
                    var m = blockIndex % 40;
                    var blockRect = that.getBlockRect(m, n);
                    that.ctx.strokeRect(blockRect[0], blockRect[1], blockRect[2], blockRect[3]);
                });
                that.ctx.restore();
            }
        },

        getBlockRect: function(m, n) {
            return [this.w/160 * (m*4 - this.boxcorner[0]), 
                    this.h/200 * (n*8 - this.boxcorner[1]),
                    this.w/160*4, 
                    this.h/200*8];            
        },

        getRect: function(i, j) {
            return [Math.floor(this.w/160 * (i - this.boxcorner[0])*this.scale), 
                    Math.floor(this.h/200 * (j - this.boxcorner[1])*this.scale),
                    Math.ceil(this.w/160*this.scale), 
                    Math.ceil(this.h/200*this.scale)];
        },

        toijCoord: function(x, y) {
            return  [Math.floor(x / (this.w *this.scale) * 160) + this.boxcorner[0], Math.floor(y / (this.h *this.scale) * 200) + this.boxcorner[1]];
        },

        drawPoint: function(i, j, color) {
            this.ctx.save();
            //other option is to translate -> scale -> draw at origin
            //this.ctx.scale(this.scale, this.scale);
            var rect = this.getRect(i, j);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
            this.ctx.restore();
        },

        paintPixel: function(x, y, useSecondaryColor) {
            var color =  useSecondaryColor ?  this.currentSecondaryColorIndex: this.currentPrimaryColorIndex;
            var ij = this.toijCoord(x, y);
            this.colormap[ij[0] + ij[1] * 160] = color;
            this.drawPoint(ij[0], ij[1], COLORS[color]);
        },

        toggleGrid: function() {
            this.showGrid = !this.showGrid;
            this.repaint();
        },

        toggleValidation: function() {
            this.showValidation = !this.showValidation;
            if (this.showValidation) {
                this.invalidBlocks = _(validateMulticolor(this.colormap)).reduce(function(collection, isValid, index) {
                    if (!isValid) {
                        collection.push(index);
                    }
                    return collection;
                }, []);
            }
            
            this.repaint();
        },

        selectTool: function(toolName) {
            if (this.tool) {
                this.tool.remove();
            }

            this.tool = tools.getTool(toolName, this);
        },

        get$Canvas: function() {
            return this.$canvas;
        }
    });
});