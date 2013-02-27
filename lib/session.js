// Load modules

var Hoek = require('hoek');
var UUID = require('node-uuid');
var CookieStore = require('./stores/cookie');
var MemoryStore = require('./stores/memory');


// Declare internals

var internals = {};


module.exports = internals.Session = function (options) {

    this.settings = options;

    Hoek.assert(this.settings.session && this.settings.session.key, 'No session.key defined (the x in request[x])');
    Hoek.assert(typeof this.settings.session.key === 'string', 'Invalid session.key defined');

    if (this.settings.session.store) {
        this.extStore = new this.settings.session.store();
    }

    this.cookieStore = new CookieStore(this.settings.session);
    this.memoryStore = new MemoryStore(this.settings.session);

    return this;
};


internals.Session.prototype.save = function (request, callback) {

    var self = this;

    var session = request[this.settings.session.key];

    // Try External Store

    if (this.extStore &&
        this.extStore.validate(session)) {

        var sid = this.generateSID(session);
        session[this.settings.session.sidKey] = sid;

        return this.extStore.get(sid, session, function (err) {

            request.setState(self.settings.name, self.wrap(session));
            process.nextTick(function () {

                callback(err);
            });
        });
    }

    // No External Store, try Cookie

    if (this.cookieStore &&
        this.cookieStore.validate(session)) {

        return this.cookieStore.get(null, session, function (err) {

            request.setState(self.settings.name, self.wrap(session));
            process.nextTick(function () {

                callback(err);
            });
        });
    }

    // Fallback to Memory Store

    var sid = this.generateSID(session);
    session[this.settings.session.sidKey] = sid;
    return this.memoryStore.get(sid, session, function (err) {

        request.setState(self.settings.name, self.wrap(session));
        process.nextTick(function () {

            callback(err);
        });
    });
};


internals.Session.prototype.wrap = function (session) {

    var state = {};
    state[this.settings.session.key] = session;
    return state;
};


internals.Session.prototype.attach = function (request, callback) {

    var self = this;

    return function (err, session, req) {

        request[self.settings.session.key] = session;
        callback();
    };
};


internals.Session.prototype.load = function (request, callback) {

    var self = this;

    // Get initial state from cookie

    request[this.settings.session.key] = request.state[this.settings.name][this.settings.session.key] || {};
    var sid = request[this.settings.session.key][this.settings.session.sidKey];

    if (!request[this.settings.session.key].hasOwnProperty(self.settings.session.sidKey)) {
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
    return session[this.settings.session.sidKey] || UUID.v4();
};

