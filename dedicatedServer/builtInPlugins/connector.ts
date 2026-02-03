Server.on("playerJoin", async(player, json) => {
    await new Promise(resolve => setTimeout(resolve, 1));
    const game = playerGameMap.get(player.id);
    const join = game.join(json.appearance, player.id);
    if (join === -1) player.socket.close(1000, "That game is already full!");
    else {
        player.name = player.socket.data.name = json.appearance.playerName;
        console.write(`\b\b${json.appearance.playerName}(${player.ip}:${player.id}) has joined the game\n> `);
        player.socket.send(JSON.stringify({act: "join", index: join}))
    }
});