var Hapi = require('hapi');

var options = {
    permissions: {
        ext: true                   // Required
    },
    plugin: {
        // name: 'yar' ,               // Optional, overrides cookie name. Defaults to 'yar'. Doesn't affect 'plugins.yar'.
        // isSingleUse: false,         // Optional, clears jar after one request. Defaults to false.
        options: {
            password: 'password',   // Required
            isSecure: true          // Optional, any supported cookie options except `encoding`
        },
        session: {}
    }
};

var port = process.env.PORT || 8000;
var server = new Hapi.Server('localhost', port);

// something is wrong with this require, need to look up correct interface to test further
server.plugin().allow({ext: true}).require('yar', options, function (err) {

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
    path: '/set',
    config: {
        handler: function (request) {

            request.session.test = 1;
            request.reply.redirect('/').send();
        }
    }
});

server.route({
    method: 'GET',
    path: '/set',
    config: {
        handler: function (request) {

            request.session = {};
            request.reply.redirect('/').send();
        }
    }
});

server.start(function () {

    console.log('server started on port', port);
})