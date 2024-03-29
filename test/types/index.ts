import { Request, Server } from '@hapi/hapi';
import * as yar from '../..';

async function boot() {
    const server = new Server();
    await server.register({
        plugin: yar,
        options: {
            cookieOptions: {
                password: 'test',
                isSecure: true,
            },
            cache: {
                cache: 'test',
                expiresIn: 123141243,
            },
        },
    });

    server.route({
        path: '/test',
        method: 'get',
        handler(request: Request) {
            const example = request.yar.get('example');
            return {
                id: request.yar.id,
                key: example.key,
            };
        },
    });
}