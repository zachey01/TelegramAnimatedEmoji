import { writeFile, readdir } from "fs/promises";
import path from "path";

const generateTableWithSizedImages = (title, folder, width = 50) => {
  return async () => {
    let files = await readdir(folder);

    files.sort((a, b) => {
      const getNumber = (name) => parseInt(name.match(/\d+/)?.[0] || "0", 10);
      return getNumber(a) - getNumber(b);
    });

    const rows = files.map((file) => {
      const number = file.match(/\d+/)?.[0] || file;
      const filePath = path.posix.join(folder, file);
      const imageHTML = `<img src="${filePath}" width="${width}"/>`;
      return `| ${number} | ${imageHTML} |`;
    });

    return [
      `### ${title}`,
      `| Name | Preview |`,
      `|--------|---------|`,
      ...rows,
      "",
    ].join("\n");
  };
};

const main = async () => {
  const header = [
    "# Telegram Animated Emoji & Stickers",
    "",
    "This repository contains animated emojis and stickers extracted from Telegram.",
    "",
    "You can use them via CDN, for example:",
    "",
    "```\nhttps://cdn.jsdelivr.net/gh/zachey01/TelegramAnimatedEmoji@main/emoji/gif/0.gif\nhttps://cdn.jsdelivr.net/gh/zachey01/TelegramAnimatedEmoji@main/duck/lotties/0.json\n```",
    "",
  ].join("\n");

  const emojiTable = await generateTableWithSizedImages(
    "Emoji",
    "./emoji/gif"
  )();
  const duckTable = await generateTableWithSizedImages(
    "Duck Stickes",
    "duck/gif"
  )();

  const content = [header, emojiTable, duckTable].join("\n");

  await writeFile("README.md", content);
};

main();
