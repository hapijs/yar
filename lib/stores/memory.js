// Load modules


// Declare internals

var internals = {};


module.exports = internals.MemoryStore = function (options) {

    this.options = options;
    this._cache = {};

    return this;
};


internals.MemoryStore.prototype.get = function (key, session, callback) {

    if (typeof session == 'function') {
        callback = session;
        session = null;
    }

    if (session) {
        this._cache[key] = session;
    }

    callback(null, this._cache[key]);
};


internals.MemoryStore.prototype.delete = function (key, session, callback) {

    if (typeof session == 'function') {
        callback = session;
        session = null;
    }
    
    delete this._cache[key];
    
    callback();
};

