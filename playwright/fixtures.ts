import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

export const ADMIN_CODE = process.env.ADMIN_CODE || "admin123";
export const API_URL = "http://localhost:3002";

export interface TestGame {
  id: string;
  publicSlug: string;
  name: string;
}

export interface TestNode {
  id: string;
  nodeKey: string;
  title: string;
  isStart: boolean;
  isEnd: boolean;
  points: number;
}

export interface TestTeam {
  id: string;
  name: string;
  token: string;
  code: string;
}

// API helper class for setup/teardown
export class GameAPI {
  constructor(private request: APIRequestContext) {}

  async createGame(name: string, randomMode = true): Promise<TestGame> {
    // Generate unique slug from name + timestamp
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    const response = await this.request.post(`${API_URL}/api/v1/admin/games`, {
      headers: {
        "x-admin-code": ADMIN_CODE,
        "Content-Type": "application/json",
      },
      data: {
        name,
        publicSlug: slug,
        settings: {
          randomMode,
          scanCooldownMs: 0,
          timeBonusEnabled: false,
        },
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create game: ${await response.text()}`);
    }
    const data = await response.json();
    return data.game;
  }

  async createNode(
    gameId: string,
    data: {
      title: string;
      content?: string;
      isStart?: boolean;
      isEnd?: boolean;
      activated?: boolean;
      points?: number;
      hint?: string;
    }
  ): Promise<TestNode> {
    const response = await this.request.post(
      `${API_URL}/api/v1/admin/nodes`,
      {
        headers: {
          "x-admin-code": ADMIN_CODE,
          "Content-Type": "application/json",
        },
        data: {
          gameId,
          title: data.title,
          content: data.content || `Find the QR code for: ${data.title}`,
          isStart: data.isStart || false,
          isEnd: data.isEnd || false,
          activated: data.activated ?? true,
          points: data.points || 100,
          hint: data.hint || `Hint for ${data.title}`,
        },
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to create node: ${await response.text()}`);
    }
    const result = await response.json();
    return result.node;
  }

  async setGameStatus(gameId: string, status: "draft" | "pending" | "active" | "completed"): Promise<void> {
    const response = await this.request.patch(`${API_URL}/api/v1/admin/games/${gameId}`, {
      headers: {
        "x-admin-code": ADMIN_CODE,
        "Content-Type": "application/json",
      },
      data: { status },
    });

    if (!response.ok()) {
      throw new Error(`Failed to set game status: ${await response.text()}`);
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    await this.request.delete(`${API_URL}/api/v1/admin/games/${gameId}`, {
      headers: { "x-admin-code": ADMIN_CODE },
    });
  }

  async createTeam(gameId: string, name: string, code?: string): Promise<TestTeam> {
    const response = await this.request.post(`${API_URL}/api/v1/admin/teams`, {
      headers: {
        "x-admin-code": ADMIN_CODE,
        "Content-Type": "application/json",
      },
      data: {
        gameId,
        name,
        code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create team: ${await response.text()}`);
    }
    const data = await response.json();
    return {
      id: data.team.id,
      name: data.team.name,
      token: "", // Will be set after joining
      code: data.team.code,
    };
  }

  async joinTeam(gameSlug: string, teamCode: string): Promise<{ token: string; team: TestTeam }> {
    const response = await this.request.post(`${API_URL}/api/v1/auth/join`, {
      headers: { "Content-Type": "application/json" },
      data: { gameSlug, teamCode },
    });

    if (!response.ok()) {
      throw new Error(`Failed to join team: ${await response.text()}`);
    }
    const data = await response.json();
    return {
      token: data.token,
      team: {
        id: data.team.id,
        name: data.team.name,
        token: data.token,
        code: data.team.code,
      },
    };
  }

  async getNodeKeys(gameId: string): Promise<TestNode[]> {
    const response = await this.request.get(`${API_URL}/api/v1/admin/games/${gameId}/nodes`, {
      headers: { "x-admin-code": ADMIN_CODE },
    });
    if (!response.ok()) {
      throw new Error(`Failed to get nodes: ${await response.text()}`);
    }
    const data = await response.json();
    return data.nodes;
  }
}

// Page helper class for UI interactions
export class GamePage {
  constructor(private page: Page) {}

  async joinGame(gameSlug: string, teamName: string): Promise<void> {
    await this.page.goto(`/join?game=${gameSlug}`);
    await this.page.waitForLoadState("networkidle");

    // Fill team name
    await this.page.fill('input[name="teamName"]', teamName);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to play page
    await this.page.waitForURL(new RegExp(`/play/${gameSlug}`), { timeout: 15000 });
  }

  async waitForGameStart(): Promise<void> {
    // Wait for the game to start (waiting room to disappear)
    await this.page.waitForSelector(".waiting-room", { state: "hidden", timeout: 30000 }).catch(() => {
      // Game might already be active
    });
  }

  async enterQRCodeManually(nodeKey: string): Promise<void> {
    // Look for manual entry option or scan tab
    const scanTab = this.page.locator('button:has-text("Scan"), [data-tab="scan"]');
    if (await scanTab.isVisible()) {
      await scanTab.click();
    }

    // Try to find manual entry input
    const manualInput = this.page.locator('input[placeholder*="code"], input[name="nodeKey"], input[type="text"]').first();

    if (await manualInput.isVisible()) {
      await manualInput.fill(nodeKey);

      // Submit the code
      const submitBtn = this.page.locator('button:has-text("Submit"), button:has-text("Enter"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    } else {
      // Fallback: try URL navigation with nodeKey
      const currentUrl = this.page.url();
      await this.page.goto(`${currentUrl}?scan=${nodeKey}`);
    }

    // Wait for response
    await this.page.waitForTimeout(1000);
  }

  async scanNodeViaAPI(token: string, nodeKey: string): Promise<{ success: boolean; isGameComplete?: boolean; isWinner?: boolean }> {
    const response = await this.page.request.post(`${API_URL}/api/v1/scan`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { nodeKey },
    });

    return await response.json();
  }

  async getProgress(): Promise<{
    nodesFound: number;
    totalNodes: number;
    isFinished: boolean;
    isWinner: boolean;
    hasWinner: boolean;
  }> {
    // Get progress from the page state or API
    const token = await this.page.evaluate(() => {
      return localStorage.getItem("team_token") || sessionStorage.getItem("team_token");
    });

    if (token) {
      const response = await this.page.request.get(`${API_URL}/api/v1/scan/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await response.json();
    }

    return { nodesFound: 0, totalNodes: 0, isFinished: false, isWinner: false, hasWinner: false };
  }

  async isVictoryScreenVisible(): Promise<boolean> {
    const victorySelectors = [
      '.victory-screen',
      '[class*="victory"]',
      'text="Victory"',
      'text="Congratulations"',
      'text="You won"',
      'text="Winner"',
    ];

    for (const selector of victorySelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch {
        // Continue checking
      }
    }
    return false;
  }

  async isDefeatScreenVisible(): Promise<boolean> {
    const defeatSelectors = [
      '.defeat-screen',
      '[class*="defeat"]',
      'text="Game Over"',
      'text="Better luck"',
      'text="finished"',
    ];

    for (const selector of defeatSelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch {
        // Continue checking
      }
    }
    return false;
  }

  async clickTryAnother(): Promise<void> {
    const tryAnotherBtn = this.page.locator('button:has-text("Try another"), button:has-text("Shuffle"), button:has-text("New clue")');
    if (await tryAnotherBtn.isVisible()) {
      await tryAnotherBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async requestHint(): Promise<void> {
    const hintBtn = this.page.locator('button:has-text("Hint"), button:has-text("hint")');
    if (await hintBtn.isVisible()) {
      await hintBtn.click();

      // Confirm hint if dialog appears
      const confirmBtn = this.page.locator('button:has-text("Reveal"), button:has-text("Yes"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
      }
    }
  }
}

export const test = base;
export { expect };
