const express = require("express");
const app = express();
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const { generate } = require("./File");
const { RunCpp } = require("./codeRunnerFiles/RunCpp");
const { RunPy } = require("./codeRunnerFiles/RunPy");
const cors = require("cors");
const job = require("./models/Code_Job");
const { addJob } = require("./taskQueue");
const http = require("http");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

// create DB
// const URL = process.env.MONGO_URI || "mongodb://localhost/codePlayground";
let link = process.env.MONGO_KEY;
mongoose
  .connect(link)
  .then((db) => {
    console.log("db connected");
  })
  .catch((err) => {
    console.log("database error", err);
  });

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// -------------------------------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "..", "frontend", "build")));
app.use(express.static("public"));
app.use(express.static("src"));

// -------------------------------------------------------------------------------------------------

app.get("/api/status/:id", async (req, res) => {
  console.log(
    "---------------------------------status check--------------------------------------"
  );
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
    return res.json({
      success: "false",
      error: error,
    });
  }
});

app.post("/api/run", async (req, res) => {
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
    console.log("file path : ", filePath);
    JobObject = await job.create({
      languageType: language,
      filepath: filePath,
      code: code,
    });
    jobID = JobObject["_id"];
    console.log("... ", JobObject);
    console.log("job id :::::    ", jobID);
    // send job to bull queue
    addJob(jobID);
    // ----------------------------------------------------------------------------------
    //  const { id: ID } = data;
    // let ID = jobID;

    // console.log(`${ID}`);

    // const Job = await job.findById(ID);

    // if (Job === undefined) {
    //   throw Error("invalid ID job not found....");
    // }
    // console.log("job Fetched :  ", Job);
    // // job fetched by worker
    // try {
    //   Job["startTime"] = new Date();

    //   // select language
    //   if (Job.languageType === "cpp") {
    //     output = await RunCpp(Job.filepath);
    //   } else if (Job.languageType === "C") {
    //     output = await RunC(Job.filepath);
    //   } else {
    //     output = await RunPy(Job.filepath);
    //   }

    //   // update database
    //   const newJob = await job.findByIdAndUpdate(
    //     ID,
    //     {
    //       startTime: Job["startTime"],
    //       endTime: new Date(),
    //       Jobstatus: "done",
    //       // output: JSON.stringify(output),
    //       output: output,
    //     },
    //     {
    //       returnOriginal: false,
    //     }
    //   );
    //   console.log(
    //     "newJob-------------------------------------------------------------------------- ",
    //     newJob
    //   );
    // } catch (error) {
    //   // update database
    //   const errorObj = await job.findByIdAndUpdate(
    //     ID,
    //     {
    //       startTime: Job["startTime"],
    //       endTime: new Date(),
    //       Jobstatus: "error",
    //       output: JSON.stringify(error),
    //     },
    //     { returnOriginal: false }
    //   );
    // }

    // ----------------------------------------------------------------------------------

    // console.log("res : ", res);
    // send jobID to frontend
    res.json({
      status: "true",
      jobID: jobID,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error,
    });
  }
});

app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "build", "index.html"))
);

const PORT = process.env.PORT || 3031;

const server = app.listen(PORT, () => {
  console.log("app is listening port ", PORT);
});
//------------------------------------------------------------------------------------------------------------------
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
      console.log("enter here////////////////////////");
      socket.leave();
    });

    socket.on("leave-room", () => {
      const rooms = [...socket.rooms];
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

    socket.on("check", () => {
      console.log("check##################");
      io.to(id).emit("check", {
        a: "apple",
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
