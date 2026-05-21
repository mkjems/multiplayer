# TODO

## Sprint 38
- Sprint Goal: Split true global CSS concerns out of `src/client/app/app.css` so future styling work has an obvious home.
- [x] Create `src/client/app/styles/` for global CSS files.
- [x] Move reset rules into `src/client/app/styles/reset.css`.
- [x] Move `:root` design tokens into `src/client/app/styles/tokens.css`.
- [x] Move document-level defaults such as `body` and global link styling into `src/client/app/styles/base.css`.
- [x] Update `src/client/app/main.tsx` to import the new global CSS files explicitly.
- [x] Keep `src/client/touch-controls.css` global until the touch controls ownership is reviewed.
- [x] Run the app and verify landing, lobby, game, diagnostics, and touch controls still receive their expected base styles.

## Sprint 39
- Sprint Goal: Make route-level styles statically discoverable from the React files that use them.
- [x] Create `LandingRoute.module.css` beside `LandingRoute.tsx`.
- [x] Move landing page and name-entry card styles out of `app.css`.
- [x] Create `LobbyRoute.module.css` beside `LobbyRoute.tsx`.
- [x] Move lobby layout styles out of `app.css`.
- [x] Create `GameRoute.module.css` beside `GameRoute.tsx`.
- [x] Move game page, canvas, nav, HUD, ammo, status banner, and winner overlay styles out of `app.css`.
- [x] Create `DiagnosticsRoute.module.css` beside `DiagnosticsRoute.tsx`.
- [x] Move diagnostics page layout styles out of `app.css`.
- [x] Update route components to import module styles and replace string class names with typed `styles.className` references.
- [x] Preserve kebab-case CSS class names where plain global CSS remains; use camelCase module properties in TypeScript where CSS Modules are introduced.

## Sprint 40
- Sprint Goal: Keep reusable component styling local to the component that owns it.
- [x] Create `HomeScreenSuggestion.module.css` beside `HomeScreenSuggestion.tsx`.
- [x] Move home-screen suggestion and dismiss button styles out of `app.css`.
- [x] Create CSS modules for lobby components where ownership is clear, such as `KeyboardControls`, `GamesList`, and `GameCard`.
- [x] Move keyboard control, game list, game card, status dot, and player count styles into their component modules.
- [x] Create CSS modules for diagnostics child components where ownership is clear, such as `DiagnosticsSummary`, `DiagnosticsRoomCard`, and `SparkLine`.
- [x] Move diagnostics tile, room card, metric, graph, bar, and sparkline styles into their component modules.
- [x] Keep intentionally shared component styles in a small shared CSS module or global shared file only when more than one component genuinely owns the same visual pattern.

## Sprint 41
- Sprint Goal: Make `app.css` unnecessary or reduce it to a tiny compatibility file.
- [x] Search the client app for remaining string class names that still depend on `app.css`.
- [x] Move any remaining route or component-specific selectors to the owning module.
- [x] Delete empty or obsolete selectors from `app.css`.
- [x] Remove the `app.css` import from `main.tsx` when all styles have clear new owners.
- [x] Verify there are no unused CSS module imports or unused global selectors.
- [x] Run type checking and the existing test suite.

## Sprint 42
- Sprint Goal: Improve maintainability without changing the visual design.
- [x] Replace hardcoded colors in moved CSS with descriptively named variables from `tokens.css`.
- [x] Add missing design tokens for repeated shadows, borders, spacing, and status colors when the names are clear.
- [x] Remove duplicate declarations introduced during the split.
- [x] Confirm responsive rules live with the components or routes they affect.
- [x] Check that CSS module imports preserve IDE navigation and rename support in TypeScript.
- [x] Do a browser pass across desktop and mobile widths for landing, lobby, game, diagnostics, and the parked parallax component if it is rendered anywhere.

## Backlog 
- The arena should have a background of tiles the 
- Show the ammo under the character.
- Show a list of names of the players currently in the lobby.
- When you get low energy (<20%) you should start to move more slowly and the speed should decrease as you loose more energy. But even if you have 0% you should still be able to move very slowly.
- Integrate chatGPT API to do experiments.
- Switch to a sprite for the player character.
- Create a deo task that runs a  Playwright test that clicks trough the site and takes screenshots along the way and saves it. This way the agent can see what it is doing.


## Boring Bugs
- Why is there a lag when you are moving the character with the keyboard?
- Performance bug: Stale game_over timeout may fire after a room resets.
  - Store pending game_over timeout ids per room.
  - Cancel them when a room becomes empty or restarts.
  - Verify new players cannot receive an old winner message.
- Bug. When you have added the Progressive Web App to the home screen and you are playing a game. 
    If the phone goes to sleep/energy saving mode ( black screen ) and you wakes up again, then  the server connection is not restored and the player can not move. only move the arm will move
- When all players are dead everyone should return to the lobby. (If a sole player shoot him or her self)
- Gun should also be part of collision geometry. Mussel should not poke through rock/cacti.
- In game. For some reason the sound for the first shot is lagging way more than the following shots

## Ideas / Maybes  
- Have a random Tank that passes through the arena and shoots like a crazy person 
- Health pills that can be found that restore player health
- Steroids pills that can be found that give more energy for a period of time.
- Make it easier to change the name of your character

- Make it possible to draw your own character. Allow upload of an image of a child's drawing, send the drawing to chatGPT and ask it to make a sprite sheet from it.
    post process the sprites to make sure it is transparent and the right size. Then use that sprite for the character.
    Created sprites should be saved for reuse.
- Make it possible to type messages to other players while playing. text should appear in small cartoon like bubbles above the character.
- Option to not shoot bullets but instead shoot hearts that heal those hit.  

- First sound is always a bit lagging. Can we fix that? Sound we have a short game intro melody?
- Cacti should have one or two arms and variation in height
- Use real sounds for effects 
- Make overlay where user can read about the controls of the game.
- Should we have a walking sound?
- When new players join character should be placed as far away for the other players as possible but 30px from the edge 

- Make the diagnostics graphs bigger and have lines and numbers on the x and y axis.   

- Do we need a router for our server or is it more performant without one?
