const exec = require("child_process").exec;
const path = require("path");
const fs = require("fs");
const StoreOutput = path.join(__dirname, "StoreOutput");

if (!fs.existsSync(StoreOutput)) {
  fs.mkdirSync(StoreOutput, { recursive: true });
}

const RunCpp = async (filePath) => {
  const jobID = path.basename(filePath).split(".")[0];
  const outputPath = path.join(StoreOutput, `${jobID}.exe`);
  let TargetLocation = filePath.split(`${jobID}.cpp`)[0];

  return new Promise((resolve, rejects) => {
    exec(
      ` cd ${TargetLocation} && g++ ${jobID}.cpp -o ${jobID} && ${jobID}.exe `,
      (error, stdout, stderror) => {
        if (error) {
          rejects({ error, stderror });
        } else if (stderror) {
          rejects(stderror);
        } else {
          resolve(stdout);
        }
      }
    );
  });
};

module.exports = { RunCpp };
