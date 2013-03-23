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
    var store = (settings.store ? settings.store : pack.cache({ expiresIn: settings.ttl }));

    // Pre handler
    
    pack.ext('onPreHandler', function (request, callback) {

        // Decorate request
        
/*        request.flash = function (type, message) {

            request.session.flash = request.session.flash || {};
        
            if (!type && !message){
                var messages = request.session.flash || {};
                request.session.flash = {};
                return messages;
            }
        
            if (!message) {
                var results = request.session.flash[type] || [];
                delete request.session.flash[type];
                return results;
            }
        
            return request.session.flash[type] = (request.session.flash[type] || []).concat(message);
        };
*/
        // Load session data from cookie

        request.session = Hoek.clone(request.state[settings.name]);
        if (request.session &&
            request.session.id &&
            request.session.sst === startTime) {         // Check for stale cookie
            
            store.get(request.session.id, function (err, cached) {
                
                if (err) {
                    return callback(err);
                }
                
                Object.keys(cached.item).forEach(function (key) {
                   
                    if (key !== 'id' && key !== 'sst') {
                        request.session[key] = cached.item[key]; 
                    }
                });
                
                return callback();
            });
        }
        
        request.session = {
            id: Uuid.v4(),
            sst: startTime
        };

        store.set(request.session.id, {}, 0, callback);
    });
    
    // Post handler
    
    pack.ext('onPostHandler', function (request, callback) {

        var cookie = function () {
            
            pack.hapi.state.prepareValue(settings.name, request.session, settings.cookieOptions, function (err, value) {
            
                if (err) {
                    return callback(err);
                }
            
                if (value.length < settings.maxCookieSize) {
                
                    request.setState(settings.name, value, rawCookieOptions);
                    return callback();
                }

                return storage();
            });
        };
        
        var storage = function () {
            
            request.setState(settings.name, { id: request.session.id, sst: request.session.sst });
            store.set(request.session.id, request.session, 0, callback);
        };
        
        if (settings.maxCookieSize) {
            return cookie();
        }
        
        return storage();
    });

    next();
};
