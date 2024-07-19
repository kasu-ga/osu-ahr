# Osu Auto Host Rotate

> Create OSU multiplayer games with auto host rotate.

## Why?

The other day I had an idea, I wanted to create an osu multiplayer room with the rotating host system, however, I found that it is somewhat complex to carry it out if you do not have minimal knowledge in programming, therefore, many people They do not continue with this idea and give up.

To prevent more people from giving up and really continuing with their idea or simply for those looking for a simpler method, develop this module, it is quite basic, but it fulfills its role and being so minimalist, using it is simple, also, yes still If you want an even simpler method, you can download or clone this other [repository](), which just by modifying a JSON you can start playing.

As an additional, I chose to develop it in Nodejs because of its low complexity and that anyone with one or two tutorials can make it work.

## Quick Start

### Installation

```bash
npm install osu-ahr
```

### Create Client

This module is compatible with `ESM` and `CJS` so don't hesitate to use the one you like the most.

```ts
import { AhrClient, type AhrClientOptions, type AhrRoomConfig } from "osu-ahr";

const config: AhrClientOptions = {};

const rooms: AhrRoomConfig[] = [];

const client = new AhrClient(config, rooms);

await client.init();
```

The configuration object corresponds to the Bancho.js client options, so to learn more, check the [documentation](https://bancho.js.org/).

To define rooms, review the following table:

| Option     | Type                | Description                                                                                                                   |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| name       | `string` `required` | Room name                                                                                                                     |
| slots      | `number`            | Room slots                                                                                                                    |
| beatmapId  | `number` `required` | Default room beatmap                                                                                                          |
| difficulty | `object`            | The object has two self-explanatory properties `min` and `max`, that is, the maximum and minimum difficulty used in the room. |
| password   | `string`            | Room password                                                                                                                 |
| privated   | `boolean`           | `true` if the room is private and `false` if it is public.                                                                    |

e.g:

```ts
const rooms = [
  {
    name: "0.0* - 3.5* | Auto Host Rotate",
    slots: 16,
    beadmapId: 4686663,
    difficulty: {
      min: 0,
      max: 3.1,
    },
    password: "",
    privated: false,
  },
];
```

## Contribution

Contributions are welcome so do not hesitate to make them, they will be reviewed and integrated as quickly as possible so that this project continues to grow and improve day by day.

## License

[MIT LICENSE](https://github.com/kasu-ga/osu-ahr/blob/main/LICENSE.md)
