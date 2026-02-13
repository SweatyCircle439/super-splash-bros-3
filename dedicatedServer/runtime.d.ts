import {EventEmitter} from "events";
import type {ServerWebSocket} from "bun";
// @ts-ignore
import type Player from "../app/class/game/Player";

interface ServerPlayer {
    socket: Bun.ServerWebSocket<wsData>;
    id: string;
    ip?: string;
    name: string;
}

type SocketActions = "join" | "update" | "keys" | "motd";

type SocketData = {
    act: SocketActions;
    version: string;
    index?: number;
    appearance?: import("../app/file").Settings["appearance"];
    keys?: import("../app/file").Settings["controls"];
};

type ServerEvents = {
    playerConnect: [Omit<ServerPlayer, "name">],
    playerJoin: [ServerPlayer, SocketData],
    playerLeave: [ServerPlayer],
    init: [Bun.Server<wsData>],
    ready: [],
    command: [string, ServerPlayer | null],
    /**
     * @type {[import("../app/class/game/Player"), import("../app/class/game/Game")]}
     */
    gameWon: [any, any],
    playerInitialized: [Omit<ServerPlayer, "name">],
    stop: [string?, number?]
}

declare class ServerEmitter extends EventEmitter {
    name: string;
    on<K extends keyof ServerEvents>(eventName: K, listener: (...args: ServerEvents[K]) => void): this
    emit<K extends keyof ServerEvents>(eventName: K, ...args: ServerEvents[K]): boolean
}

interface wsData {
    id: string;
    name?: string;
    ip?: string;
}

declare global {
    const Server: ServerEmitter;
    /**
     * @type {Map<string, import("../app/class/game/Game")>}
     */
    const playerGameMap: Map<string, any>;
    const banlist: string[];
    const clients: ServerWebSocket<wsData>[];
    /**
     * @type {import("../app/class/game/Game")[]}
     */
    const gameUniques: () => any[];
    /**
     * @type {import("../app/class/game/Game")}
     */
    const Game: any;
    /**
     * @type {import("../app/class/game/Player")}
     */
    const Player: any;
    const idIpMap: Map<string, string>;
    const config: Map<string, any>;
    const Rocket: any;
    const Attack: any;
    const Circle: any;
    const Exclusive;
    const Fish;
    const Geyser;
    const PoopBomb;
    const Splash;
    const Supply;
}
