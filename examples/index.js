var Hapi = require('hapi');
var Yar = require('../');

var server = new Hapi.Server(process.env.PORT || 8080);

var options = {
    cookieOptions: {
        password: 'password',   // Required
        isSecure: false // Required if using http
    }
};

server.pack.register({
    plugin: Yar,
    options: options
}, function (err) {

    if (err) {
        console.log(err)
        throw err;
    }
});

server.route({
    method: 'GET',
    path: '/',
    config: {
        handler: function (request, reply) {

            reply(request.session._store)
        }
    }
});

server.route({
    method: 'GET',
    path: '/set',
    config: {
        handler: function (request, reply) {

            request.session.set('test', 1);
            reply.redirect('/');
        }
    }
});

server.route({
    method: 'GET',
    path: '/set/{key}/{value}',
    config: {
        handler: function (request, reply) {

            request.session.set(request.params.key, request.params.value);
            reply.redirect('/');
        }
    }
});

server.route({
    method: 'GET',
    path: '/clear',
    config: {
        handler: function (request, reply) {

            request.session.reset();
            reply.redirect('/');
        }
    }
});

server.route({
    method: 'GET',
    path: '/control',
    config: {
        handler: function (request, reply) {

            reply('ohai');
        }
    }
});

server.start(function () {

    console.log('server started on port: ', server.info.port);
});
