import { initializeDatabase, closeDatabase } from "./database.js";
import { gameRepository } from "../domain/repositories/GameRepository.js";
import { nodeRepository } from "../domain/repositories/NodeRepository.js";
import { edgeRepository } from "../domain/repositories/EdgeRepository.js";
import { teamRepository } from "../domain/repositories/TeamRepository.js";
import { authService } from "../domain/services/AuthService.js";

async function seed() {
  console.log("Seeding database...");
  await initializeDatabase();

  // Create a demo game
  console.log("Creating demo game...");
  const game = gameRepository.create({
    name: "Demo Scavenger Hunt",
    publicSlug: "demo",
  });

  // Create nodes
  console.log("Creating nodes...");
  const startNode = nodeRepository.create({
    gameId: game.id,
    title: "Welcome to the Hunt!",
    content: "Your adventure begins here! Look for the first clue near the main entrance. The answer to continue is: ADVENTURE",
    isStart: true,
    points: 100,
    passwordRequired: true,
    passwordHash: authService.hashPassword("ADVENTURE"),
  });

  const node2 = nodeRepository.create({
    gameId: game.id,
    title: "The Library",
    content: "Great job finding this spot! Your next clue is hidden where knowledge lives. Look for the book about exploration. The code is: BOOKS",
    points: 150,
    passwordRequired: true,
    passwordHash: authService.hashPassword("BOOKS"),
  });

  const node3 = nodeRepository.create({
    gameId: game.id,
    title: "The Garden",
    content: "Nature holds many secrets. Find the fountain to discover your next destination.",
    contentType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800",
    points: 150,
  });

  const node4 = nodeRepository.create({
    gameId: game.id,
    title: "The Final Challenge",
    content: "Congratulations! You've made it to the final challenge. Scan this QR code to complete the hunt!",
    isEnd: true,
    points: 300,
  });

  // Create edges (path through the game)
  console.log("Creating edges...");
  edgeRepository.create({
    gameId: game.id,
    fromNodeId: startNode.id,
    toNodeId: node2.id,
  });

  edgeRepository.create({
    gameId: game.id,
    fromNodeId: node2.id,
    toNodeId: node3.id,
  });

  edgeRepository.create({
    gameId: game.id,
    fromNodeId: node3.id,
    toNodeId: node4.id,
  });

  // Create teams
  console.log("Creating teams...");
  const team1 = teamRepository.create({
    gameId: game.id,
    name: "Alpha Team",
    code: "ALPHA1",
  });

  const team2 = teamRepository.create({
    gameId: game.id,
    name: "Beta Team",
    code: "BETA22",
  });

  const team3 = teamRepository.create({
    gameId: game.id,
    name: "Gamma Team",
    code: "GAMMA3",
  });

  // Activate the game
  console.log("Activating game...");
  gameRepository.update(game.id, { status: "active" });

  console.log("\n=== Demo Game Created ===");
  console.log(`Game slug: ${game.publicSlug}`);
  console.log(`\nTeam codes:`);
  console.log(`  - Alpha Team: ${team1.code}`);
  console.log(`  - Beta Team: ${team2.code}`);
  console.log(`  - Gamma Team: ${team3.code}`);
  console.log(`\nNode keys (for QR codes):`);
  console.log(`  - Start: ${startNode.nodeKey}`);
  console.log(`  - Library: ${node2.nodeKey}`);
  console.log(`  - Garden: ${node3.nodeKey}`);
  console.log(`  - Final: ${node4.nodeKey}`);
  console.log(`\nAdmin code: ${process.env.ADMIN_CODE || "admin123"}`);
  console.log("\nSeeding complete!");

  closeDatabase();
}

seed().catch(console.error);
