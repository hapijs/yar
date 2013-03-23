// Load modules

var Hoek = require('hoek');
var Uuid = require('node-uuid');


// Declare internals

var internals = {};


// Defaults

internals.defaults = {
    name: 'session',
    ttl: 24 * 60 * 60 * 1000,       // One day session
    maxCookieSize: 1024,            // Maximum size allowed in a cookie
    store: null,                    // Catbox compatible policy object to be used instead of hapi's cache
    cookieOptions: {                // hapi server.state() options, except 'encoding' which is always 'iron'. 'password' required.
        path: '/'
    }
};


exports.register = function (pack, options, next) {

    // Validate options and apply defaults
    
    var settings = Hoek.applyToDefaults(internals.defaults, options);
    Hoek.assert(!settings.cookieOptions.encoding, 'Cannot override cookie encoding');
    var rawCookieOptions = Hoek.clone(settings.cookieOptions);
    settings.cookieOptions.encoding = 'iron';
    rawCookieOptions.encoding = 'none';

    // Configure cookie
    
    pack.state(settings.name, settings.cookieOptions);

    // Setup session store
    
    var startTime = Date.now();
    var cache = (settings.store ? settings.store : pack.cache({ expiresIn: settings.ttl }));

    // Pre handler
    
    pack.ext('onPreHandler', function (request, callback) {

        // Load session data from cookie

        request.session = Hoek.clone(request.state[settings.name]);
        if (request.session &&
            request.session.id &&
            request.session._sst === startTime) {         // Check for stale cookie
            
            request.session._isModified = false;
            internals.decorate(request);
            cache.get(request.session.id, function (err, cached) {
                
                if (err) {
                    return callback(err);
                }
                
                if (cached && cached.item) {
                    request.session._store =  cached.item;
                }
                
                return callback();
            });
        }
        
        request.session = {
            id: Uuid.v4(),
            _sst: startTime,
            _store: {},
            _isModified: true
        };

        internals.decorate(request);
        callback();
    });
    
    // Post handler
    
    pack.ext('onPostHandler', function (request, callback) {

        if (!request.session._isModified) {
            return callback();
        }
        
        var cookie = function () {
            
            var content = {
                id: request.session.id,
                _sst: request.session._sst,
                _store: request.session._store
            };
            
            pack.hapi.state.prepareValue(settings.name, content, settings.cookieOptions, function (err, value) {
            
                if (err) {
                    return callback(err);
                }
            
                if (value.length > settings.maxCookieSize) {
                    return storage();
                }
            
                request.setState(settings.name, value, rawCookieOptions);
                return callback();
            });
        };
        
        var storage = function () {
            
            request.setState(settings.name, { id: request.session.id, _sst: request.session._sst });
            cache.set(request.session.id, request.session._store, 0, callback);
        };
        
        if (settings.maxCookieSize) {
            return cookie();
        }
        
        return storage();
    });

    next();
};


internals.decorate = function (request) {
    
    request.session.get = function (key) {
    
        return request.session._store[key];
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
            var messages = request.session._store._flash[type];
            delete request.session._store._flash[type];
            return messages || [];
        }

        request.session._store._flash[type] = (isOverride ? message : (request.session._store._flash[type] || []).concat(message));
        return request.session._store._flash[type];
    };
};
