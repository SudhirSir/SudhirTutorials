import { prisma } from "@/lib/prisma";

export async function getPublishedStoreItems(studentId?: string) {
  const items = await prisma.storeItem.findMany({
    where: { isPublished: true },
    include: {
      onlineTests: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          totalMarks: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  let purchasedItemIds: string[] = [];
  if (studentId) {
    const purchases = await prisma.storePurchase.findMany({
      where: { studentId, status: "SUCCESS" },
      select: { itemId: true }
    });
    purchasedItemIds = purchases.map((p) => p.itemId);
  }

  return { items, purchasedItemIds };
}

export async function processStoreCheckout(studentId: string, itemId: string, transactionId: string) {
  // Check if item exists
  const item = await prisma.storeItem.findUnique({
    where: { id: itemId }
  });

  if (!item) {
    throw new Error("ITEM_NOT_FOUND");
  }

  // Check if already purchased
  const existingPurchase = await prisma.storePurchase.findFirst({
    where: { studentId, itemId, status: "SUCCESS" }
  });

  if (existingPurchase) {
    return { purchase: existingPurchase, isNew: false };
  }

  // Record purchase
  const purchase = await prisma.storePurchase.create({
    data: {
      studentId,
      itemId,
      amount: item.price,
      paymentId: transactionId,
      status: "SUCCESS"
    }
  });

  return { purchase, isNew: true };
}
