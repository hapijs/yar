// Load modules


// Declare internals

var internals = {};


module.exports = internals.CookieStore = function (options) {

    this.options = options;

    return this;
};


internals.CookieStore.prototype.validate = function (session) {

    if (!session || (Object.keys(session).length > 0)) {
        return false;
    }

    var sessionLength = JSON.stringify(session).length;
    return (sessionLength < this.options.maxLen);
};


internals.CookieStore.prototype.get = function (key, session, callback) {

    return callback(null, session);
};

