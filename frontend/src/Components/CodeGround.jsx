import React, { useState, useEffect } from "react";
// import axios from "axios";
import template from "./Template";
const CodeGround = () => {
  const [code, setcode] = useState("");
  const [output, setoutput] = useState("");
  const [current_language, setcurrent_language] = useState("cpp");
  const [status, setstatus] = useState("");

  // use effect

  useEffect(() => {
    setcode(template[current_language]);
  }, [current_language]);

  // handle Code Submit
  const handleCodeSubmit = async () => {
    let payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        language: current_language,
        code: code,
      }),
    };
    try {
      setoutput("");
      setstatus("");

      const res = await fetch("http://localhost:3031/run", payload);
      const JOBID = await res.json();

      // pooling
      let intervalID = setInterval(async () => {
        let rec = await fetch(`http://localhost:3031/status/${JOBID["jobID"]}`);
        let rec_data = await rec.json();

        // in case of error in code
        if (rec_data.success === false) {
          let value = Object.values(rec_data.response.output);
          setstatus("WRONG");
          setoutput(value);
          clearInterval(intervalID);
        }

        if (rec_data.success === true) {
          // if in pending state
          if (rec_data.response.Jobstatus === "pending") {
            setstatus("pending...");
          }
          // if done
          else {
            let value = Object.values(rec_data.response.output);
            setstatus("SUCCESS");
            setoutput(value);

            clearInterval(intervalID);
          }
        }
      }, 1000);
    } catch (error) {
      alert("Error while connecting to server!!!");
    }
  };

  return (
    <>
      <button
        className="border-solid border-4 border-indigo-500 my-5 px-5 bg-blue-200 rounded-md "
        type="submit"
        onClick={handleCodeSubmit}
      >
        Submit
      </button>
      <br />
      <br />

      {/* Select language */}
      <span style={{ "margin-right": 10 }}>Language</span>
      <select
        id="select_lang"
        value={current_language}
        onChange={(e) => {
          const res = window.confirm(
            "Switching language will remove your current code"
          );
          if (res) {
            setcurrent_language(e.target.value);
          }
        }}
      >
        <option>{current_language}</option>
        <option>{current_language === "cpp" ? "py" : "cpp"}</option>
      </select>

      <br />
      <br />
      <br />

      <div className="ground">
        <textarea
          value={code}
          name="code-ground"
          id=""
          cols="100"
          rows="10"
          onChange={(e) => setcode(e.target.value)}
          className="border-solid border-4 border-indigo-500"
        ></textarea>
      </div>
      <div>
        {/* status */}
        {status}
        <br /> <br />
        {/* output */}
        {output !== ""
          ? output.map((e) => (e === "\r\n" ? <br /> : <span>{e}</span>))
          : ""}
      </div>
    </>
  );
};

export default CodeGround;

// #include<iostream>
// using namespace std;

// int main(){
// //for(int i =0 ; i < 5 ; i++)
// cout <<" Apple " << endl;
// }
