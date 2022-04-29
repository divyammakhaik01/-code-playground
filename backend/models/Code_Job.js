const mongoose = require("mongoose");

const CodeSchema = mongoose.Schema({
  languageType: {
    type: String,
    require: true,
    enum: ["py", "cpp", "C"],
  },
  filepath: {
    type: String,
    require: true,
  },
  code: {
    type: String,
  },
  submitTime: {
    type: Date,
    default: Date.now,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  output: {
    type: String,
  },
  Jobstatus: {
    type: String,
    enum: ["done", "pending", "error"],
    default: "pending",
  },
});

const job = mongoose.model("job", CodeSchema);

module.exports = job;
