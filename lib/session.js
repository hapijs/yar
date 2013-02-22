// Load modules

var Hoek = require('hoek');
var UUID = require('node-uuid');
var CookieStore = require('./stores/cookie');
var MemoryStore = require('./stores/memory');


// Declare internals

var internals = {};


module.exports = internals.Session = function (options) {

    this.options = options;

    Hoek.assert(this.options.session && this.options.session.key, "No session.key defined (the x in request[x])");
    Hoek.assert(typeof this.options.session.key == 'string', "Invalid session.key defined");

    if (this.options.store) {
        this.extStore = this.options.store;
    }

    this.cookieStore = new CookieStore(this.options);
    this.memoryStore = new MemoryStore(this.options);

    return this;
};


internals.Session.prototype.save = function (request, callback) {

    var self = this;
    var session = request[this.options.session.key];

    // Try External Store

    if (this.extStore &&
        this.extStore.validate(session)) {

        var sid = this.generateSID(session);
        session[this.options.sidKey] = sid;

        return this.extStore.get(sid, session, function (err) {

            request.setState(self.options.name, session);
            callback(err);
        });
    }

    // No External Store, try Cookie

    if (this.cookieStore &&
        this.cookieStore.validate(session)) {

        return this.cookieStore.get(null, session, function (err) {

            request.setState(self.options.name, session);
            callback(err);
        });
    }

    // Fallback to Memory Store

    var sid = this.generateSID(session);
    this.memoryStore.get(sid, session, function (err) {

        request.setState(self.options.name, session);
        callback(err);
    });
};


internals.Session.prototype.attach = function (request, callback) {

    var self = this;

    return function (err, session, req) {

        request[self.options.session.key] = session;
        callback();
    };
};


internals.Session.prototype.load = function (request, callback) {

    var self = this;

    // Get initial state from cookie

    request[this.options.session.key] = request.state[this.options.name] || {};
    var sid = request[this.options.session.key][this.options.sidKey];

    if (!request[this.options.session.key].hasOwnProperty(self.options.sidKey)) {
        // CookieStore detected, no need to modify session
        return callback();
    }

    if (this.extStore) {
        return this.extStore.get(sid, this.attach(request, callback));
    }

    return this.memoryStore.get(sid, this.attach(request, callback));
};


internals.Session.prototype.generateSID = function (session) {

    session = session || {};
    return session[this.options.sidKey] || UUID.v4();
};

