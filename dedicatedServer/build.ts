import { Glob } from "bun";
import path from "path";
import * as z from "zod";

const glob = new Glob("**/*.toml");

const builtInScheme = z.object({
    Plugin: z.object({
        id: z.string(),
        description: z.string().optional(),
        main: z.string()
    }),
    BuiltIn: z.object({
        "default": z.boolean()
    }),
    Config: z.any()
});

const fmap = new Map<string, Blob>(
    await Promise.all(Array.from(glob.scanSync(path.join(import.meta.dirname, "builtInPlugins")))
        .map(async v => {
            const tomlLocation = path.join(import.meta.dirname, "builtInPlugins", v);
            const tomlFile = await Bun.file(tomlLocation).text();
            const conf = builtInScheme.parse(
                Bun.TOML.parse(tomlFile)
            );
            console.log("building", conf.Plugin.id);
            const archive = await new Bun.Archive({
                "plugin.toml": tomlFile,
                "plugin.js": await (await Bun.build({
                    entrypoints: [path.join(tomlLocation, "..", conf.Plugin.main)],
                    target: "node",
                    format: "cjs"
                })).outputs[0].text(),
            }, {compress: "gzip"}).blob();
            await Bun.write(path.join(import.meta.dirname, `dist/${conf.Plugin.id}.SSB3Plugin.gz`), archive);
            return [`${conf.Plugin.id}.SSB3Plugin.gz`, archive];
        })) as [string, Blob][]
);

console.log(Object.fromEntries(fmap));

await Bun.build({
    target: "bun",
    entrypoints: [path.join(import.meta.dirname, "index.ts"), ...Array.from(fmap.keys())],
    files: Object.fromEntries(fmap),
    compile: {
        outfile: path.join(import.meta.dirname, "out"),
    },
    sourcemap: "inline",
    minify: true,
    bytecode: true
});