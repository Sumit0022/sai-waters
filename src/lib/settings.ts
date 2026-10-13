import { getDb, ensureDatabaseReady } from "@/db";
import { systemConfigurations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  upi_id: string;
  payee_name: string;
  gst_status: string;
  default_jar_price_paise: number;
}

export const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: "Sai Waters",
  phone: "+91 98765 43210",
  address: "Civil Lines, Bareilly, UP, India",
  upi_id: "saiwaters@upi",
  payee_name: "Sai Waters",
  gst_status: "UNREGISTERED",
  default_jar_price_paise: 3500,
};

/**
 * Retrieve current admin credentials from systemConfigurations or defaults
 */
export async function getAdminCredentials(): Promise<{ username: string; password: string }> {
  await ensureDatabaseReady();
  const db = getDb();

  try {
    const rows = await db
      .select()
      .from(systemConfigurations)
      .where(eq(systemConfigurations.configKey, "admin_auth"))
      .limit(1);

    if (rows.length > 0) {
      const data = JSON.parse(rows[0].configValueJson);
      if (data.username && data.password) {
        return {
          username: data.username.trim(),
          password: data.password.trim(),
        };
      }
    }
  } catch (e) {
    console.error("Error reading admin_auth config:", e);
  }

  // Fallback to environment variables or initial defaults
  return {
    username: process.env.OWNER_USERNAME || "sai",
    password: process.env.OWNER_PASSWORD || "sai123",
  };
}

/**
 * Verify whether an entered password matches the current admin password
 */
export async function verifyAdminPassword(passwordAttempt: string): Promise<boolean> {
  if (!passwordAttempt) return false;
  const current = await getAdminCredentials();
  const trimmed = passwordAttempt.trim();

  if (trimmed === current.password) return true;
  // Allow fallback 'admin123' if default password is 'sai123'
  if (current.password === "sai123" && trimmed === "admin123") return true;

  return false;
}

/**
 * Update Admin Username and Password in systemConfigurations & users table
 */
export async function updateAdminCredentials(newUsername: string, newPassword: string) {
  await ensureDatabaseReady();
  const db = getDb();

  const cleanUser = newUsername.trim();
  const cleanPass = newPassword.trim();

  if (!cleanUser || !cleanPass) {
    throw new Error("Admin username and password cannot be empty");
  }

  const payload = JSON.stringify({
    username: cleanUser,
    password: cleanPass,
    updatedAt: new Date().toISOString(),
  });

  // Upsert into systemConfigurations
  await db
    .insert(systemConfigurations)
    .values({
      configKey: "admin_auth",
      configValueJson: payload,
      description: "Admin portal authentication credentials",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemConfigurations.configKey,
      set: {
        configValueJson: payload,
        updatedAt: new Date(),
      },
    });

  // Also synchronize owner user in users table
  try {
    await db
      .update(users)
      .set({
        passwordHash: cleanPass,
        email: `${cleanUser}@saiwaters.in`,
      })
      .where(eq(users.id, "usr_owner_01"));
  } catch (e) {
    // Non-fatal if user row does not exist
  }

  return { success: true, username: cleanUser };
}

/**
 * Retrieve business info including custom UPI ID and payee name
 */
export async function getBusinessInfo(): Promise<BusinessInfo> {
  await ensureDatabaseReady();
  const db = getDb();

  try {
    const rows = await db
      .select()
      .from(systemConfigurations)
      .where(eq(systemConfigurations.configKey, "business_info"))
      .limit(1);

    if (rows.length > 0) {
      const data = JSON.parse(rows[0].configValueJson);
      return {
        ...DEFAULT_BUSINESS_INFO,
        ...data,
        upi_id: (data.upi_id || DEFAULT_BUSINESS_INFO.upi_id).trim(),
        payee_name: (data.payee_name || data.name || DEFAULT_BUSINESS_INFO.payee_name).trim(),
      };
    }
  } catch (e) {
    console.error("Error reading business_info config:", e);
  }

  return DEFAULT_BUSINESS_INFO;
}

/**
 * Update Business Information (UPI ID, payee name, phone, address, etc.)
 */
export async function updateBusinessInfo(info: Partial<BusinessInfo>) {
  await ensureDatabaseReady();
  const db = getDb();

  const current = await getBusinessInfo();
  const merged: BusinessInfo = {
    ...current,
    ...info,
    upi_id: info.upi_id ? info.upi_id.trim() : current.upi_id,
    payee_name: info.payee_name ? info.payee_name.trim() : (info.name || current.payee_name).trim(),
  };

  const payload = JSON.stringify(merged);

  await db
    .insert(systemConfigurations)
    .values({
      configKey: "business_info",
      configValueJson: payload,
      description: "Business contact and payment config",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemConfigurations.configKey,
      set: {
        configValueJson: payload,
        updatedAt: new Date(),
      },
    });

  return merged;
}
