define(["jquery", 
        "underscore",
        "backbone"], 
function($, _, Backbone) {

    return Backbone.View.extend({
	tagName: "div",
        className: 'c64-ColorSelector',

	events: {
            "click >div": 'select'
	},
        
	initialize: function(options) {
            var that = this;
            _(options.colors.length).times(function(i) {
                that.$el.append($('<div>').css('background', options.colors[i]));
            }); 
        },

        select: function(e) {
            this.trigger('c64:colorSelected', $(e.target).index()); 
        }
    });
});