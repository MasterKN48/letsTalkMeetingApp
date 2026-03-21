import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verify, sign } from 'jsonwebtoken';
import { z } from 'zod';
import * as mediasoup from 'mediasoup';
import { mediaCodecs } from './mediasoup.config';

const port = Number(process.env.SERVER_PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const app = new Hono();
app.use('*', cors());

// Authentication endpoint (simulated)
app.post('/auth/login', async (c) => {
    const { userId, roomId } = await c.req.json();
    const token = sign({ userId, roomId }, JWT_SECRET, { expiresIn: '1h' });
    return c.json({ token });
});

// Zod Schemas for WebSocket messages
const MessageSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('join-room'), data: z.object({ roomId: z.string().min(1) }), requestId: z.string() }),
    z.object({ type: z.literal('create-transport'), data: z.object({ roomId: z.string() }).optional(), requestId: z.string() }),
    z.object({ type: z.literal('connect-transport'), data: z.object({ transportId: z.string(), dtlsParameters: z.any() }), requestId: z.string().optional() }),
    z.object({ type: z.literal('produce'), data: z.object({ transportId: z.string(), kind: z.enum(['audio', 'video']), rtpParameters: z.any() }), requestId: z.string() }),
    z.object({ type: z.literal('consume'), data: z.object({ transportId: z.string(), producerId: z.string(), rtpCapabilities: z.any() }), requestId: z.string() }),
    z.object({ type: z.literal('resume-consumer'), data: z.object({ consumerId: z.string() }), requestId: z.string().optional() }),
]);

// Mediasoup state
let worker: mediasoup.types.Worker;
const rooms = new Map<string, mediasoup.types.Router>();
const producers = new Map<string, mediasoup.types.Producer>();
const consumers = new Map<string, mediasoup.types.Consumer>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();

// WebSocket connection state
interface SocketData { id: string, userId: string, roomId: string }
const socketToRoom = new Map<string, string>(); // websocket.id -> roomId

(async () => {
    worker = await mediasoup.createWorker({
        rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 10000,
        rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 10100,
    });
    worker.on('died', () => process.exit(1));
    console.log('Mediasoup worker created [pid:%d]', worker.pid);
})();

const server = Bun.serve<SocketData>({
    port,
    fetch(req, server) {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');

        if (token) {
            try {
                const decoded = verify(token, JWT_SECRET) as { userId: string, roomId: string };
                if (server.upgrade(req, { data: { id: crypto.randomUUID(), ...decoded } })) {
                    return;
                }
            } catch (err) {
                return new Response('Unauthorized - Invalid Token', { status: 401 });
            }
        } else if (url.pathname === '/') {
            // Root path without token is rejected for WS
            return new Response('WebSocket connection requires token in query string', { status: 403 });
        }

        return app.fetch(req);
    },
    websocket: {
        async open(ws) {
            console.log(`User ${ws.data.userId} connected to room ${ws.data.roomId}`);
            ws.subscribe(`room:${ws.data.roomId}`);
            socketToRoom.set(ws.data.id, ws.data.roomId);
        },
        async message(ws, message) {
            try {
                const parsed = MessageSchema.parse(JSON.parse(message as string));
                const { type, data, requestId } = parsed;

                const reply = (resData: any) => {
                    if (requestId) ws.send(JSON.stringify({ type: 'response', requestId, data: resData }));
                };

                // Authorization check: User should only interact with their own room (from JWT)
                const currentRoomId = ws.data.roomId;

                switch (type) {
                    case 'join-room': {
                        if (data.roomId !== currentRoomId) return reply({ error: 'Unauthorized room access' });
                        let router = rooms.get(currentRoomId);
                        if (!router) {
                            router = await worker.createRouter({ mediaCodecs });
                            rooms.set(currentRoomId, router);
                        }
                        reply({ rtpCapabilities: router.rtpCapabilities });
                        break;
                    }

                    case 'create-transport': {
                        const router = rooms.get(currentRoomId);
                        if (!router) return;

                        const transport = await router.createWebRtcTransport({
                            listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1' }],
                            enableUdp: true,
                            enableTcp: true,
                            preferUdp: true,
                        });

                        transports.set(transport.id, transport);
                        reply({
                            params: {
                                id: transport.id,
                                iceParameters: transport.iceParameters,
                                iceCandidates: transport.iceCandidates,
                                dtlsParameters: transport.dtlsParameters,
                            },
                        });
                        transport.on('dtlsstatechange', (state) => { if (state === 'closed') transport.close(); });
                        break;
                    }

                    case 'connect-transport': {
                        const transport = transports.get(data.transportId);
                        // Check if transport belongs to this router/room (omitted for brevity but recommended)
                        if (transport) await transport.connect({ dtlsParameters: data.dtlsParameters });
                        break;
                    }

                    case 'produce': {
                        const transport = transports.get(data.transportId);
                        if (transport) {
                            const producer = await transport.produce({ kind: data.kind, rtpParameters: data.rtpParameters });
                            producers.set(producer.id, producer);
                            reply({ id: producer.id });
                            ws.publish(`room:${currentRoomId}`, JSON.stringify({
                                type: 'new-producer',
                                data: { producerId: producer.id, kind: data.kind }
                            }));
                        }
                        break;
                    }

                    case 'consume': {
                        const transport = transports.get(data.transportId);
                        const router = rooms.get(currentRoomId);
                        if (!transport || !router) return;

                        if (router.canConsume({ producerId: data.producerId, rtpCapabilities: data.rtpCapabilities })) {
                            const consumer = await transport.consume({
                                producerId: data.producerId,
                                rtpCapabilities: data.rtpCapabilities,
                                paused: true,
                            });
                            consumers.set(consumer.id, consumer);
                            reply({
                                params: {
                                    id: consumer.id,
                                    producerId: data.producerId,
                                    kind: consumer.kind,
                                    rtpParameters: consumer.rtpParameters,
                                },
                            });
                        }
                        break;
                    }

                    case 'resume-consumer': {
                        const consumer = consumers.get(data.consumerId);
                        if (consumer) await consumer.resume();
                        break;
                    }
                }
            } catch (err) {
                console.error('Validation/Auth error:', err);
                ws.send(JSON.stringify({ type: 'error', data: 'Invalid message or unauthorized' }));
            }
        },
        close(ws) {
            console.log('WebSocket closed:', ws.data.id);
            socketToRoom.delete(ws.data.id);
        },
    },
});

console.log(`Secure signaling server running on http://localhost:${server.port}`);