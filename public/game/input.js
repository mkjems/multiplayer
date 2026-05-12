// ═════════════════════════════════════════════════════════════════════════════
// Input Handling
// ═════════════════════════════════════════════════════════════════════════════
import { requireElement } from "./utils.js";
/**
 * Sets up keyboard input handlers and sends player commands to server.
 *
 * @param {object} network - Network manager
 * @param {object} sounds - Sound manager
 * @param {object} gameState - Game state object
 * @param {object} constants - Game constants
 */
export function setupInputHandler(network, sounds, gameState, constants) {
    const keys = new Set();
    let lastMove = { dx: 0, dy: 0 };
    let lastAngleSent = 0;
    let touchMoveActive = false;
    const muteBtn = requireElement("mute-btn");
    // Handle key presses
    const onKeyDown = (e) => {
        const k = e.key.toLowerCase();
        keys.add(k);
        if (k === "x") {
            const me = gameState.getLocalPlayer();
            if (me && me.alive) {
                network.send({ type: "shoot" });
                if (me.ammo <= 0) {
                    sounds.playReload();
                }
                else {
                    sounds.playShoot();
                }
            }
        }
        if (k === "r") {
            // Reload
            network.send({ type: "reload" });
            sounds.playReload();
        }
    };
    const onKeyUp = (e) => {
        keys.delete(e.key.toLowerCase());
    };
    // Mute button
    const onMuteClick = () => {
        muteBtn.textContent = sounds.toggleMute() ? "🔇" : "🔊";
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    muteBtn.addEventListener("click", onMuteClick);
    // Called once per frame to process input and send to server
    function processInput() {
        if (!touchMoveActive) {
            const dx = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
            const dy = (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0);
            if (dx !== lastMove.dx || dy !== lastMove.dy) {
                lastMove = { dx, dy };
                network.send({ type: "move", dx, dy });
            }
            if (dx > 0)
                gameState.localFacing = "right";
            else if (dx < 0)
                gameState.localFacing = "left";
        }
        // Handle arm angle adjustment (A/Z keys)
        const { armMax } = gameState.arenaConfig;
        let angleChanged = false;
        if (keys.has("a")) {
            gameState.localArmAngle = Math.min(armMax, gameState.localArmAngle + constants.ARM_STEP);
            angleChanged = true;
        }
        if (keys.has("z")) {
            gameState.localArmAngle = Math.max(-armMax, gameState.localArmAngle - constants.ARM_STEP);
            angleChanged = true;
        }
        // Send arm angle if changed (throttled to ~40ms)
        if (angleChanged && Date.now() - lastAngleSent > 40) {
            lastAngleSent = Date.now();
            network.send({ type: "arm_angle", angle: gameState.localArmAngle });
        }
    }
    function dispose() {
        keys.clear();
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
        muteBtn.removeEventListener("click", onMuteClick);
    }
    function setTouchMove(dx, dy) {
        touchMoveActive = true;
        if (dx > 0)
            gameState.localFacing = "right";
        else if (dx < 0)
            gameState.localFacing = "left";
        if (dx !== lastMove.dx || dy !== lastMove.dy) {
            lastMove = { dx, dy };
            network.send({ type: "move", dx, dy });
        }
    }
    function clearTouchMove() {
        touchMoveActive = false;
        if (lastMove.dx !== 0 || lastMove.dy !== 0) {
            lastMove = { dx: 0, dy: 0 };
            network.send({ type: "move", dx: 0, dy: 0 });
        }
    }
    function setTouchArmAngle(angle) {
        const { armMax } = gameState.arenaConfig;
        gameState.localArmAngle = Math.max(-armMax, Math.min(armMax, angle));
        if (Date.now() - lastAngleSent > 40) {
            lastAngleSent = Date.now();
            network.send({ type: "arm_angle", angle: gameState.localArmAngle });
        }
    }
    function fireTouchShoot() {
        const me = gameState.getLocalPlayer();
        if (me && me.alive) {
            network.send({ type: "shoot" });
            if (me.ammo <= 0) {
                sounds.playReload();
            }
            else {
                sounds.playShoot();
            }
        }
    }
    function fireTouchReload() {
        network.send({ type: "reload" });
        sounds.playReload();
    }
    return {
        processInput,
        dispose,
        setTouchMove,
        clearTouchMove,
        setTouchArmAngle,
        fireTouchShoot,
        fireTouchReload,
    };
}
