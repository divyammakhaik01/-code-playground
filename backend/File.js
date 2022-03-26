const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");

// make folder
const Codes = path.join(__dirname, "codes");

// create file if not exist

if (!fs.existsSync(Codes)) {
  console.log("enter");

  fs.mkdirSync(Codes, { recursive: true });
}

const generate = async (language, code) => {
  let codeID = uuid();
  const fileName = `${codeID}.${language}`;
  const filePath = path.join(Codes, fileName);
  await fs.writeFileSync(filePath, code);
  return filePath;
};
module.exports = { generate };
