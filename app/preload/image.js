/**
 * @callback AspectRatioCallback
 * @param {HTMLImageElement} image
 * @returns {number}
 */

const { join } = require("path");
const { readdirSync } = require("fs");

/**
 * @type {{
 *  buttons: HTMLImageElement,
 *  disconnected: HTMLImageElement,
 *  eliminated: HTMLImageElement,
 *  explosion: HTMLImageElement,
 *  fish: HTMLImageElement,
 *  logo: HTMLImageElement,
 *  logo_nmgames: HTMLImageElement,
 *  platforms: HTMLImageElement,
 *  poopbomb: HTMLImageElement,
 *  splash: HTMLImageElement,
 *  sprites: HTMLImageElement,
 *  stars: HTMLImageElement,
 *  powerups: HTMLImageElement,
 *  water: HTMLImageElement,
 *  supply: HTMLImageElement,
 *  parachute: HTMLImageElement,
 *  _getAspectRatio: AspectRatioCallback,
 *  loadingPromise: Promise<any>,
 * }}
 */
const image = {
    _getAspectRatio: (image) => image.height / image.width
};

readdirSync(join(__dirname, "..", "img", "game")).forEach((file) => {
    const name = file.replace(/\.[^/.]+$/, "");

    if (!name.startsWith("_")) {
        image[name] = new Image();
        image[name].src = join(__dirname, "..", "img", "game", file);
    }
});

image.loadingPromise = Promise.all(Object.values(image).map(v => new Promise(resolve => {
    if (v instanceof Image) {
        v.onload = () => resolve(v);
        v.onerror = () => resolve(v);
    }else resolve(v);
})));

module.exports = image;
