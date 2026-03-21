/* eslint-disable @typescript-eslint/no-explicit-any */
import { Device, types } from "mediasoup-client";

export class MediasoupClient {
  private ws: WebSocket | null = null;
  private device: Device | null = null;
  private sendTransport: types.Transport | null = null;
  private recvTransport: types.Transport | null = null;
  private producers: Map<string, types.Producer> = new Map();
  private consumers: Map<string, types.Consumer> = new Map();
  private roomId: string;
  private userId: string | null = null;
  private onNewRemoteProducer: (producerId: string, kind: string, userName: string, userId: string) => void;
  private onRemoteProducerClosed: (producerId: string, userId: string) => void;
  private pendingRequests = new Map<string, (data: any) => void>();

  constructor(
    roomId: string,
    onNewRemoteProducer: (producerId: string, kind: string, userName: string, userId: string) => void,
    onRemoteProducerClosed: (producerId: string, userId: string) => void,
  ) {
    this.roomId = roomId;
    this.onNewRemoteProducer = onNewRemoteProducer;
    this.onRemoteProducerClosed = onRemoteProducerClosed;
    this.device = new Device();
  }

  getUserId() {
    return this.userId;
  }

  async connect(token: string) {
    // Basic JWT decode for userId
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.userId;
    } catch (e) {
        console.error('Failed to decode token', e);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
    const wsUrl = `${baseUrl.replace('http', 'ws')}?token=${token}`;
    this.ws = new WebSocket(wsUrl);


    return new Promise<void>((resolve, reject) => {
        if (!this.ws) return;
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            resolve();
        };
        this.ws.onerror = (err) => {
            console.error('WebSocket error', err);
            reject(err);
        };
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const { type, requestId, data } = message;

            if (type === 'response' && requestId && this.pendingRequests.has(requestId)) {
                this.pendingRequests.get(requestId)!(data);
                this.pendingRequests.delete(requestId);
            } else if (type === 'new-producer') {
                this.onNewRemoteProducer(data.producerId, data.kind, data.userName, data.userId);
            } else if (type === 'producer-closed') {
                this.onRemoteProducerClosed(data.producerId, data.userId);
            }
        };
    });
  }

  private request(type: string, data: any = {}): Promise<any> {
    const requestId = Math.random().toString(36).substring(2, 11);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            this.pendingRequests.delete(requestId);
            reject(new Error(`Request ${type} timed out`));
        }, 10000); // 10s timeout

        this.pendingRequests.set(requestId, (response) => {
            clearTimeout(timeout);
            resolve(response);
        });
        
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data, requestId }));
        } else {
            clearTimeout(timeout);
            reject(new Error("WebSocket not connected"));
        }
    });
  }

  private send(type: string, data: any = {}) {
    this.ws?.send(JSON.stringify({ type, data }));
  }

  async joinRoom() {
    const { rtpCapabilities, existingProducers } = await this.request("join-room", { roomId: this.roomId });
    await this.device!.load({ routerRtpCapabilities: rtpCapabilities });
    return existingProducers;
  }

  async initTransports() {
    this.sendTransport = await this.createWebRtcTransport("send");
    this.recvTransport = await this.createWebRtcTransport("recv");
  }

  private async createWebRtcTransport(
    direction: "send" | "recv",
  ): Promise<types.Transport> {
    const { params } = await this.request("create-transport", { roomId: this.roomId });
    const transport = direction === "send"
        ? this.device!.createSendTransport(params)
        : this.device!.createRecvTransport(params);

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
            await this.request("connect-transport", {
                transportId: transport.id,
                dtlsParameters,
            });
            callback();
        } catch (error: any) {
            errback(error);
        }
    });

    if (direction === "send") {
        transport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
            try {
                const { id } = await this.request("produce", {
                    transportId: transport.id,
                    kind,
                    rtpParameters,
                });
                callback({ id });
            } catch (error: any) {
                errback(error);
            }
        });
    }

    return transport;
  }

  async produce(track: MediaStreamTrack): Promise<types.Producer> {
    const producer = await this.sendTransport!.produce({ track });
    this.producers.set(producer.id, producer);
    return producer;
  }

  async consume(producerId: string): Promise<types.Consumer | null> {
    const data = await this.request("consume", {
        transportId: this.recvTransport!.id,
        producerId,
        rtpCapabilities: this.device!.rtpCapabilities,
    });

    if (data.error) {
        console.error('Consume error:', data.error);
        return null;
    }

    const { params } = data;
    const consumer = await this.recvTransport!.consume(params);
    this.consumers.set(consumer.id, consumer);

    this.send("resume-consumer", { consumerId: consumer.id });
    return consumer;
  }

  getSocket() {
    return this.ws;
  }
}

