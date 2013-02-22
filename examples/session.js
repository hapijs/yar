var Hapi = require('hapi');


var server = new Hapi.Server(process.env.PORT || 8000);

var options = {
    // name: 'yar' ,               // Optional, overrides cookie name. Defaults to 'yar'. Doesn't affect 'plugins.yar'.
    // isSingleUse: false,         // Optional, clears jar after one request. Defaults to false.
    cookieOptions: {
        password: 'password',   // Required
        isSecure: true          // Optional, any supported cookie options except `encoding`
    },
    session: true
};

server.plugin().allow({ ext: true }).require('../', options, function (err) {

    if (err) {
        throw err;
    }
});

server.route({
    method: 'GET',
    path: '/',
    config: {
        handler: function (request) {

            request.reply(request.session)
        }
    }
});

server.route({
    method: 'GET',
    path: '/set1',
    config: {
        handler: function (request) {

            request.session.test = 1;
            request.reply.redirect('/').send();
        }
    }
});

server.route({
    method: 'GET',
    path: '/set2',
    config: {
        handler: function (request) {

            request.session = {};
            request.reply.redirect('/').send();
        }
    }
});

server.start(function () {

    console.log('server started on port: ', server.settings.port);
})