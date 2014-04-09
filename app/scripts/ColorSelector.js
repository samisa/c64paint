define(["jquery", 
        "underscore",
        "backbone"], 
function($, _, Backbone) {

    return Backbone.View.extend({
	tagName: "div",
        className: 'c64-ColorSelector',

	events: {
            "click > .c64-colorItem": function(e) {
                this.$el.find('.c64-primarySelection').css({ 'background': $(e.target).css('background') });
                this.selectPrimaryColor($(e.target).index());
                return false;
            },

            "contextmenu > .c64-colorItem": function(e) { // = right click
                this.$el.find('.c64-secondarySelection').css({ 'background': $(e.target).css('background') });
                this.selectSecondaryColor($(e.target).index());
                return false;
            },
	},
        
	initialize: function(options) {
            var that = this;
            _(options.colors.length).times(function(i) {
                that.$el.append($('<div>')
                                .css('background', options.colors[i])
                                .addClass('c64-colorItem')
                               );
            }); 

            that.$el.append($('<div>').addClass('c64-primarySelection'))
                .append($('<div>').addClass('c64-secondarySelection'));
        },

        selectPrimaryColor: function(index) {
          this.trigger('c64:colorSelected:primary', index);
  
        },

        selectSecondaryColor: function(index) {
          this.trigger('c64:colorSelected:secondary', index);
        }
    });
});