# TODO

## Sprint 19

## Sprint 20

## Sprint 21

## Backlog 
We want to introduce the concept of being  short of breath. Lets just call it energy . It should be shown as a secondary blue line right above the health indicator above the character.
Player starts with 100 - full line. 
The energy decreases when the player moves.
When energy reaches 0 You can not move. 
When you don't move the energy slowly increases.
There should be constants for RATE_OF_ENERGY_LOSS_PR_DISTANCE and RATE_OF_ENERGY_REGAIN_PR_TIME    

- There is a bug in the game. 
When you have added the Progressive Web App to the home screen and you are playing a game. 
If the phone goes to sleep/energy saving mode ( black screen ) and you wakes up again, then  the server connection is not restored and the player can not move. only move the arm will move


- When all players are dead everyone should return to the lobby. (If a sole player shoot him or her self)

- In game, Ammo should be in top left corner. can be part of HUD does not have to be canvas 
- When phone detected on landing page. Show suggestion to add page to home screen for better full screen experience. 
- Gun should also be part of collision geometry. Mussel should not poke through rock/cacti.
- In game. For some reason the sound for the first shot is lagging way more than the following shots
- When new players join the should be placed as far away for the other players as possible but 30px from the edge 
- Cacti should have one or two arms and variation in height

## Ideas / Maybes  
- Migrate client build from `tsc` to Vite for faster dev builds, HMR, and better bundling
- Lobby shows game type icons
- Use real artwork for character animation. vector or sprites
- Use real sounds for effects 
- Make overlay where user can read about the controls of the game.
- Should we have a walking sound?


