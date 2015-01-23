// Load modules

var Hoek = require('hoek');
var Statehood = require('statehood');
var Uuid = require('node-uuid');


// Declare internals

var internals = {};


// Defaults

internals.defaults = {
    name: 'session',                            // Cookie name
    maxCookieSize: 1024,                        // Maximum size allowed in a cookie
    cache: {
        expiresIn: 24 * 60 * 60 * 1000          // One day session
    },
    cookieOptions: {                            // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
        path: '/',
        isSecure: true
    },
    skip: false
};


exports.register = function (server, options, next) {

    // Validate options and apply defaults

    var settings = Hoek.applyToDefaults(internals.defaults, options);
    Hoek.assert(!settings.cookieOptions.encoding, 'Cannot override cookie encoding');
    var rawCookieOptions = Hoek.clone(settings.cookieOptions);
    settings.cookieOptions.encoding = 'iron';
    rawCookieOptions.encoding = 'none';

    // Configure cookie

    server.state(settings.name, settings.cookieOptions);

    // Setup session store

    var startTime = Date.now();
    var cache = server.cache(settings.cache);

    // Pre auth

    server.ext('onPreAuth', function (request, reply) {

        // If skip function enabled. Call it and if returns true, do not attempt to do anything with yar.

        if (settings.skip && typeof settings.skip === 'function' && settings.skip(request, reply)) {
            return reply.continue();
        }

        // Load session data from cookie

        var load = function () {

            request.session = Hoek.clone(request.state[settings.name]);
            if (request.session &&
                request.session.id) {

                request.session._isModified = false;
                if (request.session._store) {
                    return decorate();
                }

                request.session._store = {};
                return cache.get(request.session.id, function (err, value, cached) {

                    if (err) {
                        return decorate(err);
                    }

                    if (cached && cached.item) {
                        request.session._store = cached.item;
                    }

                    return decorate();
                });
            }

            request.session = {
                id: Uuid.v4(),
                _store: {},
                _isModified: true
            };

            decorate();
        };

        var decorate = function (err) {

            if (request.session._store._lazyKeys) {
                request.session._isLazy = true;                 // Default to lazy mode if previously set
                request.session._store._lazyKeys.forEach(function (key) {

                    request.session[key] = request.session._store[key];
                    delete request.session._store[key];
                });
            }

            request.session.reset = function () {

                cache.drop(request.session.id, function (err) { });
                request.session.id = Uuid.v4();
                request.session._store = {};
                request.session._isModified = true;
            };

            request.session.get = function (key, clear) {

                var value = request.session._store[key];
                if (clear) {
                    request.session.clear(key);
                }

                return value;
            };

            request.session.set = function (key, value) {

                Hoek.assert(key, 'Missing key');
                Hoek.assert(typeof key === 'string' || (typeof key === 'object' && value === undefined), 'Invalid session.set() arguments');

                request.session._isModified = true;

                if (typeof key === 'string') {
                    var holder = {};
                    holder[key] = value;
                    key = holder;
                }

                Object.keys(key).forEach(function (name) {

                    request.session._store[name] = key[name];
                });
            };

            request.session.clear = function (key) {

                request.session._isModified = true;
                delete request.session._store[key];
            };

            request.session.touch = function () {

                request.session._isModified = true;
            };

            request.session.flash = function (type, message, isOverride) {

                request.session._isModified = true;
                request.session._store._flash = request.session._store._flash || {};

                if (!type && !message) {
                    var messages = request.session._store._flash;
                    request.session._store._flash = {};
                    return messages;
                }

                if (!message) {
                    messages = request.session._store._flash[type];
                    delete request.session._store._flash[type];
                    return messages || [];
                }

                request.session._store._flash[type] = (isOverride ? message : (request.session._store._flash[type] || []).concat(message));
                return request.session._store._flash[type];
            };

            request.session.lazy = function (enabled) {

                request.session._isLazy = enabled;
            };

            if (err) {
                return reply(err);
            }

            return reply.continue();
        };

        load();
    });

    // Post handler

    server.ext('onPreResponse', function (request, reply) {

        if (!request.session ||
            (!request.session._isModified && !request.session._isLazy)) {

            return reply.continue();
        }

        var prepare = function () {

            if (request.session._isLazy) {
                var lazyKeys = [];
                var keys = Object.keys(request.session);
                for (var i = 0, il = keys.length; i < il; ++i) {
                    var key = keys[i];
                    if (['id', '_store', '_isModified', '_isLazy', 'reset', 'get', 'set', 'clear', 'touch', 'flash', 'lazy'].indexOf(key) === -1 &&
                        key[0] !== '_' &&
                        typeof request.session.key !== 'function') {

                        lazyKeys.push(key);
                        request.session._store[key] = request.session[key];
                    }
                }

                if (lazyKeys.length) {
                    request.session._store._lazyKeys = lazyKeys;
                }
            }

            if (settings.maxCookieSize) {
                return cookie();
            }

            return storage();
        };

        var cookie = function () {

            var content = {
                id: request.session.id,
                _store: request.session._store
            };

            Statehood.prepareValue(settings.name, content, settings.cookieOptions, function (err, value) {

                if (err) {
                    return reply(err);
                }

                if (value.length > settings.maxCookieSize) {
                    return storage();
                }

                reply.state(settings.name, value, rawCookieOptions);
                return reply.continue();
            });
        };

        var storage = function () {

            reply.state(settings.name, { id: request.session.id });
            cache.set(request.session.id, request.session._store, 0, function (err) {

                if (err) {
                    return reply(err);
                }

                return reply.continue();
            });
        };

        prepare();
    });

    return next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};
