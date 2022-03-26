const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { generate } = require("./File");
// const { RunCpp } = require("./RunCpp");
// const { RunPy } = require("./RunPy");
const cors = require("cors");
const mongoose = require("mongoose");
const job = require("./models/Code_Job");
const { addJob } = require("./taskQueue");

// app.use("/static", express.static(path.resolve(__dirname, "public")));

// create DB

mongoose
  .connect("mongodb://localhost/codePlayground")
  .then((db) => {
    console.log("db connected");
  })
  .catch((err) => {
    console.log("database error", err);
  });

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    reponse: "OK",
  });
});

app.get("/status/:id", async (req, res) => {
  const JOB_ID = req.params.id;

  if (JOB_ID === undefined) {
    return res.status(400).json({
      success: false,
      response: "bad request",
    });
  }
  // check db whether job is done or not

  try {
    const JOB = await job.findOne({ _id: JOB_ID });
    console.log("job : ", JOB);

    if (JOB === "") {
      return res.status(404).json({
        response: "resource not found",
      });
    }

    // checking status of job

    if (JOB["Jobstatus"] === "error") {
      res.status(200).json({
        success: false,
        status: `job is in ${JOB["Jobstatus"]} state `,
        response: JOB,
      });
    } else {
      res.status(200).json({
        success: true,
        response: JOB,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: "false",
      error: error,
    });
  }
});

app.post("/run", async (req, res) => {
  let { code, language = "cpp" } = req.body;
  console.log("code : ", req.body);

  if (code === "") {
    return res.status(400).json({
      "success : ": false,
      error: "no code found",
    });
  }

  //
  let output;
  let JobObject;
  let jobID;
  try {
    const filePath = await generate(language, code);

    JobObject = await job.create({
      languageType: language,
      filepath: filePath,
      code: code,
    });
    jobID = JobObject["_id"];
    console.log("... ", JobObject);

    // send jobID to frontend
    res.status(201).json({
      status: "true",
      jobID: jobID,
    });

    // send job to bull queue
    addJob(jobID);
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error,
    });
  }
  console.log("output ", output);
});

const server = app.listen(3031, () => {
  console.log("app is listening port 3031 ");
});
