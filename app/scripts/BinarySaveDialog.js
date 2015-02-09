define(["jquery",
        "underscore",
        "backbone"],
       function($, _, Backbone) {

    return Backbone.View.extend({
        tagName: "div",
        className: 'c64-dialog c64-BinarySaveDialog',

        events: {
            "click .c64-colorItem": function(e) {
                this.def.resolve($(e.target).index());
                return false;
            },
            "click .c64-okButton": '_resolve',
            "click .c64-cancelButton": '_cancel'
        },

        initialize: function(opts) {
            this.def = $.Deferred();

            this.settings = opts;

            var $mask = $('<div class="c64-dialog-mask">');
            var $content = $('<div class="c64-dialog-content">');
            var $info = $('<div class="c64-dialog-info">').text(
                'Save ' + opts.mode + ' image binary. ...'
            );

            $content.append($info);
            $content.append(
                $('<div class="c64-fileNameInput">').append(
                    $('<label class="c64-label">File name: </label>'),
                    $('<input type="text" class="c64-fileNameField" value="image.bin">'
                     )
                )
            );

            $content.append(
                $('<div>').addClass('c64-buttons').append(
                    $('<button>').addClass('c64-okButton').text('Ok'),
                    $('<button>').addClass('c64-cancelButton').text('Cancel')
                ));

            this.$el.append($mask).append($content);
        },

        show: function() {
            $('body').append(this.$el);
            return this;
        },

        dismiss: function() {
            this.$el.remove();
        },

        getPromise: function() {
            return this.def.promise();
        },

        _resolve: function() {
            this.settings.fileName = this.$el.find(".c64-fileNameField").val();
            this.def.resolve();
        },

        _cancel: function() {
            this.def.reject();
        }
    });
});
