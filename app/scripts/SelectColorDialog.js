define(["jquery",
        "underscore",
        "backbone"],
       function($, _, Backbone) {

    return Backbone.View.extend({
        tagName: "div",
        className: 'c64-dialog c64-SelectColorDialog',

        events: {
            "click .c64-colorItem": function(e) {
                this.def.resolve($(e.target).index());
                return false;
            },
            "click .c64-dialog-mask": function(e) {
                this.def.reject();
            }

        },

        initialize: function(opts) {
            this.def = $.Deferred();

            var $mask = $('<div class="c64-dialog-mask">');
            var $content = $('<div class="c64-dialog-content">');
            var $palette = $('<div class="c64-selectColorPalette">');
            _(opts.colorStyles).each(function(clr) {
                $palette.append($('<div>')
                                .css('background', clr)
                                .addClass('c64-colorItem')
                               );
            });

            $content.append($palette);
            this.$el.append($mask).append($content);
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
