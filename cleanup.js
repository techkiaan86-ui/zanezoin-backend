import prisma from './src/config/db.js';

async function main() {
  try {
    // Delete the dummy orders that were auto-created
    const ordersToDelete = [558, 559, 560, 561, 562];
    await prisma.order.deleteMany({
      where: { id: { in: ordersToDelete } }
    });
    console.log("Deleted dummy orders:", ordersToDelete);

    // Reset 557 status to 'logistics' so it can be deployed fresh
    await prisma.order.updateMany({
      where: { id: 557 },
      data: { status: 'logistics' }
    });
    console.log("Reset order 557 back to logistics status");

  } catch(e) {
    console.error("Error cleaning up:", e);
  } finally {
    process.exit(0);
  }
}

main();
