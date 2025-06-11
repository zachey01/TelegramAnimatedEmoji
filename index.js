import fs from "fs";
import zlib from "zlib";
import renderLottie from "puppeteer-lottie";
import path from "path";
import apng from "node-apng";
import tmp from "tmp";

const bases = ["duck", "emoji"];

const getTgsFiles = (dir) => {
  const files = fs
    .readdirSync(dir)
    .filter((file) => path.extname(file) === ".tgs");

  files.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0], 10);
    const numB = parseInt(b.match(/\d+/)[0], 10);
    return numA - numB;
  });

  return files.map((file) => path.join(dir, file));
};

let allFiles = [];
for (const base of bases) {
  const tgsDir = path.join(base, "tgs");
  const files = getTgsFiles(tgsDir).map((filePath) => ({ base, filePath }));
  allFiles = allFiles.concat(files);
}

const totalFiles = allFiles.length;

function convertTgsToJson(base, filePath, lottieDir) {
  const filename = path.basename(filePath, ".tgs");
  const jsonFile = path.join(lottieDir, `${filename}.json`);

  let data;
  try {
    data = fs.readFileSync(filePath);
  } catch (err) {
    console.error(`❌ Error reading file "${filePath}": ${err.message}`);
    return null;
  }

  let lottie;
  try {
    lottie = zlib.gunzipSync(data).toString("utf-8");
  } catch (err) {
    console.error(
      `❌ Error decompressing TGS file "${filePath}": ${err.message}`
    );
    return null;
  }

  try {
    fs.writeFileSync(jsonFile, lottie);
    console.log(`✅ JSON created successfully: ${jsonFile}`);
    return jsonFile;
  } catch (err) {
    console.error(`❌ Error writing JSON file "${jsonFile}": ${err.message}`);
    return null;
  }
}

async function processFile(base, jsonFile) {
  const filename = path.basename(jsonFile, ".json");

  const apngDir = path.join(base, "apng");
  const mp4Dir = path.join(base, "mp4");
  const gifDir = path.join(base, "gif");

  fs.mkdirSync(apngDir, { recursive: true });
  fs.mkdirSync(mp4Dir, { recursive: true });
  fs.mkdirSync(gifDir, { recursive: true });

  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const outputDir = tmpDir.name;

  try {
    const frameData = await renderLottie({
      path: jsonFile,
      output: path.join(outputDir, "frame-%d.png"),
      height: 512,
      width: 512,
    });

    const framenames = [];
    for (let i = 1; i <= frameData.numFrames; i++) {
      framenames.push(path.join(outputDir, `frame-${i}.png`));
    }

    const images = framenames.map((framePath) => {
      if (!fs.existsSync(framePath)) {
        throw new Error(`Frame file "${framePath}" was not generated.`);
      }
      return fs.readFileSync(framePath);
    });

    let apngOutput;
    try {
      apngOutput = apng(images, (index) => ({
        numerator: frameData.duration,
        denominator: frameData.numFrames,
      }));
    } catch (err) {
      throw new Error(`❌ Error creating APNG: ${err.message}`);
    }

    const apngFile = path.join(apngDir, `${filename}.apng`);
    try {
      fs.writeFileSync(apngFile, apngOutput);
      console.log(`🎉 APNG created successfully: ${apngFile}`);
    } catch (err) {
      throw new Error(
        `❌ Error writing APNG file "${apngFile}": ${err.message}`
      );
    }
  } catch (err) {
    console.error(`❌ Error converting APNG for "${jsonFile}": ${err.message}`);
  }

  try {
    const mp4File = path.join(mp4Dir, `${filename}.mp4`);
    await renderLottie({
      path: jsonFile,
      output: mp4File,
      height: 512,
      width: 512,
    });
    console.log(`🎥 MP4 created successfully: ${mp4File}`);
  } catch (err) {
    console.error(`❌ Error converting MP4 for "${jsonFile}": ${err.message}`);
  }

  try {
    const gifFile = path.join(gifDir, `${filename}.gif`);
    await renderLottie({
      path: jsonFile,
      output: gifFile,
      height: 512,
      width: 512,
    });
    console.log(`🎞️ GIF created successfully: ${gifFile}`);
  } catch (err) {
    console.error(`❌ Error converting GIF for "${jsonFile}": ${err.message}`);
  }

  try {
    tmpDir.removeCallback();
    console.log(`🧹 Temporary directory cleaned for "${jsonFile}".`);
  } catch (err) {
    console.error(`❌ Error cleaning up: ${err.message}`);
  }
}

(async () => {
  let current = 0;
  for (const { base, filePath } of allFiles) {
    console.log(`🚀 Processing file ${current} of ${totalFiles}: ${filePath}`);
    const lottieDir = path.join(base, "lotties");
    fs.mkdirSync(lottieDir, { recursive: true });
    const jsonFile = convertTgsToJson(base, filePath, lottieDir);
    if (jsonFile) {
      await processFile(base, jsonFile);
    } else {
      console.error(
        `⛔ Skipping processing "${filePath}" due to JSON conversion error.`
      );
    }
    current++;
  }
  console.log("🎉 All emoji/stickers processed.");
})();
