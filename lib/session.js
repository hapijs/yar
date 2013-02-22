// Load modules

var Hoek = require('hoek');
var UUID = require('node-uuid');
var CookieStore = require('./stores/cookie');
var MemoryStore = require('./stores/memory');


// Declare internals

var internals = {};

internals.config = {
    key: 'session'
};

var Session = function (options) {

    Hoek.merge(internals.config, options);
    this.options = internals.config;
    
    if (this.options.store) {
        this.extStore = this.options.store;
    }
    
    this.cookieStore = new CookieStore(this.options);
    this.memoryStore = new MemoryStore(this.options);
    
    return this;
};

Session.prototype.save = function (request, callback) {

    var self = this;
    var session = request[this.options.key];
    
    // Try External Store
    
    if (this.extStore && this.extStore.validate(session)) {
        var sid = this.generateSID(session);
        session[self.options.sidKey] = sid;
        
        return this.extStore.get(sid, session, function (err) {

            request.setState(self.options.name, session);
            callback(err);
        });
    }
    
    // No External Store, try Cookie
    
    if (this.cookieStore && this.cookieStore.validate(session)) {
        return this.cookieStore.get(null, session, function (err) {

            request.setState(self.options.name, session);
            callback(err);
        });
    }
    
    // Fallback to Memory Store
    
    var sid = this.generateSID(session);
    this.memoryStore.get(sid, session, function (err) {

        request.setState(internals.config.name, session);
        callback(err);
    });
};


Session.prototype.attach = function (request, callback) {

    return function (err, session, req) {

        request[this.key] = session;
        callback();
    };
};


Session.prototype.load = function (request, callback) {

    var self = this;
    
    // Get initial state from cookie
    
    request.state[this.options.name] = request.state[this.options.name] || {};
    request[this.options.key] = request.state[this.options.name];
    var sid = request[this.options.key][this.options.sidKey];
    
    if (!request[this.options.key].hasOwnProperty(self.options.sidKey)) {
        // CookieStore detected, no need to modify session
        return callback();
    }
    else {
        if (this.extStore) {
            return this.extStore.get(sid, this.attach(request, callback));
        }
        
        return this.memoryStore.get(sid, this.attach(request, callback));
    }
};


Session.prototype.generateSID = function (session) {

    session = session || {};
    return session[this.options.sidKey] || UUID.v4();
};

module.exports = Session;