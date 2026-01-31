Server.on("command", async (command, emi) => {
    switch (command.split(" ")[0]) {
        case "start":
            let count = 0;
            gameUniques()
                .filter(v => v.players.filter(Boolean).length >= 2)
                .forEach((game) => {
                    count++;
                    game.start();
                });
            console.log(`started a total of ${count}/${gameUniques().length} games`);
            break;
        case "iban":
            banlist.push(command.split(" ")[1]);
            console.log(`${command.split(" ")[1]} is now banned`);
            break;
        case "ban":
            const ip = clients.find(c => c.data.name === command.split(" ")[1]).data.ip;
            Server.emit("command", `ban ${ip}`, emi);
            break;
        case "unban":
            // console.log(defaultGame.blacklist);
            // console.log(command.split(" ")[1]);
            // console.log(defaultGame.blacklist.indexOf);
            // console.log(defaultGame.blacklist.indexOf(command.split(" ")[1]));
            banlist.splice(
                banlist.indexOf(command.split(" ")[1]),
                1
            );
            console.log(`${command.split(" ")[1]} is no longer banned`);
            break;
        case "stop":
            return Server.emit("stop", "this server has stopped");
        case "theme":
            for (const game of gameUniques()) {
                game.theme = command.split(" ")[1];
            }
            break;
        default:
            console.error(`Unknown command "${command.split(" ")[0]}"`);
            console.write("> ");
            break;
    }
})