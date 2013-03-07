var Hapi = require('hapi');

var server = new Hapi.Server(process.env.PORT || 8080);

var options = {
    // name: 'yar' ,               // Optional, overrides cookie name. Defaults to 'yar'. Doesn't affect 'plugins.yar'.
    // isSingleUse: false,         // Optional, clears jar after one request. Defaults to false.
    cookieOptions: {
        password: 'password',   // Required
        // isSecure: true          // Optional, any supported cookie options except `encoding`
    },
    session: true
};

server.plugin().allow({ ext: true }).require('yar', options, function (err) {

    if (err) {
        console.log(err)
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
    path: '/set/{key}/{value}',
    config: {
        handler: function (request) {

            request.session[request.params.key] = request.params.value;
            request.reply.redirect('/').send();
        }
    }
});

server.route({
    method: 'GET',
    path: '/clear',
    config: {
        handler: function (request) {

            request.session = {};
            request.reply.redirect('/').send();
        }
    }
});

server.route({
    method: 'GET',
    path: '/control',
    config: {
        handler: function (request) {

            request.reply('ohai');
        }
    }
});

server.start(function () {

    console.log('server started on port: ', server.settings.port);
})