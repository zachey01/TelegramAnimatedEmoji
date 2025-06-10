const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function sanitizeName(name) {
  return name.replace(/\d+x\d+/g, "").trim();
}

async function processTgsFiles(mainDirs = ["emoji", "duck"]) {
  for (const mainDir of mainDirs) {
    const tgsDir = path.join(mainDir, "tgs");
    const outputLottiesDir = path.join(mainDir, "lotties");

    // Create output directories if they don't exist
    fs.mkdirSync(outputLottiesDir, { recursive: true });

    let tgsFiles;
    try {
      tgsFiles = fs
        .readdirSync(tgsDir)
        .filter((file) => file.endsWith(".tgs"))
        .sort(); // Optionally sort by name
    } catch (error) {
      console.error(`✗ Failed to read directory ${tgsDir}:`, error.message);
      continue;
    }

    let counter = 0;
    for (const file of tgsFiles) {
      const tgsPath = path.join(tgsDir, file);
      try {
        const tgsData = fs.readFileSync(tgsPath);
        const decompressed = zlib.gunzipSync(tgsData);
        const lottieJson = JSON.parse(decompressed.toString());

        if (
          !lottieJson.nm ||
          !lottieJson.v ||
          !lottieJson.fr ||
          !lottieJson.layers
        ) {
          throw new Error("Invalid TGS/Lottie format");
        }

        const newBaseName = `${counter++}`; // Generate numeric name
        const outputJsonPath = path.join(
          outputLottiesDir,
          `${newBaseName}.json`
        );
        const outputTgsPath = path.join(tgsDir, `${newBaseName}.tgs`);

        fs.writeFileSync(outputJsonPath, JSON.stringify(lottieJson));
        fs.renameSync(tgsPath, outputTgsPath);

        console.log(`✓ Processed: ${outputTgsPath}, ${outputJsonPath}`);
      } catch (error) {
        console.error(
          `✗ Failed to process ${file} in ${mainDir}:`,
          error.message
        );
      }
    }
  }
}

processTgsFiles().catch((error) =>
  console.error("Error in processing:", error)
);
