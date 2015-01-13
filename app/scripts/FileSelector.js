define(["jquery",
        "underscore",
        "backbone",
        "fileUtil"],
function($, _, Backbone, fileUtil) {
    'use strict';

    return Backbone.View.extend({
        tagName: "div",

        events: {
            'change .c64-fileSelect': 'fileSelected',
            'click .c64-asPng': 'savePressed',
            'click .c64-asBinary': 'savePressedBinary'
        },

        initialize: function() {
            if (!window.File || !window.FileReader && !window.FileList || !window.Blob) {
                alert('The File APIs are not fully supported in this browser.');
            }

            this.$el.append($('<input type="file">').addClass('c64-fileSelect').text('Open file...'));
             //   <input type="file" nwsaveas />
            this.$el.append($('<button>').addClass('c64-fileSave c64-asPng').text('Canvas to png...'));
            this.$el.append($('<button>').addClass('c64-fileSave c64-asBinary').text('Canvas to c64 binary...'));
        },

        fileSelected: function(ev) {
            this.file = ev.target.files[0];
            this.trigger('c64:file-selected');
        },

        savePressed: function() {
            this.trigger('c64:save-image');
        },

        savePressedBinary: function() {
            this.trigger('c64:save-image-binary');
        },

        saveImg: function(data) {
            fileUtil.saveImg(data);
        },

        saveBinary: function(data) {
            fileUtil.saveAsBinary(data, 'foo');
        },

        getFileContents: function() {
            if (this.file.type.match(/^image/)) {
                return fileUtil.imageFileToc64(this.file);
            }

            //Otherwise assume it's pure color index data
            //TODO: support c64 loadable image format
            var reader = new window.FileReader();
            var def = $.Deferred();

            reader.onload = function(e) {
                def.resolve(new window.Int8Array(e.target.result));
            };

            reader.onerror = function(e) {
                def.reject(e.target.result);
            };

            reader.onerror = function(e) {
                def.reject(e.target.result);
            };

            if (!this.file) {
                def.reject();
            }

            reader.readAsArrayBuffer(this.file);

            return def.promise();
        }
    });
});
