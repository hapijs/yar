// Load modules

var Hoek = require('hoek');


// Declare internals

var internals = {};


// Defaults

module.exports = {
    name: 'jar',
    isSingleUse: false,             // Cleared after every request, unless modified
    options: {}                     // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
};


module.exports.init = function (config, options) {

    Hoek.merge(module.exports, options);
    module.exports.options.encoding = 'iron';
};

