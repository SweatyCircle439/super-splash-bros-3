import { join, resolve, extname } from "path";
import * as fs from "fs";
import {cycle} from "../app/preload/theme";
//@ts-ignore
import {version} from "../package.json";
//@ts-ignore
import Game from "../app/class/game/Game";
//@ts-ignore
import Player from "../app/class/game/Player";
import { randomUUID } from "crypto";
import * as vm from "vm";
import { EventEmitter } from "events";
import type {ServerEvents, SocketData, wsData} from "./runtime";
import * as z from "zod";
import { embeddedFiles } from "bun";
import defaultConfig from "./server.toml" with {type: "text"}

class ServerEmitter extends EventEmitter {
    name: string;
    constructor(config: any) {
        super();
        this.name = config.Server.name;
    }
    on<K extends keyof ServerEvents>(eventName: K, listener: (...args: ServerEvents[K]) => void): this {
        return super.on(eventName, listener);
    }
    emit<K extends keyof ServerEvents>(eventName: K, ...args: ServerEvents[K]): boolean {
        return super.emit(eventName, ...args);
    }
}

class _Plugin {
    enabled = true;
    scope: vm.Context;
    ready: Promise<string>;
    id: string;
    description?: string;
    defaultConfig: Record<string, any> = {};
    config: Map<string, any> = new Map();
    otherConfig: Record<string, any> = {};
    __is_Builtin = false;
    constructor(
        schema: z.ZodType,
        parseConfigMethods: [string, (c: any) => void][],
        file: Blob,
        emitter: ServerEmitter,
        playerGameMap: Map<string, Game>,
        banlist: string[],
        gameUniques: () => Game[],
        clients: Bun.ServerWebSocket<wsData>[],
        idIpMap: Map<string, string>,
    ) {
        this.ready = file.bytes().then(async v => {
            const archive = new Bun.Archive(v);
            // archive.files("*.*").then(v => console.log(Object.fromEntries(v)));
            await archive.files("plugin.toml").then(async v => {
                // console.log(Object.fromEntries(v));
                const obj = Bun.TOML.parse(await v.get("plugin.toml").text());
                // console.log(obj);
                const config = schema.parse(obj);
                this.parseConfig(config, parseConfigMethods);
            });
            const v_2 = await archive.files("plugin.js");
            return await v_2.get("plugin.js").text();
        });
        this.scope = vm.createContext({
            import: (module: string) => import(module),
            require,
            Server: emitter,
            playerGameMap,
            banlist,
            clients,
            gameUniques,
            console,
            Game,
            Player,
            setTimeout,
            setInterval,
            clearInterval,
            clearTimeout,
            idIpMap,
            config: this.config,
            Bun,
            crypto,
            AbortController,
            Buffer,
            URL,
            Error,
            process
        });
    }

    init () {
        this.ready.then(v => vm.runInContext(v, this.scope));
    }

    parseConfig (config: Object, methods: [string, (c: any) => void][]) {
        for (const configKey in config) {
            if (config.hasOwnProperty(configKey)) {
                e: if (configKey === "Plugin") {
                    this.id = config[configKey].id;
                    this.description = config[configKey].description;
                }else if (configKey === "Config") {
                    this.defaultConfig = config[configKey];
                } else {
                    for (const method of methods) {
                        if (method[0] === configKey) {
                            method[1](config[configKey]);
                            break e;
                        }
                    }
                    this.otherConfig[configKey] = config[configKey];
                }
            }
        }
    }
}

type Tail<T extends readonly any[]> =
    T extends readonly [any, any, ...infer R] ? R : [];

const pluginScheme = z.looseObject({
    Plugin: z.object({
        id: z.string(),
        description: z.string().optional()
    }),
    Config: z.any()
});

const builtInScheme = pluginScheme.extend(({
    BuiltIn: z.object({
        "default": z.boolean()
    })
}));

class BuiltInPlugin extends _Plugin {
    enabled = false;
    __is_Builtin = true;
    constructor(...props: Tail<ConstructorParameters<typeof _Plugin>>) {
        super(builtInScheme, [
            ["BuiltIn", (c) => {
                if (typeof c.default === "boolean") this.enabled = c.default;
            }]
        ], ...props);
    }
}

class Plugin extends _Plugin {
    enabled = true;
    constructor(...props: Tail<ConstructorParameters<typeof _Plugin>>) {
        super(pluginScheme, [], ...props);
    }
}

const plugins:_Plugin[] = [];

export async function main(cwd = process.cwd()) {
    const configFile = Bun.file(join(cwd, "server.toml"));
    if (!await configFile.exists()) {
        await Bun.write(configFile, defaultConfig);
    }

    const config = {
        ...Bun.TOML.parse(defaultConfig),
        ...Bun.TOML.parse(await configFile.text())
    } as any;

    const idIpMap = new Map<string, string>();
    const banlist:string[] = [];
    const playerGameMap = new Map<string, Game>();
    function gameUniques() {
        let processedGames: Game[] = [];
        return Array.from(playerGameMap.values()).filter(v => {
            if (processedGames.includes(v)) return false;
            processedGames.push(v);
            return true;
        });
    }
    const clients:Bun.ServerWebSocket<wsData>[] = [];
    let frames = 0;
    const emitter = new ServerEmitter(config);
    const server = Bun.serve({
        fetch(req, server) {
            const newId = randomUUID();
            const cookies = new Bun.CookieMap(req.headers.get("cookie") || "");
            if (!cookies.get("id")) cookies.set("id", newId);
            const id = cookies.get("id");
            idIpMap.set(id, server.requestIP(req)?.address);
            if (server.upgrade(req, {
                headers: {
                    "Set-Cookie": cookies.toSetCookieHeaders()
                }, data: {
                    id,
                    ip: server.requestIP(req)?.address
                }
            })) {
                return;
            }
            return new Response("Upgrade failed", { status: 200 });
        },
        websocket: {
            data: {} as wsData,
            message(ws, data) {
                const payload = Buffer.isBuffer(data) ? new TextDecoder().decode(data) : data;

                let json: SocketData;
                try {
                    json = JSON.parse(payload);
                } catch { return console.log("invalid packet", payload); }

                if (json.version !== version) {
                    ws.close(1000, "Your version does not match with the host!");
                } else if (json.act === "join") {
                    console.log(emitter.emit("playerJoin", {
                        ip: ws.data.ip,
                        id: ws.data.id,
                        socket: ws,
                        name: json.appearance.playerName
                    }, json));
                } else if (json.act === "keys") {
                    const game = playerGameMap.get(ws.data.id);
                    const clientIndex = game.ips.indexOf(ws.data.id);
                    if (clientIndex > -1) game.players[clientIndex].setKeys(json.keys);
                }
            }, // a message is received
            open(ws) {
                emitter.emit("playerConnect", {
                    socket: ws,
                    id: ws.data.id,
                    ip: ws.data.ip
                });
                // if (game.startState > 0) {
                //     if (game.startState === 8) {
                //         defaultGame = new Game("lan");
                //         console.log("reconstructed default game");
                //     }else {
                //         return ws.close(1000, "This game has already started!");
                //     }
                // }
                console.write(`\b\ba player by the id of ${ws.data.id} has joined!\n> `);
                ws.subscribe("game");
                clients.push(ws);
            }, // a socket is opened
            close(ws, code, message) {
                console.write(`\b\b${ws.data.name} left the game!\n> `);
                const game = playerGameMap.get(ws.data.id);
                if (!game) return;
                const clientIndex = game.ips.indexOf(ws.data.id);
                if (game.startState > 0) {
                    if(game?.players[clientIndex]?.connected)
                        game.players[clientIndex].connected = false;
                }else {
                    game.players[clientIndex] = null;
                    game.ips.splice(game.ips.indexOf(ws.data.id), 1);
                }
                playerGameMap.delete(ws.data.id);
                clients.splice(clients.indexOf(ws), 1);
            }, // a socket is closed
            drain(ws) {
                console.log("drain");
            }, // the socket is ready to receive more data
        },
        port: config.Server.port
    });
    setInterval(() => {
        frames++;

        clients.forEach((client) => {
            const game = playerGameMap.get(client.data.id);
            if (typeof game === "undefined") return;
            const clientIndex = game.ips.indexOf(client.data.id);
            client.send(JSON.stringify(game.export(clientIndex)), true);
        });
        gameUniques().forEach(v => v.update());
    }, 17);
    console.log(`super splash bros 3 dedicated server`);
    console.log(`initializing plugins`);

    for (const blob of embeddedFiles) {
        const plug = new BuiltInPlugin(blob, emitter, playerGameMap, banlist, gameUniques, clients, idIpMap);
        plugins.push(plug);
        // @ts-ignore
        plug.ready.then(_ => console.log(`detected plugin ${plug.id} (built in)${plug.enabled ? `` : ` (optional)`}`));
    }

    // for (
    //     // @ts-ignore
    //     const plugin of fs.readdirSync(join(import.meta.dirname, "builtInPlugins"))
    //     .filter(v => !process.argv
    //         .filter(a => a.startsWith("--disable:"))
    //         .map(v => v.replace(/^--disable:/, ""))
    //         .includes(v.replace(extname(v), ""))
    //     )
    //     // @ts-ignore
    //     .map(v => join(import.meta.dirname, "builtInPlugins", v))
    // ) {
    //     console.log(`initializing plugin: ${plugin} (built in)`);
    //     plugins.push(new Plugin(plugin, emitter, playerGameMap, banlist, gameUniques, clients, idIpMap));
    // }
    //
    // for (
    //     // @ts-ignore
    //     const plugin of fs.readdirSync(join(import.meta.dirname, "optionalBuiltInPlugins"))
    //     .filter(v => process.argv
    //         .filter(a => a.startsWith("--enable:"))
    //         .map(v => v.replace(/^--enable:/, ""))
    //         .includes(v.replace(extname(v), ""))
    //     )
    //     // @ts-ignore
    //     .map(v => join(import.meta.dirname, "optionalBuiltInPlugins", v))
    //     ) {
    //     console.log(`initializing plugin: ${plugin} (built in, optional)`);
    //     plugins.push(new Plugin(plugin, emitter, playerGameMap, banlist, gameUniques, clients, idIpMap));
    // }
    //
    if (fs.existsSync(join(cwd, "plugins"))) {
        for (
            // @ts-ignore
            const plugin of fs.readdirSync(join(process.cwd(), "plugins"))
            // @ts-ignore
            .map(v => join(process.cwd(), "plugins", v))
        ) {
            console.log(`initializing plugin: ${plugin}`);
            plugins.push(new Plugin(Bun.file(plugin), emitter, playerGameMap, banlist, gameUniques, clients, idIpMap));
        }
    }

    for (const plugin of process.argv
        .filter(v => v.startsWith("--load-plugin:"))
        .map(v => resolve(v.replace(/^--load-plugin:/, "")))
    ) {
        console.log(`initializing plugin: ${plugin}`);
        plugins.push(new Plugin(Bun.file(plugin), emitter, playerGameMap, banlist, gameUniques, clients, idIpMap));
    }

    await Promise.all(plugins.map(v => v.ready));

    for (const plugin of plugins) {
        let nowEnabled = false;
        let nowEnabledBy = "";
        let nowDisabled = false;
        let nowDisabledBy = "";
        for (const _plugin of [...plugins, {
            otherConfig: config,
            id: "User Config"
        }]) {
            if (_plugin.otherConfig[plugin.id]) {
                if (typeof _plugin.otherConfig[plugin.id].enabled !== "undefined") {
                    if (_plugin.otherConfig[plugin.id].enabled) {
                        if (nowDisabled) {
                            console.error(`Error: plugin "${_plugin.id}" is not compatible with plugin "${nowDisabledBy}"`);
                            process.exit(1);
                        }else {
                            nowEnabled = true;
                            plugin.enabled = true;
                        }
                    } else {
                        if (plugin.__is_Builtin) {
                            if (nowEnabled) {
                                console.error(`Error: plugin "${_plugin.id}" is not compatible with plugin "${nowEnabledBy}"`);
                                process.exit(1);
                            } else {
                                nowDisabled = true;
                                plugin.enabled = false;
                                nowDisabledBy = _plugin.id;
                            }
                        } else {
                            console.error(`Error: plugin "${plugin.id}" is not compatible with plugin "${_plugin.id}"`)
                            process.exit(1);
                        }
                    }
                }
                for (const otherConfigElementKey in _plugin.otherConfig[plugin.id]) {
                    plugin.config.set(otherConfigElementKey, _plugin.otherConfig[plugin.id][otherConfigElementKey]);
                }
            }
        }
        for (const otherConfigKey in plugin.otherConfig) {
            if (!plugins.find(p => p.id === otherConfigKey)) {
                console.error(`unmet dependency: "${otherConfigKey}" required by: "${plugin.id}"`);
                process.exit(1);
            }
        }
    }

    for (const plugin of plugins) {
        for (const defaultConfigKey in plugin.defaultConfig) {
            if (!plugin.config.has(defaultConfigKey)) {
                plugin.config.set(defaultConfigKey, plugin.defaultConfig[defaultConfigKey]);
            }
        }
    }

    emitter.on("stop", (msg, code) => {
        console.error(msg);
        for (const client of [...clients]) {
            client.close(1000, msg || "this server has stopped");
        }
        return setTimeout(process.exit, 10, code);
    });

    for (const plugin of plugins) {
        if (plugin.enabled) {
            plugin.init();
            console.log(
                Bun.color("lime", "ansi-16m") +
                `■ ${plugin.id}\x1b[0;0m`
            );
        }else {
            console.log(`□ ${plugin.id}`);
        }
    }
    setTimeout(emitter.emit.bind(emitter), 10, "init", server);
    // emitter.on("playerInitialized", p => {
    //     console.log(`initialized player: ${Bun.inspect(p)}`);
    // });

    console.write(`ready
join on port: ${config.Server.port}
> `);
    for await (const line of console) {
        emitter.emit("command", line, null);
        console.write(`> `);
    }
}

main();