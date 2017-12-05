'use strict';

const internals = {};


exports = module.exports = internals.Connection = function () {

    this.started = false;

    return this;
};


internals.Connection.prototype.start = function () {

    this.started = true;
    return true;
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


internals.Connection.prototype.insert = (record) => {

    return true;
};


internals.Connection.prototype.replace = (record) => {

    return true;
};


internals.Connection.prototype.get = (key) => {

    return null;
};


internals.Connection.prototype.set = (key, value, ttl) => {

    return true;
};


internals.Connection.prototype.drop = (key) => {

    return null;
};

internals.Connection.prototype.generateKey = function (key) {

    return encodeURIComponent(key.segment) + encodeURIComponent(key.id);
};
