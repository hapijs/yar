// Load modules

var Boom = require('boom');
var Code = require('code');
var Hapi = require('hapi');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


it('sets session value then gets it back (store mode)', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                request.session.set('one', 'xyz');
                request.session.clear('one');
                return reply(Object.keys(request.session._store).length);
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                var some = request.session.get('some');
                some.raw = 'access';
                request.session.touch();
                return reply(some.value);
            }
        },
        {
            method: 'GET', path: '/3', handler: function (request, reply) {

                var raw = request.session.get('some').raw;
                request.session.reset();
                return reply(raw);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal(1);
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.not.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.result).to.equal('2');
                    var header = res.headers['set-cookie'];
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.result).to.equal('access');
                        done();
                    });
                });
            });
        });
    });
});

it('sets session value and wait till cache expires then fail to get it back', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        },
        cache: {
            expiresIn: 1
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                request.session.set('one', 'xyz');
                request.session.clear('one');
                return reply(Object.keys(request.session._store).length);
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                var some = request.session.get('some');
                return reply(some);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal(1);
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.not.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                setTimeout(function() {
                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.result).to.equal(null);
                        done();
                    });
                }, 10);
            });
        });
    });
});

it('sets session value then gets it back (cookie mode)', function (done) {

    var options = {
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.result).to.equal('2');
                    var header = res.headers['set-cookie'];
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (hybrid mode)', function (done) {

    var options = {
        maxCookieSize: 10,
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '12345678901234567890' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.result).to.equal('12345678901234567890');
                    var header = res.headers['set-cookie'];
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (lazy mode)', function (done) {

    var options = {
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.lazy(true);
                request.session.some = { value: '2' };
                request.session._test = { value: '3' };
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.some.value);
            }
        },
        {
            method: 'GET', path: '/3', handler: function(request, reply) {
                return reply(request.session._test);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.result).to.equal('2');
                    var header = res.headers['set-cookie'];
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({method: 'GET', url: '/3', headers: { cookie: cookie[1] } }, function(res) {
                        expect(res.result).to.be.null();
                    });
                    done();
                });
            });
        });
    });
});

it('no keys when in session (lazy mode)', function(done) {
    var options = {
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.lazy(true);
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {
                return reply(request.session._store);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.result).to.be.empty();
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (clear)', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set({'some': '2'});
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                var some = request.session.get('some', true);
                return reply(some);
            }
        },
        {
            method: 'GET', path: '/3', handler: function (request, reply) {

                var some = request.session.get('some');
                return reply(some || '3');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.result).to.equal('2');
                    var header = res.headers['set-cookie'];
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.result).to.equal('3');
                        done();
                    });
                });
            });
        });
    });
});

it('fails to set cookie in invalid cache', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server._caches._default.client.stop();
                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                    expect(res.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

it('fails setting session key/value because of bad key/value arguments', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server({ debug: false });
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set({ 'some': '2' }, '2');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                request.session.set(45.68, '2');
                return reply('1');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.statusCode).to.equal(500);
                server.inject({ method: 'GET', url: '/2' }, function (res) {

                    expect(res.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

it('fails setting session key/value because of failed cache set', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server({ debug: false });
    server.connection();

    var handler = function (request, reply) {

        request.session.set('some', 'value');
        server.stop(function () {                       // Cause cache.set() to fail

            return reply();
        });
    };

    server.route({ method: 'GET', path: '/', handler: handler });

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
});

it('fails generating session cookie header value (missing password)', function (done) {

    var server = new Hapi.Server({ debug: false });
    server.connection();

    server.route({
        method: 'GET', path: '/1', handler: function (request, reply) {

            request.session.set('some', { value: '2' });
            return reply('1');
        }
    });

    server.register(require('../'), function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
});

it('fails to store session because of state error', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    var server = new Hapi.Server({ debug: false });
    server.connection();

   server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1', headers: headers }, function (res) {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });
    });
});

it('ignores requests when session is not set (error)', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();
    server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply('ok'); } });

    server.ext('onRequest', function (request, reply) {

        reply(Boom.badRequest('handler error'));
    });

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(400);
                expect(res.result.message).to.equal('handler error');
                done();
            });
        });
    });
});

describe('flash()', function () {

    it('should get all flash messages when given no arguments', function (done) {

        var options = {
            cookieOptions: {
                password: 'password'
            }
        };
        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: function (request, reply) {

                    request.session.flash('error', 'test error 1');
                    request.session.flash('error', 'test error 2');
                    request.session.flash('test', 'test 1', true);
                    request.session.flash('test', 'test 2', true);
                    reply(request.session._store);
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: function (request, reply) {

                    var flashes = request.session.flash();
                    reply({
                        session: request.session._store,
                        flashes: flashes
                    });
                }
            }
        });

        server.register({ register: require('../'), options: options }, function (err) {

            expect(err).to.not.exist();
            server.start(function (err) {

                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.result._flash.error).to.deep.equal(['test error 1', 'test error 2']);
                    expect(res.result._flash.test).to.deep.equal('test 2');

                    var header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.result.session._flash.error).to.not.exist();
                        expect(res.result.flashes).to.exist();
                        done();
                    });
                });
            });
        });
    });

    it('should delete on read', function (done) {

        var options = {
            cookieOptions: {
                password: 'password'
            }
        };
        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: function (request, reply) {

                    request.session.flash('error', 'test error');
                    reply(request.session._store);
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: function (request, reply) {

                    var errors = request.session.flash('error');
                    var nomsg = request.session.flash('nomsg');
                    reply({
                        session: request.session._store,
                        errors: errors,
                        nomsg: nomsg
                    });
                }
            }
        });

        server.register({ register: require('../'), options: options }, function (err) {

            expect(err).to.not.exist();
            server.start(function (err) {

                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.result._flash.error).to.exist();
                    expect(res.result._flash.error.length).to.be.above(0);

                    var header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.result.session._flash.error).to.not.exist();
                        expect(res.result.errors).to.exist();
                        expect(res.result.nomsg).to.exist();
                        done();
                    });
                });
            });
        });
    });
});
