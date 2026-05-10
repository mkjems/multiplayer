# TODO

## Sprint 8

- Give the character momentum/inertia, Instead of instant stop/start, apply acceleration and friction. The dot slides a tiny bit when you release the key.
- Consider a dust cloud trailing behind the player when moving fast.
- Put client css in their own separate file 


## Backlog
- When new players join the should be placed as far away for the other players as possible but 30px from the edge  
- Gun should also be part of collision geometry. Mussel should not poke through rock/cacti.
- Bullet to rock collision detection is not always reliable.
- Cacti should have one or two arms and variation in height
- Rocks should be larger
- Players should not be able to move through other players (collision detection)


## Ideas / Maybes
- Lobby shows game type icons

## Pre Sprint 8 Brainstorm
- Spike, the way the character moves is a boring. How can we make it feel more alive. can we give it some velocity?
Answer:
"Movement feels boring — can we give it velocity/feel?"
Yes, absolutely — momentum/inertia would transform this. Instead of instant stop/start, apply acceleration and friction. The dot slides a tiny bit when you release the key. This alone makes it feel much more alive. Also consider a dust cloud trailing behind the player when moving fast.

- Spike, how to make playing arena bigger to match the users display?
Answer:
The canvas should simply fill the browser viewport and the server arena coordinates should scale proportionally client-side. The server doesn't need to change — just render with a scale factor based on window.innerWidth / arenaWidth. Add a resize event listener to recalculate.

- Spike, Can we make this work on a mobile phone with touch and no keyboard for input? 
Answer:
A virtual D-pad (4 arrows) in the bottom-left and a fire button bottom-right would cover 90% of gameplay. Arm angle could be a swipe/drag on the right side. It's doable but would be a meaningful sprint on its own.

- Spike, Should we use real animated sprites for the characters? 
Answer:
This is the highest-impact visual change but also the most expensive. My recommendation: skip full sprites for now, but significantly upgrade the dot. Give the player dot:
A cowboy hat shape drawn above it
A body silhouette (oval torso, legs that animate when moving)
Death animation: the hat flies off and the body crumples
This gives a "retro pixel art character" feel without needing a sprite sheet pipeline
