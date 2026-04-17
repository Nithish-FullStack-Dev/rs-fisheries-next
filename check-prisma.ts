import prisma from "./lib/prisma";

async function main() {
  try {
    console.log("Checking prisma.agent...");
    if (prisma.agent) {
      console.log("prisma.agent is defined!");
      const count = await prisma.agent.count();
      console.log("Agent count:", count);
    } else {
      console.log("prisma.agent is UNDEFINED!");
      console.log("Available models:", Object.keys(prisma).filter(k => typeof (prisma as any)[k] === 'object'));
    }
  } catch (err) {
    console.error("Error checking prisma.agent:", err);
  } finally {
    process.exit();
  }
}

main();
