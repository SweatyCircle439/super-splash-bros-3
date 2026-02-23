import path from "path";
import fs from "fs";

if (fs.existsSync(path.join(__dirname, "dist"))) {
    // @ts-ignore type dec invalid
    fs.rmdirSync(path.join(__dirname, "dist"), { recursive: true, force: true });
}
fs.mkdirSync(path.join(__dirname, "dist"));
fs.copyFileSync(path.join(__dirname, "index.html"), path.join(__dirname, "dist/index.html"));

await Bun.build({
    entrypoints: [
        path.join(__dirname, '../app/preload/index.js'),
        path.join(__dirname, '../app/window/index.css')
    ],
    target: "browser",
    outdir: path.join(__dirname, 'dist'),
    external: ["@achingbrain/ssdp", "electron"],
    files: {
        [path.join(__dirname, "../app/preload/image.js")]: `
let n = "";
const image = {
    _getAspectRatio: (image) => image.height / image.width
};
${fs.readdirSync(path.join(__dirname, '../app/img/game'))
    .map(v => v.includes("~") || v.includes(".kra") || v.includes(".old") ? null : `
import ${v.replace(/\.[^/.]+$/, "")} from "${path.join(__dirname, '../app/img/game', v)}";
n = "${v.replace(/\.[^/.]+$/, "")}";

image[n] = new Image();
image[n].src = ${v.replace(/\.[^/.]+$/, "")};
`).filter(Boolean).join("\n")}
image.loadingPromise = Promise.all(Object.values(image).map(v => new Promise(resolve => {
    if (v instanceof Image) {
        v.onload = () => resolve(v);
        v.onerror = () => resolve(v);
    }else resolve(v);
})));
module.exports = image;`,
        [path.join(__dirname, "../app/preload/audio.js")]: `
const muted = {music: false, sfx: false};
const audio = {
    _running: [],
    _play: (file) => {
        const item = file.cloneNode(true);
        const index = audio._running.push(item) - 1;

        audio._running[index].muted = muted.sfx;
        audio._running[index].playbackRate = Math.random() * 0.5 + 0.75;
        audio._running[index].play();
        if (audio._running.length > 200) {
            for (let i=0; i<audio._running.length;) {
                if (audio._running[i].ended) audio._running.splice(i, 1);
                else i++;
            }
        }
    },
    _update: (config) => {
        muted.music = !config.music;
        muted.sfx = !config.sfx;

        audio.music.muted = muted.music;
        for (const item of audio._running) item.muted = muted.sfx;
    }
};
let n = "";
${fs.readdirSync(path.join(__dirname, '../app/audio'))
            .map(v => v.includes("~") || v.includes(".kra") || v.includes(".old") ? null : `
import ${v.replace(/\.[^/.]+$/, "")} from "${path.join(__dirname, '../app/audio', v)}";
n = "${v.replace(/\.[^/.]+$/, "")}";

audio[n] = new Audio(${v.replace(/\.[^/.]+$/, "")});
`).filter(Boolean).join("\n")}
module.exports = audio;`
    },
    sourcemap: "linked",
    format: "esm",
    minify: true,
    naming: {
        entry: '[name].[ext]',
        chunk: '[name]-[hash].[ext]',
        asset: '[name]-[hash].[ext]',
    },
});