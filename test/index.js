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
                isSecure: true
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

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

        server.plugin.allow({ ext: true }).require('../', options, function (err) {

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

    it('sets session value then gets it back (cookie mode)', function (done) {

        var options = {
            cookieOptions: {
                password: 'password',
                isSecure: true
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

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

        server.plugin.allow({ ext: true }).require('../', options, function (err) {

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
                password: 'password',
                isSecure: true
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

                    this.session.some = { value: 'abcdefghijklmnop' };
                    return this.reply('1');
                }
            },
            {
                method: 'GET', path: '/2', handler: function () {

                    return this.reply(this.session.some.value);
                }
            }
        ]);

        server.plugin.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
            server.start(function () {
                
                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.result).to.equal('1');
                    var header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    expect(header[0]).to.contain('Secure');
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.result).to.equal('abcdefghijklmnop');
                        var header = res.headers['set-cookie'];
                        done();
                    });
                });
            });
        });
    });

    it('fails to set cookie in invalid cache', function (done) {

        var options = {
            cookieOptions: {
                password: 'password',
                isSecure: true
            }
        };

        var server = new Hapi.Server(0);

        server.route([
            {
                method: 'GET', path: '/1', handler: function () {

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

        server.plugin.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
            server.start(function () {
                
                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    var header = res.headers['set-cookie'];
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.plugin._cache.stop();
                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        expect(res.statusCode).to.equal(500);
                        done();
                    });
                });
            });
        });
    });

    it('fails generating session cookie header value (missing password)', function (done) {

        var options = {
            cookieOptions: {
                isSecure: true
            }
        };

        var server = new Hapi.Server(0);

        server.route({
            method: 'GET', path: '/1', handler: function () {

                this.session.some = { value: '2' };
                return this.reply('1');
            }
        });

        server.plugin.allow({ ext: true }).require('../', options, function (err) {

            expect(err).to.not.exist;
            server.start(function () {
                
                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});


