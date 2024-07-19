import BanchoJs from "bancho.js";
import type { Beatmap } from "nodesu";
import { formatSeconds, getApprovalStatus } from "./utils";

export interface AhrRoomConfig {
  name: string;
  slots?: number;
  beatmapId: number;
  difficulty?: {
    min?: number;
    max?: number;
  };
  password?: string;
  privated?: boolean;
}

export interface AhrRoomVotes {
  skip: BanchoJs.BanchoUser[];
  start: BanchoJs.BanchoUser[];
}

const defaultVotes: AhrRoomVotes = {
  skip: [],
  start: [],
};

export class AhrRoom {
  private config: AhrRoomConfig;
  private client: BanchoJs.BanchoClient;
  private lobby: BanchoJs.BanchoLobby | null = null;
  private players: BanchoJs.BanchoUser[] = [];
  private votes: AhrRoomVotes = defaultVotes;
  private minDiff: number = 0;
  private maxDiff: number = 20;
  private beatmap: Beatmap | null = null;
  private onClose?: (room: AhrRoom) => void;
  private prefix: string;

  constructor(
    prefix: string,
    client: BanchoJs.BanchoClient,
    config: AhrRoomConfig,
    onClose?: (room: AhrRoom) => void
  ) {
    this.client = client;
    this.config = config;
    this.prefix = prefix;

    if (config.difficulty?.min) this.minDiff = config.difficulty.min;
    if (config.difficulty?.max) this.maxDiff = config.difficulty.max;
    this.onClose = onClose;
  }

  async init() {
    const room = await this.client.createLobby(
      this.config.name,
      this.config.privated
    );
    this.lobby = room.lobby;
    if (typeof this.config.slots === "number" && this.config.slots > 0) {
      await room.lobby.setSize(this.config.slots);
      await room.lobby.unlockSlots();
    }
    await room.lobby.setPassword(this.config.password ?? "");
    this.beatmap = await this.getDefaultBeatmap();
    await room.lobby.setMap(this.beatmap);

    room.lobby.on("beatmap", async (beatmap) => {
      if (!beatmap) return;
      await this.setBeatmap(beatmap);
    });
    room.lobby.on("matchStarted", () => {
      this.votes.start = [];
    });
    room.lobby.on("allPlayersReady", async () => {
      await this.startWithTime(15);
    });
    room.lobby.on("matchFinished", async () => {
      await this.rotateHost();
    });
    room.lobby.on("playerJoined", async ({ player }) => {
      await this.join(player.user);
    });
    room.lobby.on("playerLeft", async ({ user }) => {
      await this.leave(user);
    });

    room.lobby.channel.on("message", async ({ user, message }) => {
      if (!this.players.find((u) => u.id === user.id)) return;
      if (!message.startsWith(this.prefix)) return;
      const messageArgs = message.slice(1).split(" ");
      const command = messageArgs[0];
      if (command === "help") {
        await room.lobby.channel.sendMessage("Commands list:");
        return;
      }
      if (command === "queue" || command === "qu") {
        await this.queue();
        return;
      }
      if (command === "skip" || command === "sk") {
        await this.skip(user);
        return;
      }
      if (command === "abort" || command === "ab") {
        await this.abort();
        return;
      }
      if (command === "diff") {
        await this.setMinDiff(user, messageArgs[1]);
        await this.setMaxDiff(user, messageArgs[2]);
        return;
      }
      if (command === "mindiff") {
        await this.setMinDiff(user, messageArgs[1]);
        return;
      }
      if (command === "maxdiff") {
        await this.setMaxDiff(user, messageArgs[1]);
        return;
      }
      if (command === "start") {
        await this.start(user, messageArgs[1]);
        return;
      }
      if (command === "close") {
        await this.close(user);
        if (this.onClose) this.onClose(this);
        return;
      }
    });

    console.info(
      `Created room https://osu.ppy.sh/mp/${room.lobby.id} [${room.name}]`
    );
  }

  async getDefaultBeatmap(): Promise<Beatmap> {
    const beatmaps = await this.client.osuApi.beatmaps.getByBeatmapId(
      this.config.beatmapId
    );
    if (Array.isArray(beatmaps) && "id" in beatmaps[0]) return beatmaps[0];
    throw new Error(`Invalid beatmap id ${this.config.beatmapId}`);
  }

  async setBeatmap(beatmap: Beatmap) {
    if (beatmap.difficultyRating < this.minDiff) {
      await this.lobby?.setMap(this.beatmap!);
      await this.message(
        `The difficulty of the map is lower than allowed (${beatmap.difficultyRating.toFixed(
          2
        )} < ${this.minDiff.toFixed(2)}).`
      );
      return;
    }
    if (beatmap.difficultyRating > this.maxDiff) {
      await this.lobby?.setMap(this.beatmap!);
      await this.message(
        `The difficulty of the map is higher than allowed (${beatmap.difficultyRating.toFixed(
          2
        )} > ${this.maxDiff.toFixed(2)}).`
      );
      return;
    }
    this.beatmap = beatmap;

    await this.message(
      `Beatmap: [https://osu.ppy.sh/beatmapsets/${beatmap.setId} ${beatmap.title}] ([https://osu.direct/d/${beatmap.setId} Osu Direct])`
    );
    const approved = getApprovalStatus(beatmap.approved);
    const formatedSeconds = formatSeconds(beatmap.totalLength);
    await this.message(
      `Star Rating: ${beatmap.difficultyRating.toFixed(
        2
      )} | ${approved} | Length: ${formatedSeconds} | BPM: ${beatmap.bpm}`
    );
    await this.message(
      `AR: ${beatmap.AR} | OD: ${beatmap.OD} | HP: ${beatmap.HP}`
    );
  }

  async close(user?: BanchoJs.BanchoUser) {
    if (user) {
      const currentHost = await this.getHost();
      if (currentHost && user.id !== currentHost.id) return;
    }
    await this.message("Closing room...");
    await this.lobby?.closeLobby();
    if (this.onClose) this.onClose(this);
  }

  async getHost(): Promise<BanchoJs.BanchoUser | null> {
    const host = this.lobby?.getHost();
    return host?.user ?? null;
  }

  size() {
    return this.players.length / 2;
  }

  async rotateHost() {
    const currentHost = await this.getHost();
    if (currentHost) {
      this.players.push(currentHost);
      this.players = this.players.slice(1);
    }
    const newHost = this.players[0];
    await this.lobby?.setHost(newHost.username);
  }

  async message(message: string) {
    await this.lobby?.channel.sendMessage(message);
  }

  async abort() {
    await this.message("Aborting match...");
    await this.lobby?.abortMatch();
  }

  async skip(user: BanchoJs.BanchoUser) {
    const currentHost = await this.getHost();
    if (currentHost && currentHost.id === user.id) {
      await this.rotateHost();
      return;
    }
    if (this.votes.skip.find((u) => u.id === user.id)) return;
    if (this.votes.skip.length >= this.size()) {
      this.votes.skip = [];
      await this.rotateHost();
      return;
    }
    const message = `Votes to skip (${this.votes.skip.length}/${this.size()})`;
    await this.message(message);
  }

  async queue() {
    const names = this.players.slice(0, 6).map((player) => player.username);
    if (this.players.length > 6) names.push("...");
    await this.message(`Queue: ${names.join(", ")}`);
  }

  async join(user: BanchoJs.BanchoUser) {
    this.players.push(user);
    if (this.players.length === 1) {
      await this.rotateHost();
    }
  }

  async leave(user: BanchoJs.BanchoUser) {
    this.players = this.players.filter((player) => player.id !== user.id);
  }

  async setMinDiff(user: BanchoJs.BanchoUser, value: string | number) {
    const currentHost = await this.getHost();
    if (currentHost && user.id !== currentHost.id) return;
    if (typeof value === "string") value = parseInt(value);
    if (Number.isNaN(value) || value < 0) {
      await this.message(
        "The minimum difficulty value must be a number greater than or equal to zero"
      );
      return;
    }
    this.minDiff = value;
  }

  async setMaxDiff(user: BanchoJs.BanchoUser, value: string | number) {
    const currentHost = await this.getHost();
    if (currentHost && user.id !== currentHost.id) return;
    if (typeof value === "string") value = parseInt(value);
    if (Number.isNaN(value) || value <= 0) {
      await this.message(
        "The maximum difficulty value must be a number greater than zero."
      );
      return;
    }
    this.minDiff = value;
  }

  async startWithTime(startTime: string | number) {
    if (typeof startTime === "string") startTime = parseInt(startTime);
    if (Number.isNaN(startTime) || startTime < 0) {
      await this.message(
        "The start time must be a number greater than or equal to zero."
      );
    }
    await this.lobby?.startMatch(startTime);
    await this.message("Use !abort or !ab to cancel match.");
  }

  async startWithVotes(user: BanchoJs.BanchoUser) {
    if (this.votes.start.find((u) => u.id === user.id)) return;
    if (this.votes.start.length >= this.size()) {
      this.votes.start = [];
      await this.startWithTime(15);
      return;
    }
    const message = `Votes to start (${
      this.votes.start.length
    }/${this.size()})`;
    await this.message(message);
  }

  async start(user: BanchoJs.BanchoUser, startTime?: string | number) {
    if (startTime) {
      await this.startWithTime(startTime);
      return;
    }
    await this.startWithVotes(user);
  }
}
