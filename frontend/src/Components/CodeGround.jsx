import React, { useState, useEffect, useRef } from "react";
import "./Home.css";
import { init_socket } from "./SocketIO";
import template from "./Template";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import Codemirrior from "codemirror";
import "codemirror/mode/clike/clike";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import Avatar from "react-avatar";
import Drawer from "@mui/material/Drawer";

const CodeGround = () => {
  // state's

  const [code, setcode] = useState();
  const [output, setoutput] = useState([]);
  const [current_language, setcurrent_language] = useState("cpp");
  const [status, setstatus] = useState("");
  const [clients, setClients] = useState([]);

  //

  const location = useLocation();
  const { id } = useParams();
  const Navigate = useNavigate();

  //  socket-reference

  let socketReference = useRef(null);
  let editorRef = useRef(null);
  let codeRef = useRef(null);
  let curr_language_ref = useRef("cpp");

  // setting default template
  useEffect(() => {
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
    socketReference.current.emit("change_lang", {
      id,
      userName: location.state.userName,
      lang: curr_language_ref.current,
    });

    socketReference.current.on("change_lang", ({ userName, id, lang }) => {
      setcurrent_language(lang);
    });
  };

  // codemirror

  useEffect(() => {
    const init = async () => {
      editorRef.current = Codemirrior.fromTextArea(
        document.getElementById("editor"),
        {
          mode: { name: "clike", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      // editorRef.current.setSize(700, 200);
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
      setoutput([]);
      setstatus("RUNNING...");

      if (!payload || CODE === "") {
        console.log("nopayload found");
        setstatus("no code found");
        return;
      }

      const res = await fetch("http://localhost:3031/run", payload);

      const JOBID = await res.json();
      if (JOBID === undefined || res.status == 500) {
        console.log("job id is wrong");
        setstatus("");
        return;
      }
      // long - pooling
      let intervalID = setInterval(async () => {
        let rec = await fetch(`http://localhost:3031/status/${JOBID["jobID"]}`);
        let rec_data = await rec.json();

        // in case of error in code
        if (rec_data.success === false) {
          let value = rec_data.response.output;
          setstatus("WRONG");

          let v = value.split("\\r\\n");
          setoutput(v);
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
            let value = rec_data.response.output;
            setstatus("");
            value = JSON.stringify(value);
            // console.log("before : ", value);

            // let v = value.split("\r\n");
            let v = value.split("\\r\\n");

            // value = value.replace("\r\n", "*");
            // console.log("after : ", v);
            let temp = v[0];
            let x = v[0].split(`\"`);
            v[0] = x[1];
            let y = v[v.length - 1].split(`\"`);
            // console.log("y : ", y);
            v[v.length - 1] = y[0];
            console.log("len : ", v[0].length);
            setoutput(v);
            // console.log("afterafterafter : ", v);

            clearInterval(intervalID);
          }
        }
      }, 1000);
    } catch (error) {
      alert("Error while connecting to server!!!");
    }
  };

  const handleCodeSubmit1 = () => {
    // console.log("handleCodeSubmit1 : ", curr_language_ref.current);
    // console.log("currlang: ,", current_language);
    curr_language_ref.current = current_language;
    socketReference.current.emit("output", {
      id,
      code: codeRef.current,
      current_language: current_language,
    });
  };


  const handle_leave_room = () => {
    if (socketReference.current) socketReference.current.emit("leave-room");
    Navigate("/");
    //  socketReference.current.on("disconnected", (data) => {
    //    setClients((curr_list_of_users) => {
    //      return curr_list_of_users.filter(
    //        (clinet) => clinet.socketID !== data.socketID
    //      );
    //    });
    //    // alert(`userName : ${data.userName} left`);
    //  });
  };

  let ishidden = true;
  //
  function handle_window_size_change() {
    if (window.innerWidth > 700) {
      ishidden = true;
      document.querySelector(".aside").style.display = "flex";
      document.querySelector(".hidden-aside").style.display = "none";
    } else if (window.innerWidth < 700) {
      ishidden = true;
      document.querySelector(".aside").style.display = "none";
      document.querySelector(".hide-pannel").children[0].className =
        "fas fa-bars";
    }
  }

  window.onresize = handle_window_size_change;

  const printOutput = () => {
    console.log("newOut >> : ", output);
    var newstr = JSON.stringify(output);
    console.log(newstr);
    // for (var i = 0; i < output.length; i++)
    //   if (!(output[i] == "\n" || output[i] == "\r")) newstr += output[i];
    // // let newOut = output.replace(/[\r\n]+/gm, "*");
    // console.log("newOut : ", newstr);
    // let newOutput = Array.from(output);
    // let OUTPUT = [];
    // for (let i = 0; i < newOutput.length-1; i++) {
    //   if(newOutput[i] == " " && newOutput[i+1] == "\" ){
    //     // OUTPUT.push(newOutput[i]);
    //   }
    // }
  };

  return (
    <>
      <div className=" mainWrap">
        {/* left side   */}
        <div className="aside">
          <div className="asideInner">
            <h3>Connected</h3>
            <div className="clientsList">
              {clients.map((client) => (
                <div className="client">
                  <Avatar
                    className="avatar"
                    name={client.username}
                    size="50"
                    round="14px"
                    key={client.socketID}
                  ></Avatar>
                  {/* <div className="client-name"> {client.username}</div> */}
                </div>
              ))}
            </div>
          </div>

          <button className="btn leaveBtn" onClick={handle_leave_room}>
            LEAVE ROOM
          </button>
        </div>
        {/* --------------------------------------------------------------------------------------- */}
        {/* main_editor  */}
        <div className="outer-outer">
          <div className="hidden-aside">
            <div className="hidden-asideInner">
              <div className="hidden-clientsList">
                {clients.map((client) => (
                  <div className="hidden-client">
                    <Avatar
                      // className="avatar"
                      name={client.username}
                      size="30"
                      round="14px"
                      key={client.socketID}
                    ></Avatar>
                  </div>
                ))}
              </div>
            </div>
            <button className="">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
          <div className="top-editor">
            {/* ------------------------------------- */}
            <div
              className="hide-pannel"
              onClick={(e) => {
                if (ishidden) {
                  document.querySelector(".hidden-aside").style.display =
                    "flex";
                  document.querySelector(".hide-pannel").children[0].className =
                    "fas fa-times";
                  ishidden = false;
                } else {
                  ishidden = true;
                  document.querySelector(".hidden-aside").style.display =
                    "none";
                  document.querySelector(".hide-pannel").children[0].className =
                    "fas fa-bars";
                }
              }}
            >
              <i class="fas fa-bars"></i>

              {/* ------------------------------------- */}

              {/* Menu */}
            </div>
            {/* Select language */}
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
                  }
                );
              }}
            >
              <option onChange={changeLang}>{current_language}</option>
              <option>{current_language === "cpp" ? "py" : "cpp"}</option>
            </select>
            <button
              className="submit-code"
              type="submit"
              onClick={handleCodeSubmit1}
            >
              Run
            </button>
          </div>
          <div className="outer">
            {/* ------------------------------------------------------------------------ */}
            <textarea id="editor"></textarea>
            {/*---------------------------------------- OUTPUT---------------------------- */}
            <div className="bottom-editor">
              <span className="console-output">OUTPUT</span>
              <div className="output-status">{status}</div>
              <div className="output">
                {/* {output !== ""
                  ? output.map((e) =>
                      e === "\r\n" ? <br /> : <span>{e}</span>
                    )
                  : ""} */}
                {/* {
                output.replace("" , "")
                } */}
                {/* {Array.from(output).map((e) => {
                  // e === "\r\n" ? <br /> : <span>{e}</span>;
                  console.log("e : ", e);
                })} */}
                {/* {output} */}
                {
                  // printOutput()
                  // output.map((e) => {
                  //   <div>e</div>;
                  // })
                  // output !== []
                  //   ? output.map((e) => {
                  //       <span>e</span>;
                  //     })
                  //   : []
                  output.map((value) => {
                    return (
                      <>
                        <div>{value}</div>
                        {/* <br /> */}
                      </>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeGround;

//  {
//    /* <div className="editor-logo">
//               <img
//                 // className="logo-img"
//                 src="/logo.jpg"
//                 alt="logo"
//                 target="_blank"
//               />
//             </div> */
//  }
