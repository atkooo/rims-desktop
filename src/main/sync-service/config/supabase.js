const { createClient } = require("@supabase/supabase-js");
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const logger = require("../../helpers/logger");

function tryLoadEnv(envPath) {
  if (!envPath) return false;
  if (!fs.existsSync(envPath)) return false;
  try {
    require("dotenv").config({ path: envPath });
    logger.info(`Loaded Supabase env from: ${envPath}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to load env from ${envPath}:`, error.message);
    return false;
  }
}

function loadSupabaseEnv() {
  if (app && app.isPackaged) {
    const userDataEnv = path.join(app.getPath("userData"), ".env.production");
    const resourceEnv = path.join(process.resourcesPath || "", ".env.production");
    if (tryLoadEnv(userDataEnv)) return;
    if (tryLoadEnv(resourceEnv)) return;
  } else {
    const nodeEnv = process.env.NODE_ENV;
    const devEnv = path.join(process.cwd(), ".env.development");
    const prodEnv = path.join(process.cwd(), ".env.production");
    const fallbackEnv = path.join(process.cwd(), ".env");

    if (nodeEnv === "production") {
      if (tryLoadEnv(prodEnv)) return;
      if (tryLoadEnv(devEnv)) return;
    } else {
      if (tryLoadEnv(devEnv)) return;
      if (tryLoadEnv(prodEnv)) return;
    }

    tryLoadEnv(fallbackEnv);
  }
}

loadSupabaseEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

function describeEnvLocation() {
  if (app && app.isPackaged) {
    return "resources/.env.production or userData/.env.production";
  }
  return ".env.development or .env in project root";
}

if (!supabaseUrl) {
  throw new Error(
    `SUPABASE_URL is required. Please set it in ${describeEnvLocation()}.\n` +
      "Example:\n" +
      "SUPABASE_URL=https://your-project.supabase.co\n" +
      "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n",
  );
}

const apiKey = supabaseServiceKey || supabaseAnonKey;

if (!apiKey) {
  throw new Error(
    "Supabase API key is required. Please set SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY in your .env file.",
  );
}

if (!supabaseServiceKey && supabaseAnonKey) {
  logger.warn(
    "Using SUPABASE_ANON_KEY instead of SUPABASE_SERVICE_ROLE_KEY. " +
      "Service role key is recommended for sync operations as it bypasses RLS.",
  );
}

const supabase = createClient(supabaseUrl, apiKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

if (supabaseServiceKey) {
  logger.info("Embedded sync: using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)");
} else {
  logger.warn("Embedded sync: using SUPABASE_ANON_KEY (subject to RLS policies)");
}

module.exports = supabase;
