/**
 * Seed script to create sample notifications for testing the inbox UI
 */
import { db, schema } from "../lib/db/standalone";
import { enqueueJob, processJobs } from "../lib/jobs/standalone";
import { eq } from "drizzle-orm";

async function seedNotifications() {
  console.log("🌱 Seeding test notifications...\n");

  try {
    // Get first user
    const users = await db.select().from(schema.users).limit(1);

    if (users.length === 0) {
      console.error("❌ No users found. Please create a user first.");
      return;
    }

    const user = users[0];
    console.log(`Found user: ${user.email}\n`);

    // Sample notifications
    const notifications = [
      {
        type: "report_generated",
        title: "Maandoverzicht december 2025 is klaar",
        message: "Je kilometerregistratie voor december 2025 is beschikbaar. Totaal: 1.245 km zakelijk.",
        priority: "normal",
        icon: "FileText",
        action: {
          label: "Rapport bekijken",
          url: "/rapporten/maand?month=12&year=2025",
        },
      },
      {
        type: "report_generated",
        title: "Jaaroverzicht 2025 is beschikbaar",
        message: "Je kilometeradministratie voor 2025 is klaar. Totaal: 15.680 km zakelijk gereden.",
        priority: "normal",
        icon: "FileText",
        action: {
          label: "Rapport downloaden",
          url: "/rapporten/jaar?year=2025",
        },
      },
      {
        type: "odometer_milestone",
        title: "Mijlpaal bereikt: 25.000 km!",
        message: "Gefeliciteerd! Je hebt 25.000 kilometer gereden met je Toyota Yaris.",
        priority: "low",
        icon: "Trophy",
        color: "yellow",
      },
      {
        type: "incomplete_trip",
        title: "Rit incompleet",
        message: "Je rit van 28 december mist een eindkilometerstand. Vul deze aan voor correcte administratie.",
        priority: "high",
        icon: "AlertTriangle",
        color: "red",
        action: {
          label: "Rit aanvullen",
          url: "/registraties/overzicht",
        },
      },
      {
        type: "system_announcement",
        title: "Welkom bij Automaatje!",
        message: "Je kunt nu beginnen met het registreren van je ritten. Succes!",
        priority: "normal",
        icon: "Info",
      },
    ];

    console.log(`Creating ${notifications.length} test notifications...\n`);

    for (const notifData of notifications) {
      await enqueueJob("notification", {
        userId: user.id,
        notificationData: notifData,
      });
    }

    console.log(" Notifications enqueued\n");

    // Process all jobs
    console.log(" Processing notification jobs...\n");
    await processJobs();
    console.log(" All jobs processed\n");

    // Show summary
    const allNotifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, user.id));

    const unreadCount = allNotifications.filter(n => !n.isRead && !n.isArchived).length;

    console.log("📊 Summary:");
    console.log(`   Total notifications: ${allNotifications.length}`);
    console.log(`   Unread: ${unreadCount}`);
    console.log(`   Archived: ${allNotifications.filter(n => n.isArchived).length}\n`);

    console.log(" Seeding completed! Visit /inbox to see the notifications.\n");

  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  }
}

// Run seeding
seedNotifications()
  .then(() => {
    console.log(" Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
