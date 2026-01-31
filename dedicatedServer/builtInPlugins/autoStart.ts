Server.on("playerInitialized", player => {
    console.log(`initializing player`);
    if (playerGameMap.has(player.id)) {
        const game = playerGameMap.get(player.id);
        console.log(config.get("fillTreshHold") - (
            1 - game.players.filter(Boolean).filter(v => v.ip === player.id).length
        ), game.players.filter(Boolean).length);
        if (game.players.filter(Boolean).length === config.get("fillTreshHold") - (
            1 - game.players.filter(Boolean).filter(v => v.ip === player.id).length
        )) {
            setTimeout(game.start.bind(game), 3000);
        }
    }else {
        console.error("player has not fully been initialized yet.");
    }
});