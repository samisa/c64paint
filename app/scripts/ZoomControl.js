define(["jquery", 
        "underscore",
        "backbone"], 
function($, _, Backbone) {

    var ASPECT = 320/200;

    return Backbone.View.extend({
	tagName: "div",
        className: 'c64-ZoomControl',

	events: {
            "click .c64-zoominButton": 'zoomin',
            "click .c64-zoomoutButton": 'zoomout',
            "click > canvas": 'setCenter'
	},
        
	initialize: function(options) {
            this.options = options;
            this.$canvas = $('<canvas>');    
            this.$el
                .append(this.$canvas)
                .append($('<div>').addClass('c64-buttons')
                        .append($('<button>').addClass('c64-zoominButton').text('+'))
                        .append($('<button>').addClass('c64-zoomoutButton').text('-'))
                       );
        
            
            this.ctx = this.$canvas[0].getContext("2d");
                 
            //TODO: perhaps better to render to 320x200 canvas and then render that to the scaled one
            // to take care of down/up sample artifacts
            this.w = 160;
            this.h = this.w / ASPECT;       
            this.$canvas.attr({'width': this.w + 'px'});
            this.$canvas.attr({'height': this.h + 'px'});            
            this.scale = 1;
            this.center = [80, 100]; //in ij coords

            this.render();
          },

        zoomin: function() {
            this.scale = Math.min(this.scale * 2, 8);
            this.scaleChanged();
        },

        zoomout: function() {
            this.scale = Math.max(this.scale / 2, 1);
            this.scaleChanged();
        },

        scaleChanged: function() {
            this.center = this.boundCenter(this.center[0], this.center[1]);
            this.render();
            this.trigger('c64:zoomRectChanged', { center: this.center, scale: this.scale });
        },

        paintPixels: function() {
            var i, j;
            for (j = 0; j < 200; j++) {
                for (i = 0; i < 160; i++) {
                    this.drawPoint(i, j, this.options.colors[this.options.bitmapRef[j * 160 + i]]);
                }
            }
        },

        drawPoint: function(i, j, color) {
            this.ctx.save();

            var rect = [i * this.w / 160, 
                        j * this.h / 200, 
                        this.w / 160, 
                        this.h / 200];

            this.ctx.fillStyle = color;
            this.ctx.fillRect(Math.floor(rect[0]), Math.floor(rect[1]), Math.ceil(rect[2]), Math.ceil(rect[3]));

            this.ctx.restore();
        },

        render: function() {
            this.paintPixels();
            
            //drawbox
            var s = this.scale;
            var c = [this.center[0] * this.w / 160, this.center[1] * this.h / 200];
            
            var w = this.w/s;
            var h = this.h/s;

            this.ctx.save();
            this.ctx.strokeStyle = "rgb(255, 0, 0)";
            this.ctx.strokeRect(c[0] - w/2, c[1] - h/2, w, h);
            this.ctx.restore();
        },

        setCenter: function(ev) {
            var x, y;
            if (ev.layerX || ev.layerX == 0) { // Firefox
                x = ev.layerX;
                y = ev.layerY;
            } else if (ev.offsetX || ev.offsetX == 0) { // Opera
                x = ev.offsetX;
                y = ev.offsetY;
            }

            this.center = this.boundCenter(x * 160 / this.w, y * 200 / this.h);
            this.render();
            this.trigger('c64:zoomRectChanged', { center: this.center, scale: this.scale });
        },

        boundCenter: function(i, j) {
            var minx = 80/this.scale;
            var maxx = 160 - minx; 
            var miny = 100/this.scale;
            var maxy = 200 - miny; 
            return [
                Math.min(maxx, Math.max(minx, Math.floor(i))), 
                Math.min(maxy, Math.max(miny, Math.floor(j)))
            ];
        }
    });
});