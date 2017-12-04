'use strict';

const internals = {};


exports = module.exports = internals.Connection = function () {

    this.started = false;

    return this;
};


internals.Connection.prototype.start = () => {

    this.started = true;
    return;
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

    return;
};


internals.Connection.prototype.replace = (record) => {

    return;
};


internals.Connection.prototype.get = (key) => {

    return null;
};


internals.Connection.prototype.set = (key, value, ttl) => {

    return undefined;
};


internals.Connection.prototype.drop = (key) => {

    return null;
};

internals.Connection.prototype.generateKey = function (key) {

    return encodeURIComponent(key.segment) + encodeURIComponent(key.id);
};
