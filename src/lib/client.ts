import { BanchoClient } from "bancho.js";
import messages from "simple-log-messages";

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
        host: client.authentication.host ?? "irc.ppy.sh",
        port: client.authentication.port ?? 6667,
      });
    }
    this.banchoClient = client;

    for (const roomConfig of rooms ?? []) {
      const room = new AhrRoom(prefix, client, roomConfig);
      this.rooms.push(room);
    }
  }

  async init(callback?: (error: Error | null) => void) {
    try {
      messages.info("Establishing connection with osu...");
      await this.banchoClient.connect();
      messages.success("Connection to osu successful.");
      for (const room of this.rooms) {
        await room.init();
      }
      if (callback) callback(null);
    } catch (error) {
      if (callback) return callback(error as Error);
      throw error;
    }
  }

  async close() {
    messages.warn("Canceling connection and closing rooms...");
    this.banchoClient.disconnect();
    for (const room of this.rooms) {
      await room.close();
    }
    messages.success("Connection and closed rooms correctly.");
  }
}
