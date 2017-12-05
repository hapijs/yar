'use strict';

const Hoek = require('hoek');
const Statehood = require('statehood');
const Uuid = require('uuid');

// Defaults

const DEFAULT_OPTIONS = {
    cache: {
        expiresIn: 24 * 60 * 60 * 1000          // One day session
    },
    cookieOptions: {                            // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' is required.
        clearInvalid: true,
        ignoreErrors: true,
        isSameSite: 'Lax',                      // Use same-site cookie security, but in a loose way
        isSecure: true,
        path: '/'
    },
    errorOnCacheNotReady: true,
    maxCookieSize: 1024,                        // Maximum size allowed in a cookie
    name: 'session',                            // Cookie name
    storeBlank: true                           // Initially _isModified
};

const registerPlugin = (server, options) => {

    // Validate options and apply defaults

    const settings = Hoek.applyToDefaults(DEFAULT_OPTIONS, options);
    Hoek.assert(!settings.cookieOptions.encoding, 'Cannot override cookie encoding');

    const rawCookieOptions = Hoek.clone(settings.cookieOptions);
    settings.cookieOptions.encoding = 'iron';
    rawCookieOptions.encoding = 'none';

    if (settings.customSessionIDGenerator) {
        Hoek.assert(typeof settings.customSessionIDGenerator === 'function', 'customSessionIDGenerator should be a function');
    }

    // Configure cookie

    server.state(settings.name, settings.cookieOptions);

    // Decorate the server with yar object.

    const getState = () => {

        return {};
    };

    server.decorate('request', 'yar', getState, {
        apply: true
    });

    // Setup session store

    const cache = server.cache(settings.cache);

    // Pre auth
    server.ext({
        type: 'onPreAuth',
        method: (request, h) => {

            // If this route configuration indicates to skip, do nothing.
            if (Hoek.reach(request, 'route.settings.plugins.yar.skip')) {
                return h.continue;
            }

            return new Promise((resolve, reject) => {

                const generateSessionID = () => {

                    const id = settings.customSessionIDGenerator ? settings.customSessionIDGenerator(request) : Uuid.v4();

                    Hoek.assert(typeof id === 'string', 'Session ID should be a string');

                    return id;
                };

                // Load session data from cookie

                const load = async () => {

                    request.yar = Object.assign(request.yar, request.state[settings.name]);

                    if (request.yar.id) {

                        request.yar._isModified = false;
                        if (!settings.errorOnCacheNotReady && !cache.isReady() && !request.yar._store) {
                            request.log('Cache is not ready: not loading sessions from cache');
                            request.yar._store = {};
                        }
                        if (request.yar._store) {
                            return decorate();
                        }

                        request.yar._store = {};

                        try {
                            const cached = await cache.get(request.yar.id);

                            if (cached) {
                                request.yar._store = cached;
                            }

                            return decorate();
                        }
                        catch (err) {
                            return decorate(err);
                        }
                    }

                    try {
                        request.yar.id = generateSessionID();
                    }
                    catch (err) {
                        return reject(err);
                    }

                    request.yar._store = {};
                    request.yar._isModified = settings.storeBlank;

                    decorate();
                };

                const decorate = (err) => {

                    if (request.yar._store._lazyKeys) {
                        request.yar._isLazy = true;                 // Default to lazy mode if previously set
                        request.yar._store._lazyKeys.forEach((key) => {

                            request.yar[key] = request.yar._store[key];
                            delete request.yar._store[key];
                        });
                    }

                    request.yar.reset = () => {

                        cache.drop(request.yar.id);

                        request.yar.id = generateSessionID();
                        request.yar._store = {};
                        request.yar._isModified = true;
                    };

                    request.yar.get = (key, clear) => {

                        const value = request.yar._store[key];

                        if (clear) {
                            request.yar.clear(key);
                        }

                        return value || null;
                    };

                    request.yar.set = (key, value) => {

                        Hoek.assert(key, 'Missing key');
                        Hoek.assert(typeof key === 'string' || (typeof key === 'object' && value === undefined), 'Invalid yar.set() arguments');

                        request.yar._isModified = true;

                        if (typeof key === 'string') {
                            // convert key of type string into an object, for consistency.
                            const holder = {};
                            holder[key] = value;
                            key = holder;
                        }

                        Object.keys(key).forEach((name) => {

                            request.yar._store[name] = key[name];
                        });

                        return value !== undefined ? value : key;
                    };

                    request.yar.clear = (key) => {

                        request.yar._isModified = true;
                        delete request.yar._store[key];
                    };

                    request.yar.touch = () => {

                        request.yar._isModified = true;
                    };

                    request.yar.flash = (type, message, isOverride) => {

                        let messages;
                        request.yar._isModified = true;
                        request.yar._store._flash = request.yar._store._flash || {};

                        if (!type && !message) {
                            messages = request.yar._store._flash;
                            request.yar._store._flash = {};
                            return messages;
                        }

                        if (!message) {
                            messages = request.yar._store._flash[type];
                            delete request.yar._store._flash[type];
                            return messages || [];
                        }

                        request.yar._store._flash[type] = (isOverride ? message : (request.yar._store._flash[type] || []).concat(message));
                        return request.yar._store._flash[type];
                    };

                    request.yar.lazy = (enabled) => {

                        request.yar._isLazy = enabled;
                    };

                    if (err) {
                        return reject(err);
                    }

                    return resolve();
                };

                return load();
            })
                .then(() => h.continue);
        }
    });

    // Post handler

    server.ext({
        type: 'onPreResponse',
        method: (request, h) => {

            if (!request.yar._isModified && !request.yar._isLazy) {
                return h.continue;
            }

            return new Promise((resolve, reject) => {

                const prepare = () => {

                    if (request.yar._isLazy) {
                        const lazyKeys = [];
                        const keys = Object.keys(request.yar);
                        for (let i = 0; i < keys.length; ++i) {
                            const key = keys[i];
                            if (['id', '_store', '_isModified', '_isLazy', 'reset', 'get', 'set', 'clear', 'touch', 'flash', 'lazy'].indexOf(key) === -1 &&
                                key[0] !== '_' &&
                                typeof request.yar.key !== 'function') {

                                lazyKeys.push(key);
                                request.yar._store[key] = request.yar[key];
                            }
                        }

                        if (lazyKeys.length) {
                            request.yar._store._lazyKeys = lazyKeys;
                        }
                    }

                    if (settings.maxCookieSize) {
                        return cookie();
                    }

                    return storage();
                };

                const cookie = async () => {

                    const content = {
                        id: request.yar.id,
                        _store: request.yar._store
                    };

                    try {
                        const value = await Statehood.prepareValue(settings.name, content, settings.cookieOptions);

                        if (value.length > settings.maxCookieSize) {
                            return storage();
                        }

                        h.state(settings.name, value, rawCookieOptions);

                        return resolve();

                    }
                    catch (err) {

                        reject(err);

                    }
                };

                const storage = async () => {

                    if (!settings.errorOnCacheNotReady && !cache.isReady()) {
                        request.log('Cache is not ready: not storing sessions to cache');
                        return resolve();
                    }

                    h.state(settings.name, { id: request.yar.id });

                    try {

                        await cache.set(request.yar.id, request.yar._store, 0);

                    }
                    catch (err) {
                        return reject(err);

                    }

                    resolve();
                };

                prepare();
            })
                .then(() => h.continue);
        }
    });
};

module.exports = {
    pkg: require('../package.json'),
    register: registerPlugin
};
