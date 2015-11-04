'use strict';

const Hoek = require('hoek');
const Statehood = require('statehood');
const Uuid = require('node-uuid');


// Declare internals

const internals = {};


// Defaults

internals.defaults = {
    name: 'session',                            // Cookie name
    maxCookieSize: 1024,                        // Maximum size allowed in a cookie
    storeBlank: true,                           // Initially _isModified
    errorOnCacheNotReady: true,
    cache: {
        expiresIn: 24 * 60 * 60 * 1000          // One day session
    },
    cookieOptions: {                            // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
        path: '/',
        isSecure: true,
        ignoreErrors: true,
        clearInvalid: true
    }
};


exports.register = (server, options, next) => {

    // Validate options and apply defaults

    const settings = Hoek.applyToDefaults(internals.defaults, options);
    Hoek.assert(!settings.cookieOptions.encoding, 'Cannot override cookie encoding');
    const rawCookieOptions = Hoek.clone(settings.cookieOptions);
    settings.cookieOptions.encoding = 'iron';
    rawCookieOptions.encoding = 'none';

    // Configure cookie

    server.state(settings.name, settings.cookieOptions);

    // Setup session store
    const cache = server.cache(settings.cache);

    // Pre auth

    server.ext('onPreAuth', (request, reply) => {

        // Load session data from cookie

        const load = () => {

            request.session = Hoek.clone(request.state[settings.name]);
            if (request.session &&
                request.session.id) {

                request.session._isModified = false;
                if (!settings.errorOnCacheNotReady && !cache.isReady() && !request.session._store) {
                    request.log('Cache is not ready: not loading sessions from cache');
                    request.session._store = {};
                }
                if (request.session._store) {
                    return decorate();
                }

                request.session._store = {};
                return cache.get(request.session.id, (err, value, cached) => {

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
                _isModified: settings.storeBlank
            };

            decorate();
        };

        const decorate = (err) => {

            if (request.session._store._lazyKeys) {
                request.session._isLazy = true;                 // Default to lazy mode if previously set
                request.session._store._lazyKeys.forEach((key) => {

                    request.session[key] = request.session._store[key];
                    delete request.session._store[key];
                });
            }

            request.session.reset = () => {

                cache.drop(request.session.id, () => {});
                request.session.id = Uuid.v4();
                request.session._store = {};
                request.session._isModified = true;
            };

            request.session.get = (key, clear) => {

                const value = request.session._store[key];
                if (clear) {
                    request.session.clear(key);
                }

                return value;
            };

            request.session.set = (key, value) => {

                Hoek.assert(key, 'Missing key');
                Hoek.assert(typeof key === 'string' || (typeof key === 'object' && value === undefined), 'Invalid session.set() arguments');

                request.session._isModified = true;

                if (typeof key === 'string') {
                    // convert key of type string into an object, for consistency.
                    const holder = {};
                    holder[key] = value;
                    key = holder;
                }

                Object.keys(key).forEach((name) => {

                    request.session._store[name] = key[name];
                });

                return value !== undefined ? value : key;
            };

            request.session.clear = (key) => {

                request.session._isModified = true;
                delete request.session._store[key];
            };

            request.session.touch = () => {

                request.session._isModified = true;
            };

            request.session.flash = (type, message, isOverride) => {

                let messages;
                request.session._isModified = true;
                request.session._store._flash = request.session._store._flash || {};

                if (!type && !message) {
                    messages = request.session._store._flash;
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

            request.session.lazy = (enabled) => {

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

    server.ext('onPreResponse', (request, reply) => {

        if (!request.session ||
            (!request.session._isModified && !request.session._isLazy)) {

            return reply.continue();
        }

        const prepare = () => {

            if (request.session._isLazy) {
                const lazyKeys = [];
                const keys = Object.keys(request.session);
                for (let i = 0, key; i < keys.length; ++i) {
                    key = keys[i];
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

        const cookie = function () {

            const content = {
                id: request.session.id,
                _store: request.session._store
            };

            Statehood.prepareValue(settings.name, content, settings.cookieOptions, (err, value) => {

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

        const storage = () => {

            if (!settings.errorOnCacheNotReady && !cache.isReady()) {
                request.log('Cache is not ready: not storing sessions to cache');
                return reply.continue();
            }

            reply.state(settings.name, { id: request.session.id });
            cache.set(request.session.id, request.session._store, 0, (err) => {

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
