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
            this.center = [160, 100]; //in ij coords

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

        render: function() {
            this.ctx.drawImage(this.options.imageRef, 0, 0, this.w, this.h);

            //drawbox
            var s = this.scale;
            var c = [this.center[0] * this.w / 320, this.center[1] * this.h / 200];

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

            this.center = this.boundCenter(x * 320 / this.w, y * 200 / this.h);
            this.render();
            this.trigger('c64:zoomRectChanged', { center: this.center, scale: this.scale });
        },

        boundCenter: function(i, j) {
            var minx = 160/this.scale;
            var maxx = 320 - minx;
            var miny = 100/this.scale;
            var maxy = 200 - miny;
            return [
                Math.min(maxx, Math.max(minx, Math.floor(i))),
                Math.min(maxy, Math.max(miny, Math.floor(j)))
            ];
        }
    });
});
