'use strict';

// Load modules

const Hoek = require('hoek');
const Statehood = require('statehood');
const Uuid = require('uuid/v4');


// Declare internals

const internals = {
    defaults: {
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
        storeBlank: true                            // Initial _isModified value
    }
};


module.exports = {
    pkg: require('../package.json'),
    register: function (server, options) {

        // Validate options and apply defaults

        const settings = Hoek.applyToDefaults(internals.defaults, options);
        Hoek.assert(!settings.cookieOptions.encoding, 'Cannot override cookie encoding');

        settings.rawCookieOptions = Hoek.clone(settings.cookieOptions);
        settings.rawCookieOptions.encoding = 'none';

        settings.cookieOptions.encoding = 'iron';

        if (settings.customSessionIDGenerator) {
            Hoek.assert(typeof settings.customSessionIDGenerator === 'function', 'customSessionIDGenerator should be a function');
        }

        // Setup session store

        const cache = server.cache(settings.cache);

        // Configure cookie

        server.state(settings.name, settings.cookieOptions);

        // Decorate requests with yar interface

        server.decorate('request', 'yar', internals.decorate(settings, cache), { apply: true });

        // Decorate server with yar interface

        server.decorate('server', 'yar', internals.server(cache));

        // Setup lifecycle

        server.ext('onPreAuth', internals.onPreAuth);
        server.ext('onPreResponse', internals.onPreResponse);
    }
};


internals.decorate = function (settings, cache) {

    return function (request) {

        return new internals.Yar(request, settings, cache);
    };
};


internals.server = function (cache) {

    return {
        revoke: (id) => cache.drop(id)
    };
};


internals.Yar = class {

    constructor(request, settings, cache) {

        this._request = request;
        this._settings = settings;
        this._cache = cache;

        this.id = null;
        this._store = null;
        this._isModified = false;
        this._isLazy = false;
    }

    async _initialize() {

        // If this route configuration indicates to skip, do nothing.

        if (this._request.route.settings.plugins.yar &&
            this._request.route.settings.plugins.yar.skip) {

            return;
        }

        // First time

        const state = this._request.state[this._settings.name];
        if (!state ||
            !state.id) {        // Ensures cookie is not an array or invalid

            this.id = this._generateSessionID();
            this._store = {};
            this._isModified = this._settings.storeBlank;
            return;
        }

        // Repeat visit

        this.id = state.id;
        this._store = state._store;
        this._isModified = false;

        if (!this._store) {
            this._store = {};

            if (!this._cache.isReady() &&
                !this._settings.errorOnCacheNotReady) {

                this._request.log('Cache is not ready: not loading sessions from cache');
                return;
            }

            const cached = await this._cache.get(this.id);
            if (cached) {
                this._store = cached;
            }
        }

        if (this._store._lazyKeys) {
            this._isLazy = true;                         // Default to lazy mode if previously set
            for (const key of this._store._lazyKeys) {
                this[key] = this._store[key];
                delete this._store[key];
            }
        }
    }

    _generateSessionID() {

        const id = this._settings.customSessionIDGenerator ? this._settings.customSessionIDGenerator(this._request) : Uuid();
        Hoek.assert(typeof id === 'string', 'Session ID should be a string');
        return id;
    }

    reset() {

        this._cache.drop(this.id);

        this.id = this._generateSessionID();
        this._store = {};
        this._isModified = true;
    }

    get(key, clear) {

        const value = this._store[key];

        if (clear) {
            this.clear(key);
        }

        return value === undefined ? null : value;
    }

    set(key, value) {

        Hoek.assert(key, 'Missing key');
        Hoek.assert(typeof key === 'string' || (typeof key === 'object' && value === undefined), 'Invalid yar.set() arguments');

        this._isModified = true;

        if (typeof key === 'string') {      // Convert key of type string into an object for consistency
            const holder = {};
            holder[key] = value;
            key = holder;
        }

        for (const name in key) {
            this._store[name] = key[name];
        }

        return value !== undefined ? value : key;
    }

    clear(key) {

        this._isModified = true;
        delete this._store[key];
    }

    touch() {

        this._isModified = true;
    }

    flash(type, message, isOverride) {

        let messages;
        this._isModified = true;
        this._store._flash = this._store._flash || {};

        if (!type && !message) {
            messages = this._store._flash;
            this._store._flash = {};
            return messages;
        }

        if (!message) {
            messages = this._store._flash[type];
            delete this._store._flash[type];
            return messages || [];
        }

        this._store._flash[type] = (isOverride ? message : (this._store._flash[type] || []).concat(message));
        return this._store._flash[type];
    }

    lazy(enabled) {

        this._isLazy = enabled;
    }
};


internals.onPreAuth = async function (request, h) {

    await request.yar._initialize();
    return h.continue;
};


internals.onPreResponse = async function (request, h) {

    if (!request.yar._isModified &&
        !request.yar._isLazy) {

        return h.continue;
    }

    if (request.yar._isLazy) {
        const lazyKeys = [];
        for (const key in request.yar) {
            if (key !== 'id' &&
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

    // Store session data in cookie

    const settings = request.yar._settings;
    if (settings.maxCookieSize) {
        const content = {
            id: request.yar.id,
            _store: request.yar._store
        };

        const value = await Statehood.prepareValue(settings.name, content, settings.cookieOptions);
        if (value.length <= settings.maxCookieSize) {
            h.state(settings.name, value, settings.rawCookieOptions);
            return h.continue;
        }
    }

    // Store session data in cache

    const cache = request.yar._cache;
    if (!settings.errorOnCacheNotReady &&
        !cache.isReady()) {

        request.log('Cache is not ready: not storing sessions to cache');
        return h.continue;
    }

    h.state(settings.name, { id: request.yar.id });
    await cache.set(request.yar.id, request.yar._store, 0);
    return h.continue;
};
