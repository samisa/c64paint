define(["jquery", 
        "underscore",
        "backbone",
        "CanvasView"], 
function($, _, Backbone, CanvasView) {
    return Backbone.View.extend({
	tagName: "div",
//	className: "todo-item",
//	visible: true,
//	template: itemTpl,


	initialize: function() {
            var canvasView = new CanvasView({viewName: 'canvas-view'});
            this.$el.append(canvasView.$el);
        }

	// render: function () {
	// 		this.$el.html(this.template(this.model.toJSON()));
	// 		this.vToggleDone();
	// 		return this;
	// 	},

    });
});