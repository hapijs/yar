'use strict';

const internals = {};


exports = module.exports = internals.Connection = function () {

    this.started = false;

    return this;
};


internals.Connection.prototype.start = function (callback) {

    this.started = true;
    callback();
};


internals.Connection.prototype.stop = function () {

    this.started = false;
};


internals.Connection.prototype.isReady = function () {

    return this.started;
};


internals.Connection.prototype.validateSegmentName = function (name) {

    if (!name) {
        return new Error('Empty string');
    }

    if (name.indexOf('\0') !== -1) {
        return new Error('Includes null character');
    }

    return null;
};


internals.Connection.prototype.insert = function (record, callback) {

    return callback();

};


internals.Connection.prototype.replace = function (record, callback) {

    return callback();

};


internals.Connection.prototype.get = function (key, callback) {

    return callback(null, null);
};


internals.Connection.prototype.set = function (key, value, ttl, callback) {

    return callback();
};


internals.Connection.prototype.drop = function (key, callback) {

    return callback(null);
};

internals.Connection.prototype.generateKey = function (key) {

    return encodeURIComponent(key.segment) + encodeURIComponent(key.id);
};
