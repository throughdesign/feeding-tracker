// Copies the fictional sample data to data/feeding.json for local exploration.
// Refuses to overwrite an existing data file.
import { copyFile, constants } from "node:fs/promises";

const source = new URL("../data/sample/feeding.sample.json", import.meta.url);
const target = new URL("../data/feeding.json", import.meta.url);

try {
  await copyFile(source, target, constants.COPYFILE_EXCL);
  console.log("Sample data copied to data/feeding.json");
} catch (error) {
  if (error.code === "EEXIST") {
    console.error("data/feeding.json already exists; not overwriting it.");
    process.exit(1);
  }
  throw error;
}
