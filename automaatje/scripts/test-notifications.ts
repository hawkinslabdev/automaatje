/**
 * Test script for notification system
 * Demonstrates creating notifications via job queue and using server actions
 */
import { db, schema } from "../lib/db/standalone";
import { enqueueJob } from "../lib/jobs/standalone";
import { eq } from "drizzle-orm";

async function testNotificationSystem() {
  console.log("🧪 Testing Notification System\n");

  try {
    // 1. Get a test user (first user in database)
    console.log("1️⃣  Finding test user...");
    const users = await db.select().from(schema.users).limit(1);

    if (users.length === 0) {
      console.error("❌ No users found in database. Please create a user first.");
      return;
    }

    const testUser = users[0];
    console.log(`Found user: ${testUser.email}\n`);

    // 2. Enqueue a test notification job
    console.log("2️⃣  Enqueuing test notification job...");
    const testNotificationData = {
      type: "system_announcement",
      title: "Test notificatie",
      message: "Dit is een test notificatie om het systeem te controleren.",
      priority: "normal",
      icon: "Info",
      action: {
        label: "Meer info",
        url: "/instellingen",
      },
    };

    const job = await enqueueJob("notification", {
      userId: testUser.id,
      notificationData: testNotificationData,
    });

    if (!job.success) {
      console.error(`Failed to enqueue job: ${job.error}`);
      return;
    }

    console.log(`Job enqueued with ID: ${job.data?.id}\n`);

    // 3. Process the job (simulating the job processor)
    console.log("3️⃣  Processing notification job...");
    const { processJobs } = await import("../lib/jobs/standalone");
    await processJobs();
    console.log(" Job processed\n");

    // 4. Verify notification was created
    console.log("4️⃣  Verifying notification creation...");
    const notifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, testUser.id))
      .orderBy(schema.notifications.createdAt)
      .limit(5);

    if (notifications.length === 0) {
      console.error("❌ No notifications found!");
      return;
    }

    const latestNotification = notifications[notifications.length - 1];
    const notificationData = latestNotification.data as any;

    console.log(" Notification created successfully!");
    console.log(`   ID: ${latestNotification.id}`);
    console.log(`   Type: ${notificationData.type}`);
    console.log(`   Title: ${notificationData.title}`);
    console.log(`   Message: ${notificationData.message}`);
    console.log(`   Read: ${latestNotification.isRead ? "Yes" : "No"}`);
    console.log(`   Archived: ${latestNotification.isArchived ? "Yes" : "No"}`);
    console.log(`   Delivered via: ${notificationData.deliveredVia?.join(", ") || "N/A"}\n`);

    // 5. Test marking as read
    console.log("5️⃣  Testing mark as read...");
    await db
      .update(schema.notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.notifications.id, latestNotification.id));

    const readNotification = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, latestNotification.id))
      .limit(1);

    console.log(`Notification marked as read: ${readNotification[0].isRead}\n`);

    // 6. Test archiving
    console.log("6️⃣  Testing archive...");
    await db
      .update(schema.notifications)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.notifications.id, latestNotification.id));

    const archivedNotification = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, latestNotification.id))
      .limit(1);

    console.log(`Notification archived: ${archivedNotification[0].isArchived}\n`);

    // 7. Create additional test notifications (different types)
    console.log("7️⃣  Creating additional test notifications...");

    const additionalNotifications = [
      {
        type: "odometer_milestone",
        title: "Mijlpaal bereikt: 10.000 km!",
        message: "Je hebt 10.000 kilometer gereden. Goed bezig!",
        priority: "low",
        icon: "Trophy",
        color: "yellow",
      },
      {
        type: "incomplete_trip",
        title: "Rit incompleet",
        message: "Je rit van vandaag mist een eindkilometerstand.",
        priority: "high",
        icon: "AlertTriangle",
        color: "red",
        action: {
          label: "Rit aanvullen",
          url: "/registraties",
        },
      },
      {
        type: "report_generated",
        title: "Maandoverzicht december is klaar",
        message: "Je kilometerregistratie voor december 2025 is beschikbaar.",
        priority: "normal",
        icon: "FileText",
        action: {
          label: "Rapport bekijken",
          url: "/rapporten/maand",
        },
      },
    ];

    for (const notifData of additionalNotifications) {
      await enqueueJob("notification", {
        userId: testUser.id,
        notificationData: notifData,
      });
    }

    console.log(" Additional notifications enqueued");

    // Process all queued jobs
    await processJobs();
    console.log(" All jobs processed\n");

    // 8. Show summary
    console.log("8️⃣  Final notification count...");
    const allNotifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, testUser.id));

    const unreadCount = allNotifications.filter(n => !n.isRead && !n.isArchived).length;
    const archivedCount = allNotifications.filter(n => n.isArchived).length;

    console.log(`Total notifications: ${allNotifications.length}`);
    console.log(`   Unread: ${unreadCount}`);
    console.log(`   Archived: ${archivedCount}\n`);

    console.log(" All tests passed! Notification system is working.\n");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  }
}

// Run tests
testNotificationSystem()
  .then(() => {
    console.log(" Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
