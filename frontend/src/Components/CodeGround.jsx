import React, { useState, useEffect, useRef } from "react";
import "./Home.css";
import { init_socket } from "./SocketIO";
import template from "./Template";
import { useLocation, useParams } from "react-router-dom";
import Codemirrior from "codemirror";
import "codemirror/mode/clike/clike";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import Avatar from "react-avatar";

const CodeGround = () => {
  // state's

  const [code, setcode] = useState();
  const [output, setoutput] = useState("");
  const [current_language, setcurrent_language] = useState("cpp");
  const [status, setstatus] = useState("");
  const [clients, setClients] = useState([]);

  //

  const location = useLocation();
  const { id } = useParams();

  //  socket-reference

  let socketReference = useRef(null);
  let editorRef = useRef(null);
  let codeRef = useRef(null);
  let curr_language_ref = useRef("cpp");

  // setting default template
  useEffect(() => {
    // setcode(template[current_language]);
    // if (editorRef.current && codeRef.current) editorRef.current.setValue();
    // editorRef.current.setValue(template[current_language]);
    // if (socketReference.current ) {
    //   socketReference.current.emit("code-sync", {
    //     code: codeRef.current,
    //     lang: curr_language_ref.current,
    //     id,
    //   });

    //   socketReference.current.on("code-sync", ({ id, code, lang }) => {
    //     setcode(code);
    //     console.log("enter into code-sync lang ");

    //     setcurrent_language(lang);
    //     console.log("recived lang :", lang);
    //     console.log("code ::: ", code);
    //     if (code !== undefined) editorRef.current.setValue(code);
    //   });
    // }

    console.log("enter into change lang ");
    if (socketReference.current) changeLang();
  }, [
    // current_language,
    socketReference.current,
    editorRef.current,
    codeRef.current,
    curr_language_ref.current,
  ]);
  // socket
  useEffect(() => {
    const func = async () => {
      socketReference.current = await init_socket();

      // join
      socketReference.current.emit("join", {
        id,
        userName: location.state.userName,
      });

      // joined event
      socketReference.current.on(
        "joined",
        ({ client_list, userName, socketID }) => {
          console.log(client_list);
          setClients(client_list);

          socketReference.current.emit("code-sync", {
            code: codeRef.current,
            lang: curr_language_ref.current,
            id,
          });

          socketReference.current.on("code-sync", ({ id, code, lang }) => {
            setcode(code);
            console.log("enter into code-sync lang ");

            setcurrent_language(lang);
            console.log("recived lang :", lang);
            console.log("code ::: ", code);
            if (code !== undefined) editorRef.current.setValue(code);
          });
        }
      );

      // disconnected event
      socketReference.current.on("disconnected", (data) => {
        setClients((curr_list_of_users) => {
          return curr_list_of_users.filter(
            (clinet) => clinet.socketID !== data.socketID
          );
        });
        // alert(`userName : ${data.userName} left`);
      });

      //
      // socketReference.current.emit("change_lang", {
      //   id,
      //   userName: location.state.userName,
      //   lang: current_language,
      // });
      //
    };

    func();
  }, []);

  const changeLang = (e) => {
    curr_language_ref.current = current_language;
    // setcurrent_language(curr_language_ref.current);

    socketReference.current.emit("change_lang", {
      id,
      userName: location.state.userName,
      lang: curr_language_ref.current,
    });

    socketReference.current.on("change_lang", ({ userName, id, lang }) => {
      setcurrent_language(lang);
      console.log("change_lang [[[[[[[[[[[[[[[[[[   ", lang);
    });
  };

  // codemirror

  useEffect(() => {
    const init = async () => {
      editorRef.current = Codemirrior.fromTextArea(
        document.getElementById("editor"),
        {
          mode: { name: "clike", json: false },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      editorRef.current.setSize(500, 300);
      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        codeRef.current = code;
        if (origin !== "setValue") {
          socketReference.current.emit("code-change", {
            id,
            code: codeRef.current,
          });
        }
      });
      editorRef.current.setValue(code);
    };

    init();
  }, []);

  useEffect(() => {
    function CODECHANGE() {
      if (socketReference.current) {
        // on code change .....

        socketReference.current.on("code-change", ({ id, userName, code }) => {
          // setcode(code);
          if (code !== null && userName !== location.state.userName) {
            editorRef.current.setValue(code);
          }
        });

        // output

        socketReference.current.on("output", ({ code, lang }) => {
          setcode(code);

          handleCodeSubmit(code, lang);
        });
      }
    }
    CODECHANGE();
  }, [socketReference.current]);

  // handle Code Submit
  const handleCodeSubmit = async (CODE, lang) => {
    let payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        language: lang,
        code: CODE,
      }),
    };
    try {
      setoutput("");
      setstatus("RUNNING...");

      if (!payload) {
        console.log("nopayload found");
        setstatus("ERROR");
        return;
      }

      const res = await fetch("http://localhost:3031/run", payload);

      const JOBID = await res.json();
      if (JOBID === undefined) {
        console.log("job id is wrong");
        return;
      }
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
          return;
        }

        if (rec_data.success === true) {
          // if in pending state
          if (rec_data.response.Jobstatus === "pending") {
            setstatus("RUNNING...");
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

  const handleCodeSubmit1 = () => {
    console.log("handleCodeSubmit1 : ", curr_language_ref.current);
    console.log("currlang: ,", current_language);
    curr_language_ref.current = current_language;
    socketReference.current.emit("output", {
      id,
      code: codeRef.current,
      current_language: current_language,
    });
  };

  const handleLangChange = () => {
    // codeRef.current = "";
    // socketReference.current.emit("code-change", {
    //   id,
    //   code: codeRef.current,
    // });
  };

  //
  return (
    <>
      <div className="editor_container">
        {/* left side   */}
        <div className="side_block">
          <div className="side_inner">
            {/* <div className="editor-logo">
            <img
              // className="logo-img"
              src="/logo.jpg"
              alt="logo"
              target="_blank"
            />
          </div> */}
            <h3 className="connected"> Connected </h3>

            <div className="clients">
              {clients.map((client) => (
                <span className="client">
                  <Avatar
                    className="avatar"
                    name={client.username}
                    size="50"
                  ></Avatar>
                  {/* <span className="client-name"> {client.username}</span> */}
                </span>
              ))}
            </div>
            {/* <div className="clients">{JSON.stringify(clients)}</div> */}
          </div>

          <div className="leave-room">
            <button className="leave-room-btn">LEAVE ROOM</button>
            {/* <button onClick={handleLeave}>Leave</button> */}
          </div>
        </div>

        {/* --------------------------------------------------------------------------------------- */}

        {/* right side  */}
        <div className="main_editor">
          <div className="top-editor">
            <button
              // className="border-solid border-4 border-indigo-500 my-5 px-5 bg-blue-200 rounded-md "
              className="submit-code"
              type="submit"
              onClick={handleCodeSubmit1}
            >
              Submit
            </button>
            {/* Select language */}
            {/* <div>Language</div> */}
            <select
              id="select_lang"
              value={current_language}
              onChange={(e) => {
                curr_language_ref.current = e.target.value;
                // setcurrent_language(curr_language_ref);
                socketReference.current.emit("change_lang", {
                  id,
                  userName: location.state.userName,
                  lang: curr_language_ref.current,
                });

                socketReference.current.on(
                  "change_lang",
                  ({ userName, id, lang }) => {
                    setcurrent_language(lang);
                    console.log("change_lang [[[[[[[[[[[[[[[[[[   ", lang);
                  }
                );
                // });
                // changeLang(e);
              }}
            >
              <option onChange={changeLang}>{current_language}</option>
              <option>{current_language === "cpp" ? "py" : "cpp"}</option>
            </select>
          </div>
          {/* ground */}
          <textarea id="editor"></textarea>
          {/* output */}
          <div className="bottom-editor">
            <span>OUTPUT</span>
            {status}
            {output !== ""
              ? output.map((e) => (e === "\r\n" ? <br /> : <span>{e}</span>))
              : ""}
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeGround;
