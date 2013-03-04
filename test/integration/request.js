// Load modules

var Chai = require('chai');
var Hapi = require('hapi');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Request', function () {

    describe("#flash", function () {

        it('should get all flash messages when given no arguments', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: true
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/1',
                config: {
                    handler: function (request) {

                        request.flash('error', 'test error');
                        request.reply(JSON.stringify(request.session));
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/2',
                config: {
                    handler: function (request) {
                        
                        var flashes = request.flash();
                        request.reply(JSON.stringify({
                            session: request.session,
                            flashes: flashes
                        }));
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                
                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    var result = JSON.parse(res.result);
                    expect(result.flash.error).to.exist;
                    expect(result.flash.error.length).to.be.above(0);
                    
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);
                    
                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        var result = JSON.parse(res.result);
                        expect(result.session.flash.error).to.not.exist;
                        expect(result.flashes).to.exist;
                            
                        done();
                    })
                })
            });
        });

        it('should delete on read', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: true
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/1',
                config: {
                    handler: function (request) {

                        // request.session.test = 1;
                        request.flash('error', 'test error');
                        // console.log('flashing', request.session)
                        request.reply(JSON.stringify(request.session));
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/2',
                config: {
                    handler: function (request) {
                        
                        // console.log('about to flash', request.session)
                        var errors = request.flash('error');
                        // console.log('flashed', request.session)
                        request.reply(JSON.stringify({
                            session: request.session,
                            errors: errors
                        }));
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                
                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    var result = JSON.parse(res.result);
                    expect(result.flash.error).to.exist;
                    expect(result.flash.error.length).to.be.above(0);
                    
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);
                    
                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res) {

                        var result = JSON.parse(res.result);
                        expect(result.session.flash.error).to.not.exist;
                        expect(result.errors).to.exist;
                            
                        done();
                    })
                })
            });
        });
    });
});