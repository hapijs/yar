'use strict';

const Hapi = require('hapi');

(async () => {

    const server = new Hapi.Server({ port: process.env.PORT || 8080 });

    await server.register({
        plugin: require('../'),
        options: {
            cookieOptions: {
                password: 'passwordmustbesomewhatlongerthanitis',   // Required
                isSecure: false // Required if using http
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, reply) => {

            return 'Yar store: ' + JSON.stringify(request.yar._store)
                + '<p>Look in the examples/index.js source for more info.</p>'
                ;
        }
    });

    server.route({
        method: 'GET',
        path: '/set',
        handler: (request, reply) => {

            request.yar.set('test', 1);
            return reply.redirect('/');
        }
    });

    server.route({
        method: 'GET',
        path: '/set/{key}/{value}',
        handler: (request, reply) => {

            request.yar.set(request.params.key, request.params.value);
            return reply.redirect('/');
        }
    });

    server.route({
        method: 'GET',
        path: '/clear',
        handler: (request, reply) => {

            request.yar.reset();
            return reply.redirect('/');
        }
    });

    server.route({
        method: 'GET',
        path: '/control',
        handler: (request, reply) => 'ohai'
    });

    await server.start();
    console.log(`server started on http://localhost:${server.info.port}`);
})();
