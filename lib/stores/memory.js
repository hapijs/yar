// Load modules

var Hoek = require('hoek');


// Declare internals
var internals = {};

internals.config = {
    
};

var MemoryStore = function (options) {

    Hoek.merge(internals.config, options);
    this._cache = {};
    
    return this;
};


MemoryStore.prototype.validate = function (session) {

    return true;
};


MemoryStore.prototype.get = function (key, session, callback) {

    if (session) {
        this._cache[key] = session;
    }
    
    callback(null, this._cache[key]);
};

module.exports = MemoryStore;