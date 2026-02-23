const network = require("../app/network");
const {shell, clipboard, ipcRenderer} = require("electron");

function preload() {
    console.log("native platform");
    console.log(ipcRenderer);

    if (ipcRenderer) {
        ipcRenderer.on("quit-check", () => {
            events.onQuitCheck(() => ipcRenderer.send("quit"));
        });

        ipcRenderer.on("start", (_, ...data) => {
            console.log(data, _);
            events.onStart(...data);
        });

        ipcRenderer.on("stats-list", (_, stats) => {
            events.onStatsList(stats);
        });
    }

    const events = {
        onQuitCheck: (quit) => {},
        onStart: (conf, ver, diskSpace, maxWidth, server) => {},
        onStatsList: (stats) => {}
    };

    return {
        network,
        isWeb: false,
        openTab: url => shell.openExternal(url),
        readClipboard: async() => clipboard.readText(),
        showItemInFolder: (path) => shell.showItemInFolder(path),
        Replay: require("../app/class/game/Replay"),
        events,
        updateConfig: (config) => ipcRenderer.send("update-config", config),
        toggleFullscreen: () => ipcRenderer.send("toggle-fullscreen"),
        quit: () => ipcRenderer.send("quit"),
        updateStats: (stats, pi) => ipcRenderer.send("update-stats", stats, pi),
    };
}

module.exports = preload();