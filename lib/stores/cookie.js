// Load modules

var Hoek = require('hoek');


// Declare internals
var internals = {};

internals.config = {
    maxLen: 2400
};

var CookieStore = function (options) {

    Hoek.merge(internals.config, options);
};


CookieStore.prototype.validate = function (session) {

    if (!session) {
        return false;
    }
    
    var sessionLength = JSON.stringify(session).length;
    if (sessionLength >= internals.config.maxLen) {
        return false;
    }
    else {
        return true;
    }
};


CookieStore.prototype.get = function (key, session, callback) {

    return callback(null, session);
};

module.exports = CookieStore;