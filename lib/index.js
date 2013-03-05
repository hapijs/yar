// Load modules

var Hoek = require('hoek');
var Session = require('./session');


// Declare internals

var internals = {};

internals.defaults = {
    name: 'yar',
    isSingleUse: false,             // Cleared after every request, unless modified. Override via route.config.plugins.yar.retain set to true
    cookieOptions: {                // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
        path: '/'
    },
    session: false
};

internals.sessionDefaults = {
    key: 'session',
    sidKey: 'sid',
    startKey: 'sst', // server start time
    maxLen: 2400                // Maximum size allowed in a cookie
};


exports.register = function (pack, options, next) {

    var settings = Hoek.applyToDefaults(internals.defaults, options);
    settings.session = Hoek.applyToDefaults(internals.sessionDefaults, settings.session);
    settings.cookieOptions.encoding = 'iron';

    pack.state(settings.name, settings.cookieOptions);

    pack.ext('onPreHandler', function (request, callback) {

        request.state[settings.name] = request.state[settings.name] || {};
        request.plugins.yar = {};

        if (settings.isSingleUse &&
            !(request.route.plugins.yar && request.route.plugins.yar.retain)) {

            request.clearState(settings.name);
        }

        callback();
    });

    pack.ext('onPostHandler', function (request, callback) {

        if (Object.keys(request.plugins.yar).length) {
            request.setState(settings.name, request.plugins.yar);
        }

        callback();
    });

    if (!settings.session) {
        return next();
    }

    var session = new Session(settings);
    pack.ext('onPreHandler', function () {

        session.load.apply(session, Array.prototype.slice.call(arguments));
    });

    pack.ext('onPostHandler', function () {

        session.save.apply(session, Array.prototype.slice.call(arguments));
    });

    next();
};

