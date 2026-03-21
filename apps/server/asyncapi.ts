export const asyncApiSpec = {
  asyncapi: '2.6.0',
  info: {
    title: 'Mediasoup Signaling WebSocket API',
    version: '1.0.0',
    description: 'WebSocket messages for signaling WebRTC connections using Mediasoup SFU.',
  },
  servers: {
    production: {
      url: 'ws://localhost:{port}',
      protocol: 'ws',
      variables: {
        port: {
          default: '3001',
        },
      },
    },
  },
  channels: {
    '/': {
      publish: {
        message: {
          oneOf: [
            { $ref: '#/components/messages/joinRoom' },
            { $ref: '#/components/messages/createTransport' },
            { $ref: '#/components/messages/connectTransport' },
            { $ref: '#/components/messages/produce' },
            { $ref: '#/components/messages/consume' },
            { $ref: '#/components/messages/resumeConsumer' },
          ],
        },
      },
      subscribe: {
        message: {
          oneOf: [
            { $ref: '#/components/messages/response' },
            { $ref: '#/components/messages/newProducer' },
          ],
        },
      },
    },
  },
  components: {
    messages: {
      joinRoom: {
        name: 'join-room',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'join-room' },
            data: {
              type: 'object',
              properties: {
                roomId: { type: 'string' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
      createTransport: {
        name: 'create-transport',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'create-transport' },
            requestId: { type: 'string' },
          },
        },
      },
      connectTransport: {
        name: 'connect-transport',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'connect-transport' },
            data: {
              type: 'object',
              properties: {
                transportId: { type: 'string' },
                dtlsParameters: { type: 'object' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
      produce: {
        name: 'produce',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'produce' },
            data: {
              type: 'object',
              properties: {
                transportId: { type: 'string' },
                kind: { enum: ['audio', 'video'] },
                rtpParameters: { type: 'object' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
      consume: {
        name: 'consume',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'consume' },
            data: {
              type: 'object',
              properties: {
                transportId: { type: 'string' },
                producerId: { type: 'string' },
                rtpCapabilities: { type: 'object' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
      resumeConsumer: {
        name: 'resume-consumer',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'resume-consumer' },
            data: {
              type: 'object',
              properties: {
                consumerId: { type: 'string' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
      response: {
        name: 'response',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'response' },
            requestId: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
      newProducer: {
        name: 'new-producer',
        payload: {
          type: 'object',
          properties: {
            type: { const: 'new-producer' },
            data: {
              type: 'object',
              properties: {
                producerId: { type: 'string' },
                kind: { enum: ['audio', 'video'] },
                userName: { type: 'string' },
                userId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
