import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, // must be service_role key
);

const TABLE = process.env.TABLE_NAME;

async function deleteTest() {
  const idToDelete = 21;

  // Fetch first to confirm
  const { data: existingRows, error: fetchError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", idToDelete);

  if (fetchError) {
    console.error("❌ Fetch failed:", fetchError);
    return;
  }

  if (!existingRows?.length) {
    console.log(`⚠️ Row with id ${idToDelete} does not exist`);
    return;
  }

  console.log("✅ Row exists:", existingRows[0]);

  // Attempt delete
  const { data: deletedData, error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .select("*") // ensure deleted rows are returned
    .eq("id", idToDelete);

  if (deleteError) {
    console.error("❌ Delete failed:", deleteError);
  } else {
    const deletedCount = deletedData?.length ?? 0;
    console.log(`🔥 Deleted ${deletedCount} message(s)`);
    console.log("🗂️ Deleted row data:", deletedData);
  }
}

deleteTest();
