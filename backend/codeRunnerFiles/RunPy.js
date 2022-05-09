const exec = require("child_process").exec;
const path = require("path");
const fs = require("fs");

const RunPy = async (filePath) => {
  const jobID = path.basename(filePath).split(".")[0];
  let TargetLocation = filePath.split(`${jobID}.py`)[0];

  return new Promise((resolve, rejects) => {
    exec(
      ` cd ${TargetLocation} && python ${jobID}.py `,
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

module.exports = { RunPy };
