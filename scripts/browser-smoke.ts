import { type Browser, chromium, type Page } from "playwright";

const defaultBaseUrl = "http://localhost:8000";
const serverStartupTimeoutMilliseconds = 60000;
const canvasTimeoutMilliseconds = 10000;

interface StartedServer {
  process: Deno.ChildProcess;
  baseUrl: string;
}

async function isServerReachable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl: string): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < serverStartupTimeoutMilliseconds) {
    if (await isServerReachable(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Server did not become reachable at ${baseUrl}`);
}

async function startServerIfNeeded(): Promise<StartedServer | null> {
  const baseUrl = Deno.env.get("BASE_URL") ?? defaultBaseUrl;
  if (await isServerReachable(baseUrl)) return null;

  const command = new Deno.Command("deno", {
    args: ["task", "start"],
    cwd: Deno.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });
  const process = command.spawn();

  try {
    await waitForServer(baseUrl);
  } catch (error) {
    process.kill("SIGTERM");
    await process.status;
    throw error;
  }

  return { process, baseUrl };
}

async function assertCanvasHasPixels(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) return false;
      if (canvas.width === 0 || canvas.height === 0) return false;

      const context = canvas.getContext("2d");
      if (!context) return false;

      const width = Math.min(canvas.width, 64);
      const height = Math.min(canvas.height, 64);
      const pixels = context.getImageData(0, 0, width, height).data;

      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] !== 0) return true;
      }

      return false;
    },
    undefined,
    { timeout: canvasTimeoutMilliseconds },
  );
}

async function assertRoomIsClean(
  baseUrl: string,
  roomId: string,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < canvasTimeoutMilliseconds) {
    const response = await fetch(`${baseUrl}/api/diagnostics/rooms`, {
      cache: "no-store",
    });
    const diagnostics = await response.json() as {
      rooms: { id: string; playerCount: number; socketCount: number }[];
    };
    const room = diagnostics.rooms.find((candidate) => candidate.id === roomId);

    if (room?.playerCount === 0 && room.socketCount === 0) return;

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Room ${roomId} still has players or sockets after cleanup`);
}

async function runSmokeFlow(page: Page, baseUrl: string): Promise<void> {
  await page.goto(baseUrl);
  await page.getByLabel("Your name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Enter Lobby" }).click();
  await page.waitForURL(`${baseUrl}/lobby`);

  await page.getByRole("button", { name: /Dot Arena/i }).click();
  await page.waitForURL(`${baseUrl}/game/dots`);
  await assertCanvasHasPixels(page);

  await page.getByRole("button", { name: "Back to lobby" }).click();
  await page.waitForURL(`${baseUrl}/lobby`);

  await page.goto(`${baseUrl}/game/dots`);
  await assertCanvasHasPixels(page);
  await page.reload();
  await assertCanvasHasPixels(page);

  await page.goto(`${baseUrl}/diagnostics`);
  await page.getByRole("heading", { name: "Room Performance" }).waitFor();
  await page.getByRole("heading", { name: "Rooms" }).waitFor();
  await assertRoomIsClean(baseUrl, "dots");
}

async function main(): Promise<void> {
  const startedServer = await startServerIfNeeded();
  const baseUrl = Deno.env.get("BASE_URL") ?? startedServer?.baseUrl ??
    defaultBaseUrl;
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    await runSmokeFlow(page, baseUrl);
    console.log("Browser smoke test passed");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Executable doesn't exist")
    ) {
      throw new Error(
        "Playwright browser binary is missing. Run: deno run -A npm:playwright install chromium",
      );
    }
    throw error;
  } finally {
    await browser?.close();
    startedServer?.process.kill("SIGTERM");
  }
}

await main();
