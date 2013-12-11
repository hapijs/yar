// Load modules

var Lab = require('lab');
var Hapi = require('hapi');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Yar', function () {

    it('sets session value then gets it back (store mode)', function (done) {

        var options = {
            maxCookieSize: 0,
            cookieOptions: {
                password: 'password',
                isSecure: false
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.set('some', { value: '2' });
                    this.session.set('one', 'xyz');
                    this.session.clear('one');
                    return this.reply(Object.keys(this.session._store).length);
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    var some = this.session.get('some');
                    some.raw = 'access';
                    this.session.touch();
                    return this.reply(some.value);
                }
            },
            {
                method: 'GET', path: '/3', handler: function () {

                    var raw = this.session.get('some').raw;
                    this.session.reset();
                    return this.reply(raw);
                }
            }
        ]);

        server.pack.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
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

    it('sets session value then gets it back (cookie mode)', function (done) {

        var options = {
            cookieOptions: {
                password: 'password'
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.set('some', { value: '2' });
                    return this.reply('1');
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    return this.reply(this.session.get('some').value);
                }
            }
        ]);

        server.pack.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
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

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.set('some', { value: '12345678901234567890' });
                    return this.reply('1');
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    return this.reply(this.session.get('some').value);
                }
            }
        ]);

        server.pack.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
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

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.lazy(true);
                    this.session.some = { value: '2' };
                    return this.reply('1');
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    return this.reply(this.session.some.value);
                }
            }
        ]);

        server.pack.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
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

    it('sets session value then gets it back (clear)', function (done) {

        var options = {
            maxCookieSize: 0,
            cookieOptions: {
                password: 'password',
                isSecure: false
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.set('some', '2');
                    return this.reply('1');
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    var some = this.session.get('some', true);
                    return this.reply(some);
                }
            },
            {
                method: 'GET', path: '/3', handler: function () {

                    var some = this.session.get('some');
                    return this.reply(some || '3');
                }
            }
        ]);

        server.pack.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
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

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.set('some', { value: '2' });
                    return this.reply('1');
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    return this.reply(this.session.get('some').value);
                }
            }
        ]);

        server.pack.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
            server.start(function () {

                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    var header = res.headers['set-cookie'];
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.pack._caches._default.client.stop();
                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.statusCode).to.equal(500);
                        done();
                    });
                });
            });
        });
    });

    it('fails generating session cookie header value (missing password)', function (done) {

        var server = new Hapi.Server(0);

        server.route({
            method: 'GET', path: '/1', handler: function () {

                this.session.set('some', { value: '2' });
                return this.reply('1');
            }
        });

        server.pack.allow({ ext: true }).require('../', function (err) {

            expect(err).to.not.exist;
            server.start(function () {

                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });

    describe("#flash", function () {

        it('should get all flash messages when given no arguments', function (done) {

            var options = {
                cookieOptions: {
                    password: 'password'
                }
            };
            var server = new Hapi.Server(0);

            server.route({
                method: 'GET',
                path: '/1',
                config: {
                    handler: function () {

                        this.session.flash('error', 'test error 1');
                        this.session.flash('error', 'test error 2');
                        this.session.flash('test', 'test 1', true);
                        this.session.flash('test', 'test 2', true);
                        this.reply(this.session._store);
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/2',
                config: {
                    handler: function () {

                        var flashes = this.session.flash();
                        this.reply({
                            session: this.session._store,
                            flashes: flashes
                        });
                    }
                }
            });

            server.pack.allow({ ext: true }).require('../', options, function (err) {

                expect(err).to.not.exist;
                server.start(function (err) {

                    server.inject({ method: 'GET', url: '/1' }, function (res) {

                        expect(res.result._flash.error).to.deep.equal(['test error 1', 'test error 2']);
                        expect(res.result._flash.test).to.deep.equal('test 2');

                        var header = res.headers['set-cookie'];
                        expect(header.length).to.equal(1);
                        var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                        server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                            expect(res.result.session._flash.error).to.not.exist;
                            expect(res.result.flashes).to.exist;
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
            var server = new Hapi.Server(0);

            server.route({
                method: 'GET',
                path: '/1',
                config: {
                    handler: function () {

                        this.session.flash('error', 'test error');
                        this.reply(this.session._store);
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/2',
                config: {
                    handler: function () {

                        var errors = this.session.flash('error');
                        this.reply({
                            session: this.session._store,
                            errors: errors
                        });
                    }
                }
            });

            server.pack.allow({ ext: true }).require('../', options, function (err) {

                expect(err).to.not.exist;
                server.start(function (err) {

                    server.inject({ method: 'GET', url: '/1' }, function (res) {

                        expect(res.result._flash.error).to.exist;
                        expect(res.result._flash.error.length).to.be.above(0);

                        var header = res.headers['set-cookie'];
                        expect(header.length).to.equal(1);
                        var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                        server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                            expect(res.result.session._flash.error).to.not.exist;
                            expect(res.result.errors).to.exist;
                            done();
                        });
                    });
                });
            });
        });
    });
});


