const Queue = require("bull");
const job = require("./models/Code_Job");
const { RunCpp } = require("./RunCpp");
const { RunPy } = require("./RunPy");
const { RunC } = require("./RunC");

const job_Queue = new Queue("job_queue");
const WORKET_COUNT = 5;

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
