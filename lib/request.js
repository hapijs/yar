var RequestMethods = {};

RequestMethods.flash = function (request) {

    return function (type, message) {

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
};


module.exports = exports = RequestMethods;