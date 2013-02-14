// Load modules

var Hoek = require('hoek');


// Declare internals

var internals = {};

internals.config = {
    name: 'yar',
    isSingleUse: false,             // Cleared after every request, unless modified
    options: {                      // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
        path: '/'
    }
};


exports.register = function (pack, options, next) {

    Hoek.merge(internals.config, options);
    internals.config.options.encoding = 'iron';

    pack.state(internals.config.name, internals.config.options);
    pack.ext('onPreHandler', internals.onPreHandler);
    pack.ext('onPostHandler', internals.onPostHandler);

    next();
};


internals.onPreHandler = function (request, next) {

    request.state.yar = request.state.yar || {};
    request.plugins.yar = {};

    if (internals.config.isSingleUse) {
        request.clearState(internals.config.name);
    }

    next();
};


internals.onPostHandler = function (request, next) {

    if (Object.keys(request.plugins.yar).length) {
        request.setState(internals.config.name, request.plugins.yar);
    }

    next();
};

