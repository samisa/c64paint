define(["jquery",
        "underscore",
        "backbone"],
function($, _, Backbone) {

    /**
       This is basicallly a stack implemented with a circular buffer implemented with array.
    */
    return Backbone.View.extend({
        tagName: 'div',
        className: 'c64-undoView',

        events: {
            'click .c64-undo-button': 'undo',
            'click .c64-redo-button': 'redo'
        },

        initialize: function(opts) {
            var that = this;
            this.depth = opts.depth;
            this.stack = [];
            this.bufferPointer = -1;
            this.stackPointer = -1;
            this.size = 0;

            this.canvasView = opts.canvasView;

            _(opts.depth).times(function() {
                var dataBuff = new ArrayBuffer(320*200);
                that.stack.push(new Int8Array(dataBuff));
            });

            this.pushState();

            this.$el.append($('<button>').addClass('c64-undo-button').text('undo'),
                            $('<button>').addClass('c64-redo-button').text('redo'));

            this.$el.find('.c64-undo-button').attr({ 'disabled': true });
            this.$el.find('.c64-redo-button').attr({ 'disabled': true });
        },

        pushState: function() {
            this.stackPointer = Math.min(this.stackPointer + 1, this.depth - 1);
            this.size = this.stackPointer + 1;

            this.$el.find('.c64-redo-button').attr({ 'disabled': true });

            if (this.stackPointer > 0) {
                this.$el.find('.c64-undo-button').attr({ 'disabled': false });
            }

            this.bufferPointer = (this.bufferPointer + 1) % (this.depth);

            here too slow
            this._copyData(this.canvasView.getIndexedColorMap(), this.stack[this.bufferPointer]);
        },

        undo: function() {
            if (this.stackPointer === 0) {
                return; //no states left, do nothing
            }


            this.$el.find('.c64-redo-button').attr({ 'disabled': false });
            this.bufferPointer = this.bufferPointer > 0 ? this.bufferPointer - 1 : this.depth - 1;
            this.stackPointer--;
            this.canvasView.setIndexedColorMap(this.stack[this.bufferPointer]);

            if (this.stackPointer === 0) {
                this.$el.find('.c64-undo-button').attr({ 'disabled': true });
            }
        },

        redo: function() {
            if (this.stackPointer >= this.size) {
                return; // we shouldn't get here if buttons are disabled correctly...
            }

            this.stackPointer++;
            this.bufferPointer = (this.bufferPointer + 1) % this.depth;

            if (this.stackPointer >= this.size - 1) {
                this.$el.find('.c64-redo-button').attr({ 'disabled': true });
            }

            this.$el.find('.c64-undo-button').attr({ 'disabled': false });
            this.canvasView.setIndexedColorMap(this.stack[this.bufferPointer]);
        },

        _copyData: function(src, dst) {
            _(src.length).times(function(i) {
                dst[i] = src[i];
            });
        }
    });
});
