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
            'click .c64-redo-button': 'redo',
        },

        initialize: function(dataRef, depth) {
            var that = this;
            this.dataRef = dataRef;
            this.depth = depth;
            this.buffer = [];
            this.bufferPointer = -1;
            this.stackPointer = -1;
            this.size = 0;

            _(depth).times(function() {
                var buffer = new ArrayBuffer(dataRef.length);
                that.buffer.push(new Int8Array(buffer));
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
            this._copyData(this.dataRef, this.buffer[this.bufferPointer]);            
        },
        
        undo: function() {
            if (this.stackPointer === 0) {
                return; //no states left, do nothing
            }


            this.$el.find('.c64-redo-button').attr({ 'disabled': false });

            this.bufferPointer = this.bufferPointer > 0 ? this.bufferPointer - 1 : this.depth - 1; 
            this.stackPointer--;

            this._copyData(this.buffer[this.bufferPointer], this.dataRef);
          
            if (this.stackPointer === 0) {
                this.$el.find('.c64-undo-button').attr({ 'disabled': true });
            }

            this.trigger('c64:undo');
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

            this._copyData(this.buffer[this.bufferPointer], this.dataRef);            

            this.trigger('c64:redo');
        },

        _copyData: function(src, dst) {
            _(src.length).times(function(i) {
                dst[i] = src[i];
            });
        }
    });
});
