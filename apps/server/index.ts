import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { verify, sign } from "jsonwebtoken";
import * as mediasoup from "mediasoup";

import { mediaCodecs } from "./mediasoup.config";
import { asyncApiSpec } from "./asyncapi";

const port = Number(process.env.SERVER_PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Initialize OpenAPI-compatible Hono
const app = new OpenAPIHono<any>();
app.use("*", cors());

// Define the Login Route for OpenAPI
const loginRoute = createRoute({
  method: "post",
  path: "/auth/login",
  summary: "Generate a JWT token for a meeting room",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            userId: z.string().openapi({ example: "user-123" }),
            userName: z.string().openapi({ example: "John Doe" }),
            roomId: z.string().openapi({ example: "room-abc" }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    "200": {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string().openapi({ example: "eyJhbGci..." }),
          }),
        },
      },
      description: "Returns a JWT token valid for 1 hour",
    },
  },
});

app.openapi(loginRoute as any, async (c: any) => {
  const { userId, userName, roomId } = c.req.valid("json");
  const token = sign({ userId, userName, roomId }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "2h",
  });
  return c.json({ token }, 200);
});

// Define the Health Route for OpenAPI
const healthRoute = createRoute({
  method: "get",
  path: "/health",
  summary: "Check the health of the signaling server",
  responses: {
    "200": {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string().openapi({ example: "ok" }),
            uptime: z.number().openapi({ example: 123.45 }),
            mediasoup: z.object({
              workerPid: z.number().openapi({ example: 1234 }),
              roomsCount: z.number().openapi({ example: 5 }),
            }),
          }),
        },
      },
      description: "Returns the health status of the server",
    },
  },
});

app.openapi(healthRoute as any, (c: any) => {
  return c.json(
    {
      status: "ok",
      uptime: process.uptime(),
      mediasoup: {
        workerPid: worker?.pid,
        roomsCount: rooms.size,
      },
    },
    200,
  );
});

// Swagger UI configuration (REST only)
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Mediasoup Signaling REST API",
    description:
      "RESTful endpoints for Mediasoup signaling. For WebSocket documentation, see /asyncapi",
  },
});

app.get("/docs", swaggerUI({ url: "/doc" }));

// AsyncAPI spec route
app.get("/asyncapi", (c: any) => {
  return c.json(asyncApiSpec);
});

// Zod Schemas for WebSocket messages (staying the same for now)
const MessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join-room"),
    data: z.object({ roomId: z.string().min(1) }),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal("create-transport"),
    data: z.object({ roomId: z.string() }).optional(),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal("connect-transport"),
    data: z.object({ transportId: z.string(), dtlsParameters: z.any() }),
    requestId: z.string().optional(),
  }),
  z.object({
    type: z.literal("produce"),
    data: z.object({
      transportId: z.string(),
      kind: z.enum(["audio", "video"]),
      rtpParameters: z.any(),
    }),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal("consume"),
    data: z.object({
      transportId: z.string(),
      producerId: z.string(),
      rtpCapabilities: z.any(),
    }),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal("resume-consumer"),
    data: z.object({ consumerId: z.string() }),
    requestId: z.string().optional(),
  }),
]);

// Mediasoup state
let worker: mediasoup.types.Worker;
const rooms = new Map<string, mediasoup.types.Router>();
const producers = new Map<
  string,
  {
    producer: mediasoup.types.Producer;
    userName: string;
    userId: string;
    roomId: string;
  }
>();
const consumers = new Map<string, mediasoup.types.Consumer>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();

// WebSocket connection state
interface SocketData {
  id: string;
  userId: string;
  userName: string;
  roomId: string;
}
const socketToRoom = new Map<string, string>(); // websocket.id -> roomId

(async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 10000,
    rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 10100,
  });
  worker.on("died", () => process.exit(1));
  console.log("Mediasoup worker created [pid:%d]", worker.pid);
})();

const server = Bun.serve<SocketData>({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (token) {
      try {
        const decoded = verify(token, JWT_SECRET, {
          algorithms: ["HS256"],
        }) as { userId: string; userName: string; roomId: string };
        if (
          server.upgrade(req, { data: { id: crypto.randomUUID(), ...decoded } })
        ) {
          return;
        }
      } catch (err) {
        return new Response("Unauthorized - Invalid Token", { status: 401 });
      }
    } else if (url.pathname === "/") {
      return new Response(
        "WebSocket connection requires token in query string",
        { status: 403 },
      );
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
          if (requestId)
            ws.send(
              JSON.stringify({ type: "response", requestId, data: resData }),
            );
        };
        const currentRoomId = ws.data.roomId;

        switch (type) {
          case "join-room": {
            if (data.roomId !== currentRoomId)
              return reply({ error: "Unauthorized room access" });
            let router = rooms.get(currentRoomId);
            if (!router) {
              router = await worker.createRouter({ mediaCodecs });
              rooms.set(currentRoomId, router);
            }

            // Get current producers in the room (excluding self)
            const existingProducers = Array.from(producers.values())
              .filter(
                (p) =>
                  p.roomId === currentRoomId && p.userId !== ws.data.userId,
              )
              .map((p) => ({
                producerId: p.producer.id,
                kind: p.producer.kind,
                userName: p.userName,
                userId: p.userId,
              }));

            reply({
              rtpCapabilities: router.rtpCapabilities,
              existingProducers,
            });
            break;
          }

          case "create-transport": {
            const router = rooms.get(currentRoomId);
            if (!router) return reply({ error: "Room not found" });
            const transport = await router.createWebRtcTransport({
              listenIps: [
                {
                  ip: "0.0.0.0",
                  announcedIp: process.env.ANNOUNCED_IP || "127.0.0.1",
                },
              ],
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
            transport.on("dtlsstatechange", (state) => {
              if (state === "closed") transport.close();
            });
            break;
          }

          case "connect-transport": {
            const transport = transports.get(data.transportId);
            if (transport) {
              await transport.connect({ dtlsParameters: data.dtlsParameters });
              reply({ success: true });
            } else {
              reply({ error: "Transport not found" });
            }
            break;
          }

          case "produce": {
            const transport = transports.get(data.transportId);
            if (transport) {
              const producer = await transport.produce({
                kind: data.kind,
                rtpParameters: data.rtpParameters,
              });
              producers.set(producer.id, {
                producer,
                userName: ws.data.userName,
                userId: ws.data.userId,
                roomId: currentRoomId,
              });
              reply({ id: producer.id });
              ws.publish(
                `room:${currentRoomId}`,
                JSON.stringify({
                  type: "new-producer",
                  data: {
                    producerId: producer.id,
                    kind: data.kind,
                    userName: ws.data.userName,
                    userId: ws.data.userId,
                  },
                }),
              );
            } else {
              reply({ error: "Transport not found" });
            }
            break;
          }

          case "consume": {
            const transport = transports.get(data.transportId);
            const router = rooms.get(currentRoomId);
            if (!transport || !router)
              return reply({ error: "Transport or Router not found" });
            if (
              router.canConsume({
                producerId: data.producerId,
                rtpCapabilities: data.rtpCapabilities,
              })
            ) {
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
            } else {
              reply({ error: "Cannot consume" });
            }
            break;
          }

          case "resume-consumer": {
            const consumer = consumers.get(data.consumerId);
            if (consumer) {
              await consumer.resume();
              reply({ success: true });
            } else {
              reply({ error: "Consumer not found" });
            }
            break;
          }
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: "Invalid message or unauthorized",
          }),
        );
      }
    },
    close(ws) {
      console.log("User disconnected:", ws.data.userId);

      // Clean up producers
      for (const [id, p] of producers.entries()) {
        if (p.userId === ws.data.userId && p.roomId === ws.data.roomId) {
          p.producer.close();
          producers.delete(id);
          // Notify others
          ws.publish(
            `room:${ws.data.roomId}`,
            JSON.stringify({
              type: "producer-closed",
              data: { producerId: id, userId: ws.data.userId },
            }),
          );
        }
      }

      // Cleanup transports
      // Note: In a production app, you'd want to track which transport belongs to which socket
      // For now, we'll rely on the transport 'closed' event or heartbeat if implemented.
      // But we can at least remove producers which is what the user sees.

      socketToRoom.delete(ws.data.id);
    },
  },
});

console.log(
  `Secure signaling server running on http://localhost:${server.port}`,
);
console.log(`Swagger UI available at http://localhost:${server.port}/docs`);
