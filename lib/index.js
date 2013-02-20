// Load modules

var Hoek = require('hoek');


// Declare internals

var internals = {};

internals.defaults = {
    name: 'yar',
    isSingleUse: false,             // Cleared after every request, unless modified. Override via route.config.plugins.yar.retain set to true
    cookieOptions: {                // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
        path: '/'
    }
};


exports.register = function (pack, options, next) {

    var settings = Hoek.applyToDefaults(internals.defaults, options);
    settings.cookieOptions.encoding = 'iron';

    pack.state(settings.name, settings.cookieOptions);

    pack.ext('onPreHandler', function (request, next) {

        request.state.yar = request.state.yar || {};
        request.plugins.yar = {};

        if (settings.isSingleUse &&
            !(request.route.plugins.yar && request.route.plugins.yar.retain)) {

            request.clearState(settings.name);
        }

        next();
    });

    pack.ext('onPostHandler', function (request, next) {

        if (Object.keys(request.plugins.yar).length) {
            request.setState(settings.name, request.plugins.yar);
        }

        next();
    });

    next();
};

