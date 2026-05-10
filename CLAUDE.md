
A game engine on the server side hosts many simultanious games.

Client connections are upgraded to websockets.

When a client connects to the server you are asked for your name if you do not have one saved in session storage.

You then enter the lobby where you can see the ongoing games and how many are playing in each.

You click a game to enter that room

The game itself is a pixel art retro cowboy shoting game.

There is a lot of open space on the playing arena bit also some rocks and cactus that the players can hide behind.

The playes move arround using the arrow keys and can also control the angle of the arm (keys a and z) from plus 60 degrees up to minus 60 degrees down.

The players a represented using a round dot. The name apears under the player.

The angle of the arm pointing out to the side is just a line going from the center of the dot and extending a bit so you can see it.

The arm sould always point to the left or to the right side. Never above or below. 
When the player is moving right, the arm is to the right.
When the player is moving left the arm is to the left.
Up and down movement does not change the arm.

When pressing 'x' the gun is fired and a bullet is created that flies through the air. when it hits a rock it ricochets of and continues flying

when a bullet hits a cactus a piece of the cactus is removed where the bullet hit.  

Each player has 6 bullets

Players health decrease when hit by a bullet. (starts at 100%)

