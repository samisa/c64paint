define(["jquery",
        "underscore",
        "backbone",
        "fileUtil"],
function($, _, Backbone) {
    'use strict';

    var modes = ['multicolor', 'hires'];//fli, mci, ifli

    return Backbone.View.extend({
        tagName: "div",
        className: "c64-modeSelector",

        events: {
            'change .c64-modeSelect': 'modeSelected'
        },

        initialize: function(options) {
            var that = this;

            this.$select = $('<select>').addClass('c64-modeSelect');

            _(modes).each(function(m) {
                that.$select.append(new window.Option(m, m));
            });

            that.$select.val(options.mode);

            this.$el.append($('<label class="c64-label">').text('Mode:')).append(this.$select);
        },

        modeSelected: function(ev) {
            this.mode = this.$select.val();
            this.$el.trigger('c64:mode-selected', this.mode);
        }
    });
});
