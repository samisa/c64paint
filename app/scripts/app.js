
define(['jquery',
       'underscore',
       'MainView'], 
       function ($, _, MainView) {
    'use strict';

    return {
        init: function() {
            var mainView = new MainView();
            $('body').append(mainView.$el);
        }
    };
});