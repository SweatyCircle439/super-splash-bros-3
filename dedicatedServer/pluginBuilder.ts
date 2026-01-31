import path from "path";
import * as z from "zod";

const pluginScheme = z.object({
    Plugin: z.object({
        id: z.string(),
        description: z.string().optional(),
        main: z.string(),
    }),
    Config: z.any()
});

const tomlLocation = path.resolve(process.argv.pop());
const tomlFile = await Bun.file(tomlLocation).text();
const conf = pluginScheme.parse(
    Bun.TOML.parse(tomlFile)
);
console.log("building", conf.Plugin.id);
const archive = await new Bun.Archive({
    "plugin.toml": tomlFile,
    "plugin.js": await (await Bun.build({
        format: "cjs",
        target: "node",
        entrypoints: [path.join(tomlLocation, "..", conf.Plugin.main)],
    })).outputs[0].text(),
}, {compress: "gzip"}).blob();
await Bun.write(`plugins/${conf.Plugin.id}.SSB3Plugin.gz`, archive);