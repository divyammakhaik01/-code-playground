const Queue = require("bull");
const job = require("./models/Code_Job");
const { RunCpp } = require("./codeRunnerFiles/RunCpp");
const { RunPy } = require("./codeRunnerFiles/RunPy");
const { RunC } = require("./codeRunnerFiles/RunC");
let REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
// let throng = require("throng");

const WORKET_COUNT = 5;
// const WORKET_COUNT = process.env.WEB_CONCURRENCY || 5;

const job_Queue = new Queue("job_queue", REDIS_URL);

// process job
job_Queue.process(WORKET_COUNT, async ({ data }) => {
  const { id: ID } = data;

  console.log(`${ID}`);

  const Job = await job.findById(ID);

  if (Job === undefined) {
    throw Error("invalid ID job not found....");
  }
  console.log("job Fetched :  ", Job);
  // job fetched by worker
  try {
    Job["startTime"] = new Date();

    // select language
    if (Job.languageType === "cpp") {
      output = await RunCpp(Job.filepath);
    } else if (Job.languageType === "C") {
      output = await RunC(Job.filepath);
    } else {
      output = await RunPy(Job.filepath);
    }

    // update database
    const newJob = await job.findByIdAndUpdate(
      ID,
      {
        startTime: Job["startTime"],
        endTime: new Date(),
        Jobstatus: "done",
        // output: JSON.stringify(output),
        output: output,
      },
      {
        returnOriginal: false,
      }
    );
    console.log(
      "newJob-------------------------------------------------------------------------- ",
      newJob
    );
    return true;
  } catch (error) {
    // update database
    const errorObj = await job.findByIdAndUpdate(
      ID,
      {
        startTime: Job["startTime"],
        endTime: new Date(),
        Jobstatus: "error",
        output: JSON.stringify(error),
      },
      { returnOriginal: false }
    );
  }
});

// handeling error

job_Queue.on("failed", (error) => {
  console.log(`id : ${error.data.id} has failed`);
});

// add jobs in queue
const addJob = async (ID) => {
  await job_Queue.add({ id: ID });
};

module.exports = {
  addJob,
};

// throng({ workers, start });
