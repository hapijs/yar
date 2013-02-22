// Load modules


// Declare internals

var internals = {};


module.exports = internals.MemoryStore = function (options) {

    this.options = options;
    this._cache = {};

    return this;
};


internals.MemoryStore.prototype.validate = function (session) {

    return true;
};


internals.MemoryStore.prototype.get = function (key, session, callback) {

    if (session) {
        this._cache[key] = session;
    }

    callback(null, this._cache[key]);
};

