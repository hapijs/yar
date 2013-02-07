// Load modules

var Hoek = require('hoek');
var Config = require('./config');


// Declare internals

var internals = {};


exports.register = function (pack, options, next) {

    Config.init(pack.config, options);

    pack.state(Config.name, Config.options);
    pack.ext('onPreHandler', internals.onPreHandler);
    pack.ext('onPostHandler', internals.onPostHandler);

    next();
};


internals.onPreHandler = function (request, next) {

    request.api.jar = {};

    if (Config.isSingleUse) {
        request.clearState(Config.name);
    }

    next();
};


internals.onPostHandler = function (request, next) {

    if (Object.keys(request.api.jar).length) {
        request.setState(Config.name, request.api.jar);
    }

    next();
};

