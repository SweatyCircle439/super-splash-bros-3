Server.on("playerConnect", player => {
    let game: import("../../app/class/game/Game") = null;
    if (playerGameMap.has(player.id)) {
        game = playerGameMap.get(player.id);
    }
    if (!game) {
        game = gameUniques()
            .filter(v => v.players.filter(Boolean).length < config.get("maxPlayers"))
            .filter(v => v.startState <= 0)
            .sort((a, b) => a.players.filter(Boolean).length - b.players.filter(Boolean).length)[0];
        if (!game) {
            if (gameUniques().length < config.get("maxGames") || config.get("maxGames") === -1) {
                game = new Game("lan");
            }else {
                return player.socket.close(1000, "This server is already full!");
            }
        }
        playerGameMap.set(player.id, game);
        Server.emit("playerInitialized", player);
    }
    const clientIndex = game.ips.indexOf(player.id);

    if (clientIndex === -1 && banlist.includes(player.ip)) return player.socket.close(
        1000,
        "You have been banned from this game!"
    );
});