const express = require("express");
const app = express();
const { Server } = require("socket.io");

const bodyParser = require("body-parser");
const { generate } = require("./File");
const { RunCpp } = require("./RunCpp");
const { RunPy } = require("./RunPy");
const cors = require("cors");
const mongoose = require("mongoose");
const job = require("./models/Code_Job");
const { addJob } = require("./taskQueue");
const http = require("http");

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
    // addJob(jobID);
    let ID = jobID;
    const Job = await job.findById(ID);

    if (Job === undefined) {
      throw Error("invalid ID job not found....");
    }
    console.log("job Fetched :  ", Job);
    // job fetched by worker
    try {
      Job["startTime"] = new Date();
      console.log("----------------", Job.languageType);

      // select language
      if (Job.languageType === "cpp") {
        output = await RunCpp(Job.filepath);
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
          output: output,
          // output: JSON.stringify(output),
        },
        {
          returnOriginal: false,
        }
      );
      console.log(
        "newJob-------------------------------------------------------------------------- ",
        newJob
      );
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
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error,
    });
  }
});

const server = app.listen(3031, () => {
  console.log("app is listening port 3031 ");
});
//
const io = new Server(server);

const userSocketMapping = {};

const handleClientList = (id) => {
  return Array.from(io.sockets.adapter.rooms.get(id) || []).map((socketID) => {
    return {
      socketID,
      username: userSocketMapping[socketID],
    };
  });
};
//
io.on("connection", (socket) => {
  console.log("user socket connected : ", socket.id);

  // join event ---------------------------------------------------
  socket.on("join", ({ id, userName }) => {
    console.log("sokcet id: ", id);
    userSocketMapping[socket.id] = userName;

    // creating room in server
    socket.join(id);
    //
    const client_list = handleClientList(id);
    console.log("client list :", client_list);

    client_list.forEach(({ socketID }) => {
      io.to(socketID).emit("joined", {
        client_list,
        userName,
        socketID: socket.id,
      });
    });

    // on disconnecting event ------------------------------------------

    socket.on("disconnecting", () => {
      // getting all rooms where user is currently
      const rooms = [...socket.rooms];
      console.log("rooms : ", socket.rooms);

      //
      rooms.forEach((roomID) => {
        socket.in(roomID).emit("disconnected", {
          userName: userSocketMapping[socket.id],
          socketID: socket.id,
        });
      });
      // deleting user mapping
      delete userSocketMapping[socket.id];
      socket.leave();
    });

    //

    socket.on("change_lang", ({ id, userName, lang }) => {
      const rooms = [...socket.rooms];
      console.log("change_lang : ", lang);
      console.log("rooms : ", rooms);

      const client_list = handleClientList(id);
      console.log("client_list : ", client_list);

      io.to(id).emit("change_lang", {
        lang,
        userName,
        id: socket.id,
      });
    });

    socket.on("code-change", ({ id, code }) => {
      console.log("enter here also");
      // const client_list = handleClientList(id);
      console.log("client_list : ", client_list);

      // client_list.forEach(({ socketID }) => {
      io.to(id).emit("code-change", {
        id: socket.id,
        userName: userSocketMapping[socket.id],
        code,
      });
    });

    socket.on("output", ({ id, code, current_language }) => {
      console.log("output##################");
      io.to(id).emit("output", {
        id: socket.id,
        code,
        lang: current_language,
      });
    });

    socket.on("code-sync", ({ code, id, lang }) => {
      io.to(id).emit("code-sync", {
        id: socket.id,
        lang,
        code,
      });
    });

    socket.on("lang-sync", ({ lang, id }) => {
      io.to(id).emit("code-sync", {
        id: socket.id,
        lang,
      });
    });
  });
});

// id->(ie room_id) comes from user
// socket.id is user's id
