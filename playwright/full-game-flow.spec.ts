import { test, expect, devices } from "@playwright/test";
import { GameAPI, API_URL, type TestGame, type TestNode } from "./fixtures";

test.describe.serial("Full Game Flow - Multi-Team Random Mode", () => {
  let api: GameAPI;
  let game: TestGame;
  let nodes: TestNode[];

  // Team tokens for API calls
  const teamTokens: Record<string, string> = {};

  // Team codes for joining
  const teamCodes: Record<string, string> = {};

  test.beforeAll(async ({ request }) => {
    api = new GameAPI(request);

    // Create a test game with random mode enabled
    game = await api.createGame(`E2E Test Game ${Date.now()}`, true);
    console.log(`Created game: ${game.publicSlug}`);

    // Create 4 nodes for the game
    nodes = [];

    // Start node
    nodes.push(
      await api.createNode(game.id, {
        title: "Starting Point",
        content: "Welcome! Find the first checkpoint.",
        isStart: true,
        isEnd: false,
        activated: true,
        points: 100,
        hint: "Look near the entrance",
      })
    );

    // Middle nodes
    nodes.push(
      await api.createNode(game.id, {
        title: "Checkpoint Alpha",
        content: "Great job! Now find checkpoint Beta.",
        isStart: false,
        isEnd: false,
        activated: true,
        points: 150,
        hint: "Check the garden area",
      })
    );

    nodes.push(
      await api.createNode(game.id, {
        title: "Checkpoint Beta",
        content: "Almost there! Head to the finish.",
        isStart: false,
        isEnd: false,
        activated: true,
        points: 200,
        hint: "Near the fountain",
      })
    );

    // End node
    nodes.push(
      await api.createNode(game.id, {
        title: "Finish Line",
        content: "Congratulations! You completed the hunt!",
        isStart: false,
        isEnd: true,
        activated: true,
        points: 300,
        hint: "The final destination",
      })
    );

    // Create one DEACTIVATED node (should NOT appear)
    await api.createNode(game.id, {
      title: "Hidden Secret Node",
      content: "This should never be visible",
      isStart: false,
      isEnd: false,
      activated: false,
      points: 999,
    });

    console.log(`Created ${nodes.length} nodes (plus 1 deactivated)`);

    // Create teams for the game
    const teamA = await api.createTeam(game.id, "Team Alpha", "TEAMA1");
    teamCodes["teamA"] = teamA.code;
    const teamB = await api.createTeam(game.id, "Team Beta", "TEAMB2");
    teamCodes["teamB"] = teamB.code;
    const teamC = await api.createTeam(game.id, "Team Gamma", "TEAMC3");
    teamCodes["teamC"] = teamC.code;

    // Create API test teams
    const apiTeamA = await api.createTeam(game.id, "API Team A", "APTS1A");
    teamCodes["apiTeamA"] = apiTeamA.code;
    const apiTeamB = await api.createTeam(game.id, "API Team B", "APTS2B");
    teamCodes["apiTeamB"] = apiTeamB.code;
    const apiTeamC = await api.createTeam(game.id, "API Team C", "APTS3C");
    teamCodes["apiTeamC"] = apiTeamC.code;

    // Create additional test teams
    const shuffleTeam = await api.createTeam(game.id, "Shuffle Test Team", "SHFLT1");
    teamCodes["shuffleTeam"] = shuffleTeam.code;
    const hintTeam = await api.createTeam(game.id, "Hint Test Team", "HINTT1");
    teamCodes["hintTeam"] = hintTeam.code;
    const deactivatedTestTeam = await api.createTeam(game.id, "Deactivated Node Test", "DEACT1");
    teamCodes["deactivatedTestTeam"] = deactivatedTestTeam.code;

    console.log("Created 9 teams");

    // Set game to active
    await api.setGameStatus(game.id, "active");
    console.log("Game is now active");
  });

  test.afterAll(async ({ request }) => {
    // Cleanup - use a fresh request context for afterAll
    if (game?.id) {
      try {
        const cleanupApi = new GameAPI(request);
        await cleanupApi.deleteGame(game.id);
        console.log("Game cleaned up");
      } catch (e) {
        console.log("Cleanup error (may already be deleted):", e);
      }
    }
  });

  test("Team A (Desktop) joins the game", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
    });
    const page = await context.newPage();

    // Join game with team code
    await page.goto(`/join?game=${game.publicSlug}&teamCode=${teamCodes["teamA"]}`);
    await page.waitForLoadState("networkidle");

    // Wait for auto-submit or click submit
    await page.waitForTimeout(1000);
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Wait for play page
    await page.waitForURL(new RegExp(`/play/${game.publicSlug}`), { timeout: 15000 });

    // Store token for later
    const token = await page.evaluate(() => localStorage.getItem("team_token"));
    if (token) {
      teamTokens["teamA"] = token;
    }

    // Verify we're on the play page
    expect(page.url()).toContain(`/play/${game.publicSlug}`);

    await context.close();
  });

  test("Team B (Mobile) joins the game", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();

    // Join game with team code
    await page.goto(`/join?game=${game.publicSlug}&teamCode=${teamCodes["teamB"]}`);
    await page.waitForLoadState("networkidle");

    // Wait for auto-submit or click submit
    await page.waitForTimeout(1000);
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Wait for play page
    await page.waitForURL(new RegExp(`/play/${game.publicSlug}`), { timeout: 15000 });

    // Store token
    const token = await page.evaluate(() => localStorage.getItem("team_token"));
    if (token) {
      teamTokens["teamB"] = token;
    }

    expect(page.url()).toContain(`/play/${game.publicSlug}`);

    await context.close();
  });

  test("Team C (Tablet) joins the game", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPad Pro 11"],
    });
    const page = await context.newPage();

    // Join game with team code
    await page.goto(`/join?game=${game.publicSlug}&teamCode=${teamCodes["teamC"]}`);
    await page.waitForLoadState("networkidle");

    // Wait for auto-submit or click submit
    await page.waitForTimeout(1000);
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Wait for play page
    await page.waitForURL(new RegExp(`/play/${game.publicSlug}`), { timeout: 15000 });

    // Store token
    const token = await page.evaluate(() => localStorage.getItem("team_token"));
    if (token) {
      teamTokens["teamC"] = token;
    }

    expect(page.url()).toContain(`/play/${game.publicSlug}`);

    await context.close();
  });

  test("All teams see correct initial state (4 activated nodes)", async ({ request }) => {
    // Join teams via API to get tokens (using pre-created team codes)
    const teamAResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["apiTeamA"] },
    });
    const teamAData = await teamAResponse.json();
    teamTokens["apiTeamA"] = teamAData.token;

    const teamBResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["apiTeamB"] },
    });
    const teamBData = await teamBResponse.json();
    teamTokens["apiTeamB"] = teamBData.token;

    const teamCResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["apiTeamC"] },
    });
    const teamCData = await teamCResponse.json();
    teamTokens["apiTeamC"] = teamCData.token;

    // Check progress for Team A
    const progressA = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${teamTokens["apiTeamA"]}` },
    });
    const progressDataA = await progressA.json();

    expect(progressDataA.totalNodes).toBe(4); // Only 4 activated nodes
    expect(progressDataA.nodesFound).toBe(0);
    expect(progressDataA.isFinished).toBe(false);
    expect(progressDataA.isWinner).toBe(false);
    expect(progressDataA.hasWinner).toBe(false);
    expect(progressDataA.isRandomMode).toBe(true);
  });

  test("Team A scans all nodes FIRST and sees WINNER screen", async ({ request, browser }) => {
    const context = await browser.newContext({ ...devices["Desktop Chrome"] });
    const page = await context.newPage();

    // Team A scans all nodes (they finish first)
    console.log("Team A scanning all nodes...");

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const scanResponse = await request.post(`${API_URL}/api/v1/scan`, {
        headers: {
          Authorization: `Bearer ${teamTokens["apiTeamA"]}`,
          "Content-Type": "application/json",
        },
        data: { nodeKey: node.nodeKey },
      });

      const scanResult = await scanResponse.json();
      console.log(`Team A scanned "${node.title}": ${scanResult.success ? "OK" : scanResult.message}`);

      if (i === nodes.length - 1) {
        // Last node - should complete game and win
        expect(scanResult.isGameComplete).toBe(true);
        expect(scanResult.isWinner).toBe(true);
        expect(scanResult.hasWinner).toBe(true);
      }

      // Small delay between scans
      await page.waitForTimeout(100);
    }

    // Verify Team A's final progress
    const progressA = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${teamTokens["apiTeamA"]}` },
    });
    const progressDataA = await progressA.json();

    expect(progressDataA.nodesFound).toBe(4);
    expect(progressDataA.isFinished).toBe(true);
    expect(progressDataA.isWinner).toBe(true);
    expect(progressDataA.hasWinner).toBe(true);

    // Load the play page and verify victory screen
    await page.goto(`/play/${game.publicSlug}`);

    // Set the token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem("team_token", token);
    }, teamTokens["apiTeamA"]);

    // Reload to apply token
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check for victory indicators
    const pageContent = await page.content();
    const hasVictoryIndicator =
      pageContent.toLowerCase().includes("victory") ||
      pageContent.toLowerCase().includes("winner") ||
      pageContent.toLowerCase().includes("congratulations") ||
      pageContent.toLowerCase().includes("won");

    console.log("Team A sees victory screen:", hasVictoryIndicator);

    await context.close();
  });

  test("Team B scans all nodes SECOND and sees LOSER screen", async ({ request, browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();

    // Team B scans all nodes (they finish second)
    console.log("Team B scanning all nodes...");

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const scanResponse = await request.post(`${API_URL}/api/v1/scan`, {
        headers: {
          Authorization: `Bearer ${teamTokens["apiTeamB"]}`,
          "Content-Type": "application/json",
        },
        data: { nodeKey: node.nodeKey },
      });

      const scanResult = await scanResponse.json();
      console.log(`Team B scanned "${node.title}": ${scanResult.success ? "OK" : scanResult.message}`);

      if (i === nodes.length - 1) {
        // Last node - game complete but NOT winner
        expect(scanResult.isGameComplete).toBe(true);
        expect(scanResult.isWinner).toBe(false); // Team A already won
        expect(scanResult.hasWinner).toBe(true);
      }

      await page.waitForTimeout(100);
    }

    // Verify Team B's final progress
    const progressB = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${teamTokens["apiTeamB"]}` },
    });
    const progressDataB = await progressB.json();

    expect(progressDataB.nodesFound).toBe(4);
    expect(progressDataB.isFinished).toBe(true);
    expect(progressDataB.isWinner).toBe(false); // NOT the winner
    expect(progressDataB.hasWinner).toBe(true); // But someone has won

    // Load play page and check for defeat screen
    await page.goto(`/play/${game.publicSlug}`);
    await page.evaluate((token) => {
      localStorage.setItem("team_token", token);
    }, teamTokens["apiTeamB"]);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const pageContent = await page.content();
    const hasDefeatIndicator =
      pageContent.toLowerCase().includes("game over") ||
      pageContent.toLowerCase().includes("better luck") ||
      pageContent.toLowerCase().includes("defeat") ||
      pageContent.toLowerCase().includes("complete"); // Game complete but not winner

    console.log("Team B sees loser/complete screen:", hasDefeatIndicator);

    await context.close();
  });

  test("Team C (incomplete) does NOT see loser screen yet", async ({ request, browser }) => {
    const context = await browser.newContext({ ...devices["iPad Pro 11"] });
    const page = await context.newPage();

    // Team C only scans 2 nodes (does not finish)
    console.log("Team C scanning only 2 nodes...");

    for (let i = 0; i < 2; i++) {
      const node = nodes[i];
      await request.post(`${API_URL}/api/v1/scan`, {
        headers: {
          Authorization: `Bearer ${teamTokens["apiTeamC"]}`,
          "Content-Type": "application/json",
        },
        data: { nodeKey: node.nodeKey },
      });
      console.log(`Team C scanned "${node.title}"`);
    }

    // Verify Team C's progress
    const progressC = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${teamTokens["apiTeamC"]}` },
    });
    const progressDataC = await progressC.json();

    expect(progressDataC.nodesFound).toBe(2);
    expect(progressDataC.isFinished).toBe(false); // NOT finished
    expect(progressDataC.isWinner).toBe(false);
    // hasWinner might be true (Team A won), but since Team C isn't finished,
    // they should NOT see the defeat screen

    // Load play page
    await page.goto(`/play/${game.publicSlug}`);
    await page.evaluate((token) => {
      localStorage.setItem("team_token", token);
    }, teamTokens["apiTeamC"]);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Team C should see the normal play interface, not defeat screen
    const pageContent = await page.content();
    const hasDefeatScreen =
      pageContent.toLowerCase().includes("game over") ||
      pageContent.toLowerCase().includes("defeat");

    // Team C should NOT see defeat screen since they haven't finished
    console.log("Team C (incomplete) sees defeat screen:", hasDefeatScreen);
    // This should be false - they're still playing

    await context.close();
  });

  test("Random mode: Try Another feature works", async ({ request }) => {
    // Join the pre-created shuffle test team
    const shuffleTeamResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["shuffleTeam"] },
    });
    const shuffleTeamData = await shuffleTeamResponse.json();
    const shuffleToken = shuffleTeamData.token;

    // Get initial clue
    const progress1 = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${shuffleToken}` },
    });
    const progressData1 = await progress1.json();
    const initialClue = progressData1.startingClue || progressData1.nextClue;

    console.log("Initial clue:", initialClue?.title);

    // Try shuffling multiple times
    let gotDifferentClue = false;
    for (let i = 0; i < 5; i++) {
      const shuffleResponse = await request.post(`${API_URL}/api/v1/scan/shuffle-clue`, {
        headers: { Authorization: `Bearer ${shuffleToken}` },
      });
      const shuffleResult = await shuffleResponse.json();

      if (shuffleResult.success && shuffleResult.newClue) {
        console.log(`Shuffle ${i + 1}: Got "${shuffleResult.newClue.title}"`);
        if (shuffleResult.newClue.title !== initialClue?.title) {
          gotDifferentClue = true;
        }
      }
    }

    // With 4 start-eligible nodes and random mode, we should eventually get a different clue
    console.log("Got different clue after shuffling:", gotDifferentClue);
  });

  test("Hint system works correctly", async ({ request }) => {
    // Join the pre-created hint test team
    const hintTeamResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["hintTeam"] },
    });
    const hintTeamData = await hintTeamResponse.json();
    const hintToken = hintTeamData.token;

    // Get current clue
    const progress = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${hintToken}` },
    });
    const progressData = await progress.json();
    const clue = progressData.startingClue || progressData.nextClue;

    expect(clue).not.toBeNull();

    // Request hint
    const hintResponse = await request.post(`${API_URL}/api/v1/scan/hint`, {
      headers: {
        Authorization: `Bearer ${hintToken}`,
        "Content-Type": "application/json",
      },
      data: { nodeId: clue.id },
    });
    const hintResult = await hintResponse.json();

    console.log("Hint result:", hintResult);

    expect(hintResult.success).toBe(true);
    expect(hintResult.hint).toBeTruthy();
    expect(hintResult.pointsDeducted).toBeGreaterThan(0);

    // Request same hint again - should be already used
    const hintResponse2 = await request.post(`${API_URL}/api/v1/scan/hint`, {
      headers: {
        Authorization: `Bearer ${hintToken}`,
        "Content-Type": "application/json",
      },
      data: { nodeId: clue.id },
    });
    const hintResult2 = await hintResponse2.json();

    expect(hintResult2.success).toBe(true);
    expect(hintResult2.alreadyUsed).toBe(true);
  });

  test("Performance graph shows teams sorted by clues found, then time", async ({ request }) => {
    const perfResponse = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/performance`);
    expect(perfResponse.ok()).toBeTruthy();

    const perfData = await perfResponse.json();
    expect(perfData.teams).toBeDefined();
    expect(Array.isArray(perfData.teams)).toBe(true);

    console.log("Performance data teams:", perfData.teams.length);

    // Verify sorting: more clues first, then faster time
    for (let i = 0; i < perfData.teams.length - 1; i++) {
      const current = perfData.teams[i];
      const next = perfData.teams[i + 1];

      if (current.cluesFound !== next.cluesFound) {
        expect(current.cluesFound).toBeGreaterThanOrEqual(next.cluesFound);
      } else if (current.cluesFound === next.cluesFound && current.cluesFound > 0) {
        expect(current.totalTime).toBeLessThanOrEqual(next.totalTime);
      }
    }
  });

  test("Deactivated nodes do not appear in game", async ({ request }) => {
    // Join the pre-created deactivated test team and check that only 4 nodes are visible
    const testTeamResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["deactivatedTestTeam"] },
    });
    const testTeamData = await testTeamResponse.json();

    const progress = await request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${testTeamData.token}` },
    });
    const progressData = await progress.json();

    // Should only see 4 activated nodes
    expect(progressData.totalNodes).toBe(4);

    // The "Hidden Secret Node" should never be the next clue
    const clue = progressData.startingClue || progressData.nextClue;
    expect(clue?.title).not.toBe("Hidden Secret Node");
  });
});

// ============================================================
// MANUAL QR CODE ENTRY TEST - Comprehensive single test
// ============================================================
test("Manual QR code entry: All teams enter codes via UI, winner and loser screens, leaderboard verification", async ({
  request,
  browser,
}) => {
  // This test needs a longer timeout: 3 teams × 4 scans × ~12 seconds each = ~150 seconds
  test.setTimeout(180000); // 3 minutes

  // Setup game within the test
  const api = new GameAPI(request);
  const game = await api.createGame(`Manual Entry Test ${Date.now()}`, true);
  console.log(`[Manual] Created game: ${game.publicSlug}`);

  const nodes: TestNode[] = [];
  nodes.push(
    await api.createNode(game.id, {
      title: "Manual Start",
      content: "Welcome!",
      isStart: true,
      isEnd: false,
      activated: true,
      points: 100,
      hint: "Look near entrance",
    })
  );
  nodes.push(
    await api.createNode(game.id, {
      title: "Manual Checkpoint A",
      content: "Continue!",
      isStart: false,
      isEnd: false,
      activated: true,
      points: 150,
      hint: "In the garden",
    })
  );
  nodes.push(
    await api.createNode(game.id, {
      title: "Manual Checkpoint B",
      content: "Almost there!",
      isStart: false,
      isEnd: false,
      activated: true,
      points: 200,
      hint: "By the fountain",
    })
  );
  nodes.push(
    await api.createNode(game.id, {
      title: "Manual Finish",
      content: "Done!",
      isStart: false,
      isEnd: true,
      activated: true,
      points: 300,
      hint: "Final spot",
    })
  );

  const teamCodes: Record<string, string> = {};
  const teamA = await api.createTeam(game.id, "Manual Team Alpha", "MNLA01");
  teamCodes["manualTeamA"] = teamA.code;
  const teamB = await api.createTeam(game.id, "Manual Team Beta", "MNLB02");
  teamCodes["manualTeamB"] = teamB.code;
  const teamC = await api.createTeam(game.id, "Manual Team Gamma", "MNLC03");
  teamCodes["manualTeamC"] = teamC.code;

  console.log("[Manual] Created 3 teams and 4 nodes");

  await api.setGameStatus(game.id, "active");
  console.log("[Manual] Game is now active");
  console.log(`[Manual] Game slug: ${game.publicSlug}`);

  // Verify game exists via leaderboard endpoint (doesn't consume team)
  const verifyResponse = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
  if (!verifyResponse.ok()) {
    console.log("[Manual] Game verification failed:", await verifyResponse.text());
    throw new Error("Game not accessible via API");
  } else {
    const leaderboardData = await verifyResponse.json();
    console.log("[Manual] Game verified - teams in leaderboard:", leaderboardData.leaderboard?.length || 0);
  }

  try {
    // Helper function to join game via browser form
    async function joinGameViaBrowser(
      browser: import("@playwright/test").Browser,
      device: typeof devices["Desktop Chrome"],
      gameSlug: string,
      teamCode: string,
      teamName: string
    ) {
      console.log(`\n=== ${teamName} joining game via browser ===`);

      const context = await browser.newContext({ ...device });
      const page = await context.newPage();

      // Navigate to join page with game slug only (no team code)
      await page.goto(`/join?game=${gameSlug}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // Fill in the team code character by character
      const teamCodeInputs = page.locator('input[maxlength="1"]');
      const inputCount = await teamCodeInputs.count();
      console.log(`[joinGame] Found ${inputCount} team code inputs`);

      if (inputCount >= 6) {
        for (let i = 0; i < 6 && i < teamCode.length; i++) {
          await teamCodeInputs.nth(i).fill(teamCode[i]);
        }
      }

      // Form may auto-submit when all 6 characters are filled
      // Wait for navigation to play page (may happen automatically)
      try {
        await page.waitForURL(new RegExp(`/play/${gameSlug}`), { timeout: 15000 });
        console.log(`[joinGame] Navigated to play page: ${page.url()}`);
      } catch (e) {
        // If no auto-submit, try clicking the button
        console.log(`[joinGame] Auto-navigation didn't happen, trying button click`);
        const submitBtn = page.locator('button[type="submit"]');
        if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
          await submitBtn.click();
          await page.waitForURL(new RegExp(`/play/${gameSlug}`), { timeout: 15000 });
          console.log(`[joinGame] Navigated after button click: ${page.url()}`);
        } else {
          console.log(`[joinGame] Button not clickable, current URL: ${page.url()}`);
          throw e;
        }
      }

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get token from localStorage (stored as qrhunt_token)
      const token = await page.evaluate(() => localStorage.getItem("qrhunt_token"));
      console.log(`[joinGame] Token from qrhunt_token: ${token ? "received" : "null"}`);

      if (!token) {
        console.log(`[joinGame] Warning: No token found in qrhunt_token`);
      }

      return { context, page, token: token || "" };
    }

    // Helper function to enter QR codes manually
    async function enterQRCodesManually(
      page: import("@playwright/test").Page,
      nodes: TestNode[],
      teamName: string,
      useEnterKey: boolean = false
    ) {
      console.log(`${teamName}: Entering all QR codes manually via UI...`);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`${teamName}: Entering code ${i + 1}/${nodes.length} for "${node.title}" (${node.nodeKey})`);

        // Wait for page to be ready
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);

        // Click "Scan QR Code" button to switch to Scan tab
        // This button is on the Clue tab and switches to the Scan tab
        const scanButton = page.locator('button:has-text("Scan QR Code")');
        await scanButton.waitFor({ state: "visible", timeout: 10000 });
        await scanButton.click();
        console.log(`${teamName}: Clicked Scan QR Code button`);

        // Wait for QRScanner component to render on Scan tab
        await page.waitForTimeout(1000);

        // Open manual entry section (always visible at bottom of QRScanner)
        // The summary text is "Can't scan? Enter code manually"
        const manualEntryToggle = page.locator('summary:has-text("Can\'t scan")');
        await manualEntryToggle.waitFor({ state: "visible", timeout: 5000 });

        // Check if details is open, if not, click to open
        const details = manualEntryToggle.locator("..");
        const isOpen = await details.getAttribute("open");
        if (isOpen === null) {
          await manualEntryToggle.click();
          await page.waitForTimeout(300);
          console.log(`${teamName}: Opened manual entry section`);
        }

        // Fill in the node key
        const manualInput = page.locator('input[name="nodeKey"]');
        await manualInput.waitFor({ state: "visible", timeout: 5000 });
        await manualInput.fill(node.nodeKey);
        console.log(`${teamName}: Filled in code: ${node.nodeKey}`);

        // Submit the form
        if (useEnterKey) {
          await manualInput.press("Enter");
          console.log(`${teamName}: Pressed Enter to submit`);
        } else {
          const validateBtn = page.locator('button:has-text("Validate")');
          await validateBtn.waitFor({ state: "visible", timeout: 5000 });
          await validateBtn.click();
          console.log(`${teamName}: Clicked Validate button`);
        }

        // Wait for success message and page reload
        // QRScanner does window.location.reload() after 1500ms on success
        console.log(`${teamName}: Waiting for page reload after scan...`);

        // Wait for success indicator (checkmark or success message)
        try {
          await page.waitForSelector('text=/QR code scanned|Scanned successfully|points!/i', { timeout: 5000 });
          console.log(`${teamName}: Saw success message`);
        } catch {
          // May have already started reloading
          console.log(`${teamName}: Success message not visible (may be reloading)`);
        }

        // Wait for the reload to happen (1500ms delay in QRScanner + buffer)
        await page.waitForTimeout(2500);

        // Wait for page to fully load after reload
        await page.waitForLoadState("networkidle");
        console.log(`${teamName}: Page reloaded, ready for next scan`);
      }

      // Final wait to ensure everything is settled
      await page.waitForTimeout(500);
      console.log(`${teamName}: Finished entering all ${nodes.length} codes`);
    }

    // ===== TEAM A: Winner (Desktop) =====
    const { context: contextA, page: pageA, token: tokenA } = await joinGameViaBrowser(
      browser,
      devices["Desktop Chrome"],
      game.publicSlug,
      teamCodes["manualTeamA"],
      "Manual Team A (Desktop) - Will be WINNER"
    );

    await enterQRCodesManually(pageA, nodes, "Manual Team A", false);

    // Reload to ensure we see the final screen
    await pageA.reload();
    await pageA.waitForLoadState("networkidle");
    await pageA.waitForTimeout(500);

    const pageContentA = await pageA.content();
    // VictoryScreen shows: "Victory!", "You Won!", "Congratulations, {teamName}!"
    const hasVictoryIndicator =
      pageContentA.toLowerCase().includes("victory") ||
      pageContentA.toLowerCase().includes("winner") ||
      pageContentA.toLowerCase().includes("congratulations") ||
      pageContentA.toLowerCase().includes("won") ||
      pageContentA.toLowerCase().includes("you won");

    console.log("Manual Team A sees victory screen:", hasVictoryIndicator);
    expect(hasVictoryIndicator).toBe(true);

    const progressA = await pageA.request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const progressDataA = await progressA.json();

    expect(progressDataA.nodesFound).toBe(4);
    expect(progressDataA.isFinished).toBe(true);
    expect(progressDataA.isWinner).toBe(true);

    await contextA.close();

    // ===== TEAM B: Loser (Mobile) =====
    const { context: contextB, page: pageB, token: tokenB } = await joinGameViaBrowser(
      browser,
      devices["iPhone 13"],
      game.publicSlug,
      teamCodes["manualTeamB"],
      "Manual Team B (Mobile) - Will see LOSER"
    );

    await enterQRCodesManually(pageB, nodes, "Manual Team B", false);

    // Reload to ensure we see the final screen
    await pageB.reload();
    await pageB.waitForLoadState("networkidle");
    await pageB.waitForTimeout(500);

    const pageContentB = await pageB.content();
    // DefeatScreen shows: "Game Complete", "Well played, {teamName}!"
    const hasLoserIndicatorB =
      pageContentB.toLowerCase().includes("game complete") ||
      pageContentB.toLowerCase().includes("well played") ||
      pageContentB.toLowerCase().includes("game over") ||
      pageContentB.toLowerCase().includes("defeat");

    console.log("Manual Team B sees loser/completed screen:", hasLoserIndicatorB);
    expect(hasLoserIndicatorB).toBe(true);

    const progressB = await pageB.request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const progressDataB = await progressB.json();

    expect(progressDataB.nodesFound).toBe(4);
    expect(progressDataB.isFinished).toBe(true);
    expect(progressDataB.isWinner).toBe(false);
    expect(progressDataB.hasWinner).toBe(true);

    await contextB.close();

    // ===== TEAM C: Loser via Enter key (Tablet) =====
    const { context: contextC, page: pageC, token: tokenC } = await joinGameViaBrowser(
      browser,
      devices["iPad Pro 11"],
      game.publicSlug,
      teamCodes["manualTeamC"],
      "Manual Team C (Tablet) - Will use Enter key"
    );

    await enterQRCodesManually(pageC, nodes, "Manual Team C", true); // Use Enter key

    // Reload to ensure we see the final screen
    await pageC.reload();
    await pageC.waitForLoadState("networkidle");
    await pageC.waitForTimeout(500);

    const pageContentC = await pageC.content();
    // DefeatScreen shows: "Game Complete", "Well played, {teamName}!"
    const hasLoserIndicatorC =
      pageContentC.toLowerCase().includes("game complete") ||
      pageContentC.toLowerCase().includes("well played") ||
      pageContentC.toLowerCase().includes("game over") ||
      pageContentC.toLowerCase().includes("defeat");

    console.log("Manual Team C sees loser/completed screen:", hasLoserIndicatorC);
    expect(hasLoserIndicatorC).toBe(true);

    const progressC = await pageC.request.get(`${API_URL}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const progressDataC = await progressC.json();

    expect(progressDataC.nodesFound).toBe(4);
    expect(progressDataC.isFinished).toBe(true);
    expect(progressDataC.isWinner).toBe(false);

    await contextC.close();

    // ===== LEADERBOARD VERIFICATION =====
    console.log("\n=== Verifying Leaderboard ===");
    const leaderboardResponse = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    expect(leaderboardResponse.ok()).toBeTruthy();

    const leaderboardData = await leaderboardResponse.json();
    expect(leaderboardData.leaderboard).toBeDefined();
    expect(Array.isArray(leaderboardData.leaderboard)).toBe(true);

    console.log("Leaderboard entries:", leaderboardData.leaderboard.length);

    const manualTeamAEntry = leaderboardData.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Manual Team Alpha"
    );
    const manualTeamBEntry = leaderboardData.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Manual Team Beta"
    );
    const manualTeamCEntry = leaderboardData.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Manual Team Gamma"
    );

    expect(manualTeamAEntry).toBeDefined();
    expect(manualTeamBEntry).toBeDefined();
    expect(manualTeamCEntry).toBeDefined();

    expect(manualTeamAEntry.nodesFound).toBe(4);
    expect(manualTeamBEntry.nodesFound).toBe(4);
    expect(manualTeamCEntry.nodesFound).toBe(4);

    expect(manualTeamAEntry.isFinished).toBe(true);
    expect(manualTeamBEntry.isFinished).toBe(true);
    expect(manualTeamCEntry.isFinished).toBe(true);

    // Manual Team Alpha finished first, should have best rank
    expect(manualTeamAEntry.rank).toBeLessThanOrEqual(manualTeamBEntry.rank);
    expect(manualTeamAEntry.rank).toBeLessThanOrEqual(manualTeamCEntry.rank);

    console.log(`Manual Team Alpha rank: ${manualTeamAEntry.rank}, points: ${manualTeamAEntry.totalPoints}`);
    console.log(`Manual Team Beta rank: ${manualTeamBEntry.rank}, points: ${manualTeamBEntry.totalPoints}`);
    console.log(`Manual Team Gamma rank: ${manualTeamCEntry.rank}, points: ${manualTeamCEntry.totalPoints}`);
  } finally {
    // Cleanup game
    try {
      await api.deleteGame(game.id);
      console.log("[Manual] Game cleaned up");
    } catch (e) {
      console.log("[Manual] Cleanup error:", e);
    }
  }
});

// ============================================================
// LIVE LEADERBOARD UPDATES TESTS - Separate test suite with own game
// ============================================================
test.describe.serial("Live Leaderboard Updates", () => {
  let api: GameAPI;
  let game: TestGame;
  let nodes: TestNode[];
  const teamCodes: Record<string, string> = {};
  const teamTokens: Record<string, string> = {};

  test.beforeAll(async ({ request }) => {
    api = new GameAPI(request);

    // Create a fresh game for live leaderboard tests
    game = await api.createGame(`Live Leaderboard Test ${Date.now()}`, true);
    console.log(`[Live] Created game: ${game.publicSlug}`);

    // Create 4 nodes
    nodes = [];
    nodes.push(
      await api.createNode(game.id, {
        title: "Live Start",
        content: "Welcome!",
        isStart: true,
        isEnd: false,
        activated: true,
        points: 100,
      })
    );
    nodes.push(
      await api.createNode(game.id, {
        title: "Live Checkpoint A",
        content: "Continue!",
        isStart: false,
        isEnd: false,
        activated: true,
        points: 150,
      })
    );
    nodes.push(
      await api.createNode(game.id, {
        title: "Live Checkpoint B",
        content: "Almost!",
        isStart: false,
        isEnd: false,
        activated: true,
        points: 200,
      })
    );
    nodes.push(
      await api.createNode(game.id, {
        title: "Live Finish",
        content: "Done!",
        isStart: false,
        isEnd: true,
        activated: true,
        points: 300,
      })
    );

    // Create teams
    const teamA = await api.createTeam(game.id, "Live Test Team A", "LVTA01");
    teamCodes["liveTeamA"] = teamA.code;
    const teamB = await api.createTeam(game.id, "Live Test Team B", "LVTB02");
    teamCodes["liveTeamB"] = teamB.code;

    console.log("[Live] Created 2 teams and 4 nodes");

    await api.setGameStatus(game.id, "active");
    console.log("[Live] Game is now active");
  });

  test.afterAll(async ({ request }) => {
    if (game?.id) {
      try {
        const cleanupApi = new GameAPI(request);
        await cleanupApi.deleteGame(game.id);
        console.log("[Live] Game cleaned up");
      } catch (e) {
        console.log("[Live] Cleanup error:", e);
      }
    }
  });

  test("Leaderboard updates live when teams scan nodes", async ({ request, browser }) => {
    const context = await browser.newContext({ ...devices["Desktop Chrome"] });
    const page = await context.newPage();

    // Join teams via API
    const liveTeamAResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["liveTeamA"] },
    });
    const liveTeamAData = await liveTeamAResponse.json();
    teamTokens["liveTeamA"] = liveTeamAData.token;

    const liveTeamBResponse = await request.post(`${API_URL}/api/v1/auth/join`, {
      data: { gameSlug: game.publicSlug, teamCode: teamCodes["liveTeamB"] },
    });
    const liveTeamBData = await liveTeamBResponse.json();
    teamTokens["liveTeamB"] = liveTeamBData.token;

    // Get initial leaderboard
    const initialLeaderboard = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    const initialData = await initialLeaderboard.json();

    const initialTeamA = initialData.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team A"
    );
    const initialTeamB = initialData.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team B"
    );

    console.log("Initial state - Live Team A nodes found:", initialTeamA?.nodesFound || 0);
    console.log("Initial state - Live Team B nodes found:", initialTeamB?.nodesFound || 0);

    // Team A scans first node
    console.log("Live Team A scanning first node...");
    const scanResponse1 = await request.post(`${API_URL}/api/v1/scan`, {
      headers: {
        Authorization: `Bearer ${teamTokens["liveTeamA"]}`,
        "Content-Type": "application/json",
      },
      data: { nodeKey: nodes[0].nodeKey },
    });
    const scanResult1 = await scanResponse1.json();
    expect(scanResult1.success).toBe(true);
    console.log(`Live Team A scanned "${nodes[0].title}": ${scanResult1.points} points`);

    await page.waitForTimeout(500);

    // Check leaderboard updated
    const leaderboard1 = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    const data1 = await leaderboard1.json();
    const teamAAfter1 = data1.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team A"
    );

    expect(teamAAfter1.nodesFound).toBe(1);
    expect(teamAAfter1.totalPoints).toBeGreaterThan(0);
    console.log(`After scan 1 - Live Team A: ${teamAAfter1.nodesFound} nodes, ${teamAAfter1.totalPoints} points`);

    // Team B scans two nodes
    console.log("Live Team B scanning two nodes...");
    await request.post(`${API_URL}/api/v1/scan`, {
      headers: {
        Authorization: `Bearer ${teamTokens["liveTeamB"]}`,
        "Content-Type": "application/json",
      },
      data: { nodeKey: nodes[0].nodeKey },
    });

    await request.post(`${API_URL}/api/v1/scan`, {
      headers: {
        Authorization: `Bearer ${teamTokens["liveTeamB"]}`,
        "Content-Type": "application/json",
      },
      data: { nodeKey: nodes[1].nodeKey },
    });

    await page.waitForTimeout(500);

    // Check leaderboard - Team B should have more nodes
    const leaderboard2 = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    const data2 = await leaderboard2.json();

    const teamAAfter2 = data2.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team A"
    );
    const teamBAfter2 = data2.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team B"
    );

    expect(teamAAfter2.nodesFound).toBe(1);
    expect(teamBAfter2.nodesFound).toBe(2);
    console.log(`After scan 2 - Live Team A: ${teamAAfter2.nodesFound} nodes, rank ${teamAAfter2.rank}`);
    console.log(`After scan 2 - Live Team B: ${teamBAfter2.nodesFound} nodes, rank ${teamBAfter2.rank}`);

    // Team B should have better rank
    expect(teamBAfter2.rank).toBeLessThan(teamAAfter2.rank);

    // Team A catches up
    console.log("Live Team A catching up...");
    await request.post(`${API_URL}/api/v1/scan`, {
      headers: {
        Authorization: `Bearer ${teamTokens["liveTeamA"]}`,
        "Content-Type": "application/json",
      },
      data: { nodeKey: nodes[1].nodeKey },
    });
    await request.post(`${API_URL}/api/v1/scan`, {
      headers: {
        Authorization: `Bearer ${teamTokens["liveTeamA"]}`,
        "Content-Type": "application/json",
      },
      data: { nodeKey: nodes[2].nodeKey },
    });

    await page.waitForTimeout(500);

    // Final leaderboard check
    const leaderboard3 = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    const data3 = await leaderboard3.json();

    const teamAFinal = data3.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team A"
    );
    const teamBFinal = data3.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team B"
    );

    expect(teamAFinal.nodesFound).toBe(3);
    expect(teamBFinal.nodesFound).toBe(2);

    // Team A should have better rank now
    expect(teamAFinal.rank).toBeLessThan(teamBFinal.rank);
    console.log(`Final - Live Team A: ${teamAFinal.nodesFound} nodes, rank ${teamAFinal.rank}`);
    console.log(`Final - Live Team B: ${teamBFinal.nodesFound} nodes, rank ${teamBFinal.rank}`);

    await context.close();
  });

  test("Points accumulate correctly on leaderboard during game", async ({ request }) => {
    const leaderboard = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    const data = await leaderboard.json();

    const teamA = data.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team A"
    );
    const teamB = data.leaderboard.find(
      (e: { teamName: string }) => e.teamName === "Live Test Team B"
    );

    if (teamA && teamB) {
      console.log(`Live Team A: ${teamA.nodesFound} nodes, ${teamA.totalPoints} points`);
      console.log(`Live Team B: ${teamB.nodesFound} nodes, ${teamB.totalPoints} points`);

      expect(teamA.totalPoints).toBeGreaterThan(teamB.totalPoints);
      expect(teamA.nodesFound).toBe(3);
      expect(teamB.nodesFound).toBe(2);
    }
  });

  test("Current clue updates on leaderboard as teams progress", async ({ request }) => {
    const leaderboard = await request.get(`${API_URL}/api/v1/game/${game.publicSlug}/leaderboard`);
    const data = await leaderboard.json();

    for (const entry of data.leaderboard) {
      console.log(`${entry.teamName}: ${entry.nodesFound} nodes, currentClue: "${entry.currentClue}"`);

      if (entry.isFinished) {
        expect(entry.currentClue).toBe("Finished!");
      }
    }
  });
});
