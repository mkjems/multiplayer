




THIS IS HOW THE GAME SHOULD BEHAVE
==================================

A game engine on the server side hosts many simultaneous games.

Client connections are upgraded to websockets.

When a client connects to the server you are asked for your name if you do not have one saved in session storage.

You then enter the lobby where you can see the ongoing games and how many are playing in each.

You click a game to enter that room

The game itself is a pixel art retro cowboy shooting game.

There is a lot of open space on the playing arena bit also some rocks and cactus that the players can hide behind.

Players can not move through cacti or rocks.

Payers will start on a empty lot where there are no rock or cacti or opponent.

The players move around using the arrow keys and can also control the angle of the arm (keys a and z) from plus 60 degrees up to minus 60 degrees down.

The players a represented using a round dot. The name appears under the player.

The rocks are represented by a solid grey shape made up of multiple (3-7) straight sides of varying length.  

The angle of the arm pointing out to the side is just a line going from the center of the dot and extending a bit so you can see it.

The arm should always point to the left or to the right side. Never above or below. 
When the player is moving right, the arm is to the right.
When the player is moving left the arm is to the left.
Up and down movement does not change the arm.

When pressing 'x' the gun is fired and a bullet is created that flies through the air. when it hits a rock it ricochets of and continues flying
The bullets should originate from the end of the 'gun' 

when a bullet hits a cactus a piece of the cactus is removed where the bullet hit.  

Each player has 6 bullets.

When gun in out of bullets you can reload by pressing r, takes 2 seconds.

Players health decrease when hit by a bullet. (starts at 100%)

When player health reaches 0 or below, player dies. 

When a player dies the colored dot fade slowly to gray and a dramatic dying sound is heard. 

A dead player is represented by smaller grey dot. A dead player can not move or shoot. 

If there is only one alive player in a room, and at least one or more dead players, then the game is over. After a small celebration of the winner, everybody in the room is returned to the lobby. They are now all free to join a room to play again.



