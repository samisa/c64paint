define(["jquery",
        "underscore",
        "backbone",
        "SelectColorDialog"],
function($, _, Backbone, SelectColorDialog) {
    'use strict';

    return Backbone.View.extend({
        tagName: "div",
        className: "c64-BackgroundColorSelector",

        events: {
            'click .c64-colorSelectorColor': 'selectColor'
        },

        initialize: function(options) {
            var that = this;
            this.color = options.initialColor;
            this.colorStyles = options.colorStyles;

            this.$color = $('<div>')
                    .css('background', options.colorStyles[this.color])
                    .addClass('c64-colorItem c64-colorSelectorColor');

            this.$el.append($('<label class="c64-label">').text('Background color:')).append(this.$color);
        },

        selectColor: function(ev) {
            var that = this;
            var dialog = new SelectColorDialog({ colorStyles: this.colorStyles }).show();
            dialog.getColor()
                .done(function(color) {
                    that.color = color;
                    that.$color.css('background', that.colorStyles[that.color]);
                })
                .always(function() {
                    dialog.dismiss();
                });
        },

        getColor: function() {
            return this.color;
        }
    });
});
