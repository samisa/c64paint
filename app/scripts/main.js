require.config({
    paths: {
        jquery: '../bower_components/jquery/jquery',
        underscore: '../bower_components/underscore/underscore',
        backbone: '../bower_components/backbone/backbone',
        text: '../bower_components/requirejs-text/text'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ["underscore", "jquery"],
            exports: 'Backbone'
        }
    }
});

require(['app', 'jquery'], function (app, $) {
    'use strict';
    app.init();
});
