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

	initialize: function() {
            this.fileSelector = new FileSelector();
            this.canvasView = new CanvasView({viewName: 'canvas-view'});
         
            this.listenTo(this.fileSelector, 'c64:file-selected', this.setFile);
            this.listenTo(this.fileSelector, 'c64:save-image', this.saveImage);

            this.$el
                .append(this.fileSelector.$el)
                .append(this.canvasView.$el);
        },

        setFile: function() {
            var that = this;
            this.fileSelector.getFileContents().done(function(bytes) {
                //validate bytes...
                that.canvasView.setImage(bytes);

                //var colorMap = fileUtil.bytesToColorIndexMap(bytes);
            });
        },

        saveImage: function() {
            this.fileSelector.saveImg(this.canvasView.getDataRef());
        }

    });
});