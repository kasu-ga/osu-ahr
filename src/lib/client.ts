import { BanchoClient } from "bancho.js";
import { AhrRoom, type AhrRoomConfig } from "./room";

export interface AhrClientConfig {
  apikey: string;
  authentication: {
    username: string;
    password: string;
    botAccount?: boolean;
    host?: string;
    port?: number;
  };
  // 0: osu! , 1: osu!taiko , 2: osu!catch , 3: osu!mania
  gamemode?: 0 | 1 | 2 | 3;
}

export class AhrClient {
  readonly banchoClient: BanchoClient;
  readonly rooms: AhrRoom[] = [];

  constructor(
    client: BanchoClient | AhrClientConfig,
    rooms: AhrRoomConfig[] = [],
    prefix: string = "!"
  ) {
    if (!(client instanceof BanchoClient)) {
      client = new BanchoClient({
        apiKey: client.apikey,
        username: client.authentication.username,
        password: client.authentication.password,
        gamemode: client.gamemode,
        host: client.authentication.host,
        port: client.authentication.port,
      });
    }
    this.banchoClient = client;

    for (const roomConfig of rooms ?? []) {
      const room = new AhrRoom(prefix, client, roomConfig);
      this.rooms.push(room);
    }
  }

  async init(callback: (error: Error | null) => void) {
    try {
      await this.banchoClient.connect();
      for (const room of this.rooms) {
        await room.init();
      }
      callback(null);
    } catch (error) {
      callback(error as Error);
    }
  }

  async close() {
    this.banchoClient.disconnect();
    for (const room of this.rooms) {
      await room.close();
    }
  }
}
