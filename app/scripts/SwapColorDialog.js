define(["jquery",
        "underscore",
        "backbone",
        "json!palette.json"],
       function($, _, Backbone, COLORS) {

    COLORS = _.map(COLORS, function(rgb) {
       return 'rgb(' + rgb.join(',') + ')';
    });

    return Backbone.View.extend({
        tagName: "div",
        className: 'c64-dialog c64-SwapColorDialog',

        events: {
            "click .c64-colorItem": function(e) {
                this._selectColor($(e.target).index());
                return false;
            },
            "click .c64-okButton": '_resolve',
            "click .c64-cancelButton": '_cancel'
        },

        initialize: function(opts) {
            this.def = $.Deferred();

            var $mask = $('<div class="c64-dialog-mask">');
            var $content = $('<div class="c64-dialog-content">');
            var $palette = $('<div class="c64-swapColorPalette">');
            _(COLORS).each(function(clr) {
                $palette.append($('<div>')
                                     .css('background', clr)
                                     .addClass('c64-colorItem')
                                    );
            });

            $content.append($('<div>')
                                  .addClass('c64-startColor')
                                  .css('background', COLORS[opts.startColor])
                                 );

            $content.append($('<div>').addClass('c64-text').text('to:'));

            $content.append($palette);

            $content.append(
                $('<div>').addClass('c64-buttons').append(
                    $('<button>').addClass('c64-okButton').text('Ok'),
                    $('<button>').addClass('c64-cancelButton').text('Cancel')
                ));

            this._selectColor(0);
            this.$el.append($mask).append($content);
        },

        _resolve: function() {
            this.def.resolve(this.selectedColor);
        },

        _cancel: function() {
            this.def.reject();
        },

        _selectColor: function(clr) {
            this.$el.find('.c64-colorItem').removeClass('c64-selected');
            this.$el.find('.c64-colorItem').eq([clr]).addClass('c64-selected');
            this.selectedColor = clr;
        },

        show: function() {
            $('body').append(this.$el);
            return this;
        },

        dismiss: function() {
            this.$el.remove();
        },

        getColor: function() {
            return this.def.promise();
        }
    });
});
