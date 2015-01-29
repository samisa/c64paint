define(["jquery",
        "underscore",
        "backbone",
        "ColorSelector",
        "ZoomControl",
        "ModeSelector",
        "BackgroundColorSelector",
        "paintTools",
        "UndoView",
        "utils",
        "json!palette.json"],
       function($, _, Backbone, ColorSelector, ZoomControl, ModeSelector, BackgroundColorSelector, tools, UndoView, utils, COLORS) {

    var ASPECT = 320/200;
    var COLOR_STYLES = _.map(COLORS, function(rgb) {
       return 'rgb(' + rgb.join(',') + ')';
    });

    function indexedColorToByteArray(array, pixel, colorIndex) {
        var clr = COLOR_STYLES[colorIndex];
        var pos = pixel * 4;
        array[pos] = clr[0];
        array[pos + 1] = clr[1];
        array[pos + 2] = clr[2];
        array[pos + 3] = 255;
    };

    //input = 200 * 320 array
    var validate = function(colorIndexArray, mode, backgroundColor) {
        var blocks = []; //pixels to blocks
        var blockIndex;
        var i, j;

        for (j = 0; j < 200; j++) {
            for (i = 0; i < 320; i+=(mode === 'multicolor' ? 2 : 1)) { //we can assume adjacent pairs are of same color....... could assert this????
                var color = colorIndexArray[320*j + i];
                if (mode === 'multicolor' && color === backgroundColor) continue;
                //blocks per row = 40
                blockIndex = (40 * Math.floor(j / 8)) + Math.floor(i / 8);
                blocks[blockIndex] = blocks[blockIndex] || [];
                blocks[blockIndex].push(color);
            }
        }

        return _.chain(blocks).map(function(b) {
            return _.uniq(b).length <= (mode === 'multicolor' ? 3 : 2);
        }).value();
    };


    return Backbone.View.extend({
        tagName: "div",
        className: 'c64-CanvasView',

        events: {
            "contextmenu .c64-paintCanvas": function(e) {
                //prevent context menu
                return false;
            },
            "click .c64-toggleGrid": "toggleGrid",
            "click .c64-toggleValidation": "toggleValidation",
            "click .c64-tool-brush": function() {
                this.selectTool('brush');
            },
            "click .c64-tool-bucket": function() {
                this.selectTool('bucket');
            },
            "click .c64-tool-colorswapper": function() {
                this.selectTool('colorswapper');
            }
        },

        initialize: function(options) {
            this.painting = false;
            this.$canvas = $('<canvas>').addClass('c64-paintCanvas');
            this.$el.append(this.$canvas);
            this.ctx = this.$canvas[0].getContext("2d");
            this.$canvasHidden = $('<canvas>').addClass('c64-hiddenCanvas');
            this.$el.append(this.$canvasHidden);
            this.ctxHidden = this.$canvasHidden[0].getContext("2d");

            //Big enough to reduce smoothing of pixels when scaling. multiple of the c64 resolution to avoid artifacts.
            this.w = 320*3;
            this.h = this.w/ASPECT;

            //These must match the actual shown canvas size (css)
            this.shownW = 750;
            this.shownH = this.shownW/ASPECT;

            this.$canvas.attr({'width': this.w + 'px'});
            this.$canvas.attr({'height': this.h + 'px'});
            this.$canvasHidden.attr({'width': this.w + 'px'});
            this.$canvasHidden.attr({'height': this.h + 'px'});

            this.ctxHidden.fillStyle = 'rgba(0, 0, 0, 255)';
            this.ctxHidden.fillRect(0, 0, this.w, this.h);
            this.scale = 1;

            this.scale = 1;
            this.boxcorner = [0, 0];

            this.zoomControl = new ZoomControl({ imageRef: this.$canvasHidden[0] });
            this.listenTo(this.zoomControl, 'c64:zoomRectChanged', this.setViewBox);

            var colorSelector = new ColorSelector({ colors: COLOR_STYLES });
            this.$el.append(colorSelector.$el);
            this.listenTo(colorSelector, 'c64:colorSelected:primary', this.setPrimaryColor);
            this.listenTo(colorSelector, 'c64:colorSelected:secondary', this.setSecondaryColor);
            colorSelector.selectPrimaryColor(1);
            colorSelector.selectSecondaryColor(0);

            this.undoView = new UndoView({ canvasView: this, depth: 4 });
            this.backgroundColorSelector = new BackgroundColorSelector({
                initialColor: 0,
                colorStyles: COLOR_STYLES
            });

            this.$el.append($('<div>').addClass('c64-sidePanel').append(
                this.zoomControl.$el,
                $('<div>').addClass('c64-toolBox').append(
                    $('<div>').addClass('c64-tool-brush'),
                    $('<div>').addClass('c64-tool-bucket'),
                    $('<div>').addClass('c64-tool-colorswapper')),
                new ModeSelector({ mode: options.mode }).$el,
                this.backgroundColorSelector.$el,
                $('<div>').addClass('c64-gridButtons').append(
                    $('<button>').addClass('c64-toggleGrid').text('Toggle grid'),
                    $('<button>').addClass('c64-toggleValidation').text('Toggle/Refresh Validation')),
                this.undoView.$el
            ));

            this.selectTool('brush');
            this.setMode(options.mode);
            this.repaint();
        },

        pushState: function() {
            this.undoView.pushState();
            this.zoomControl.render();
        },

        getImgRef: function() {
            return this.$canvasHidden[0];
        },

        getImgData: function() {
            return this.ctxHidden.getImageData(0, 0, this.w, this.h);
        },

        setImgData: function(imgData) {
            this.ctxHidden.putImageData(imgData, 0, 0);
            this.repaint();
        },

        setImage: function(pixels) {//assume 200x320 pixels
            this.setIndexedColorMap(pixels);
            this.pushState();
        },

        setViewBox: function(vals) {
            this.scale = vals.scale;
            // box corner is in i,j coords
            this.boxcorner = [Math.floor(vals.center[0] - 160/vals.scale),
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

            this.ctx.drawImage(this.$canvasHidden[0], this.boxcorner[0] * this.w/320, this.boxcorner[1] * this.h/200, this.w/this.scale, this.h/this.scale,
                                                 0, 0, this.w, this.h);

            if (this.showGrid) {
                //scaled  xy-coordinates
                var gap = this.scale * this.w/320*8;
                var offsetX = -(gap / 8) * (this.boxcorner[0] % 8);
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
            return [this.w/320 * (m*8 - this.boxcorner[0]),
                    this.h/200 * (n*8 - this.boxcorner[1]),
                    this.w/320*8,
                    this.h/200*8];
        },

        getRect: function(i, j) {
            if (this.mode === 'hires') {
                return [this.w/320 * i, this.h/200 * j, this.w/320, this.h/200];
            } else {//if (this.mode === 'multicolor') {
                return [this.w/320 * Math.floor(i/2)*2, this.h/200 * j, 2*this.w/320, this.h/200];
            }
        },

        toijCoord: function(x, y) {
            return  [Math.floor(x / (this.shownW *this.scale) * 320) + this.boxcorner[0], Math.floor(y / (this.shownH *this.scale) * 200) + this.boxcorner[1]];
        },

        _pixelToCanvas: function(i, j, color) {
            this.ctx.save();
            var rect = this.getRect(i, j);
            this.ctxHidden.fillStyle = COLOR_STYLES[color];
            this.ctxHidden.fillRect(rect[0], rect[1], rect[2], rect[3]);
            this.ctxHidden.restore();
        },

        paintPixel: function(x, y, useSecondaryColor) {
            var color =  useSecondaryColor ?  this.currentSecondaryColorIndex: this.currentPrimaryColorIndex;
            var ij = this.toijCoord(x, y);
            var i = ij[0];
            var j = ij[1];
            this._pixelToCanvas(i, j, color);
            this.repaint();
        },

        toggleGrid: function() {
            this.showGrid = !this.showGrid;
            this.repaint();
        },

        toggleValidation: function() {
            this.showValidation = !this.showValidation;
            this.refreshValidation();
            this.repaint();
        },

        refreshValidation: function() {
            if (this.showValidation) {
                this.invalidBlocks = _(validate(this.getIndexedColorMap(), this.mode, this.getBackgroundColor())).reduce(function(collection, isValid, index) {
                    if (!isValid) {
                        collection.push(index);
                    }
                    return collection;
                }, []);
            }
        },

        selectTool: function(toolName) {
            this.$el.find('.c64-toolBox > div').removeClass('c64-selected');
            this.$el.find('.c64-tool-' + toolName).addClass('c64-selected');

            if (this.tool) {
                this.tool.remove();
            }

            this.tool = tools.getTool(toolName, this);
            this.listenTo(this.tool, 'c64-paintevent', this.pushState);

        },

        setMode: function(mode) {
            if (mode === 'hires') {
                this.backgroundColorSelector.disable();
            } else {
                this.backgroundColorSelector.enable();
            }

            if (this.mode === 'hires' && mode !== 'hires') {
                this.pushState();
                this.mode = mode;
                var indexmap = this.getIndexedColorMap();
                utils.downSample(indexmap);
                this.setIndexedColorMap(indexmap);
            } else {
                this.mode = mode;
            }

            this.refreshValidation();
        },

        get$Canvas: function() {
            return this.$canvas;
        },

        getIndexedColorMap: function() {
            var data = this.ctxHidden.getImageData(0, 0, this.w, this.h).data;
            var indices = [];
            var scale = this.w/320;

            for (var j = 0; j < 200; j++) {
                for (var i = 0; i < 320; i++) {
                    var x = i*scale + Math.floor(scale/2);
                    var y = j * scale + Math.floor(scale/2);
                    var p = 4*(y*320*scale + x);
                    indices.push(utils.toc64ColorIndex([data[p], data[p + 1], data[p + 2]]));
                }
            }

            return indices;
        },

        setIndexedColorMap: function(colormap) {
            for (var j = 0; j < 200; j++) {
                for (var i = 0; i < 320; i++) {
                    this._pixelToCanvas(i, j, colormap[j*320 + i]); //TODO: ON multicolor mode this will do double work...as pixel to canvas takes care of pixel width...
                }
            }
            this.repaint();
        },

        getBackgroundColor: function() {
            return this.mode === 'multicolor' ? this.backgroundColorSelector.getColor() : undefined;
        }

    });
});
