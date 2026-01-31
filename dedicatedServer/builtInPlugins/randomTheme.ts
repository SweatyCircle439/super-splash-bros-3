Server.on("playerInitialized", player => {
    if (playerGameMap.has(player.id)) {
        const game = playerGameMap.get(player.id);
        if (game.players.filter(Boolean).length === 0) {
            game.theme = config.get("allowThemes")[Math.floor(Math.random() * config.get("allowThemes").length)];
        }
    }else {
        console.error("player has not fully been initialized yet.");
    }
});