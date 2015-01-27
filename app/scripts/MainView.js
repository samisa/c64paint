define(["jquery",
        "underscore",
        "backbone",
        "CanvasView",
        "FileSelector",
        "fileUtil"],
       function($, _, Backbone, CanvasView, FileSelector, fileUtil) {
    'use strict';

    return Backbone.View.extend({
        tagName: "div",
        className: 'c64-mainView',

        events: {
            'c64:mode-selected': 'setMode'
        },

        initialize: function() {
            this.mode = 'hires';

            this.fileSelector = new FileSelector({ mode: this.mode });
            this.canvasView = new CanvasView({
                viewName: 'canvas-view',
                mode: this.mode
            });

            this.listenTo(this.fileSelector, 'c64:file-selected', this.setFile);
            this.listenTo(this.fileSelector, 'c64:save-image', this.saveImage);
            this.listenTo(this.fileSelector, 'c64:save-image-binary', this.saveImageBinary);

            this.$el
                .append(this.fileSelector.$el)
                .append(this.canvasView.$el);
        },

        setMode: function(ev, mode) {
            this.mode = mode;
            this.canvasView.setMode(mode);
        },

        setFile: function() {
            var that = this;
            this.fileSelector.getFileContents(this.mode).done(function(bytes) {
                //validate bytes...
                that.canvasView.setImage(bytes);
                //var colorMap = fileUtil.bytesToColorIndexMap(bytes);
            });
        },

        saveImage: function() {
            this.fileSelector.saveImg(this.canvasView.getImgRef());
        },

        saveImageBinary: function() {
            this.fileSelector.saveBinary(this.canvasView.getIndexedColorMap(), {
                mode: this.mode,
                backgroundColor: this.canvasView.getBackgroundColor()
            });
        }
    });
});
