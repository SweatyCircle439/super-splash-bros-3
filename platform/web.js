const {generateName} = require("../app/class/game/Player");
const {version} = require("../package.json");
const events = {
    onQuitCheck: (quit) => {},
    onStart: (conf, ver, diskSpace, maxWidth, server) => {},
    onStatsList: (stats) => {}
};

let config = localStorage.getItem("config")? JSON.parse(localStorage.getItem("config")) : {
    appearance: {
        playerName: generateName(),
        preferredColor: Math.round(Math.random() * 8),
        powerup: Math.round(Math.random() * 8),
    },
    graphics: {
        theme: "daylight",
        fullScreen: false,
        waterFlow: true,
        menuSprites: true
    },
    controls: {
        moveLeft: "a",
        moveRight: "d",
        jump: "w",
        attack: " ",
        launchRocket: "e",
        activatePowerup: "q",
        gameMenu: "Escape"
    },
    audio: {
        music: true,
        sfx: true
    },
    misc: {
        recordReplays: false,
        tutorialPrompt: true,
    }
};

function web() {
    console.log("Web platform");
    let isFullscreen = false;

    /**
     * @type {string|null}
     */
    let server = null;
    /**
     * @type {string[]}
     */
    const argv = [];
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
        if (key === "server") {
            server = value;
        }else if (value) {
            argv.push(`--${key}=${value}`);
        }else {
            argv.push(`--${key}`);
        }
    }

    const port = 19189;

    const getIPs = () => {
        return ["192.168.1.0"];
    };

    const isValidIP = (ip) => {
        let error = 0;
        for (let i=0; i<ip.length; i++) {
            ip[i] = parseInt(ip[i]);
            if (isNaN(ip[i]) || ip[i] < 0 || ip[i] >= 255) error++;
        }
        return (error === 0);
    };

    document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
        console.log(events.onStart);
        events.onStart(config, version, 0, innerWidth, server);
        console.log("emitted start");
    }, 1000));

    window.addEventListener("beforeunload", e => {
        localStorage.setItem("config", JSON.stringify(config));
        let closed = false;
        events.onQuitCheck(() => closed = true);
        if (!closed) e.preventDefault();
    });

    return {
        network: {port, getIPs, isPortAvailable: () => false, isValidIP},
        isWeb: true,
        openTab: url => window.open(url, "_blank"),
        readClipboard: async() => {
            try {
                return await navigator.clipboard.readText();
            } catch (err) {
                console.error('Failed to read clipboard contents:', err);
                return "";
            }
        },
        showItemInFolder: (path) => undefined,
        Replay: null,
        events,
        updateConfig: (_config) => {
            config = _config;
            localStorage.setItem("config", JSON.stringify(config));
        },
        toggleFullscreen: () => {
            if (isFullscreen) {
                document.exitFullscreen();
                isFullscreen = false;
            }else {
                document.body.requestFullscreen();
            }
        },
        quit: () => window.close(),
        updateStats: (stats, pi) => {},
        argv: Promise.resolve(argv),
    }
}

module.exports = web();