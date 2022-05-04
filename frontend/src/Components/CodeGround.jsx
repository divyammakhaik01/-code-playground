import React, { useState, useEffect, useRef } from "react";
import "./Home.css";
import { init_socket } from "./SocketIO";
import template from "./Template";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import Codemirrior from "codemirror";
import "codemirror/mode/clike/clike";
import "codemirror/mode/python/python";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
// import "codemirror/theme/";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import Avatar from "react-avatar";
import "codemirror/keymap/sublime";
import "codemirror/addon/hint/show-hint";

const current_mode = {
  cpp: "clike",
  c: "clike",
  py: "python ",
};

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

    console.log("change lang...........");

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
          mode: {
            // name: `${current_mode[current_language]}`,
            name: "text/x-csrc",
            json: true,
            singleLineStringErrors: true,
          },
          // theme: "dracula",

          theme: "monokai",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          lineWrapping: true,
          keyMap: "sublime",
          autocorrect: true,
          extraKeys: { "Ctrl-Space": "autocomplete" },
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
          console.log("enter*******************************************");
          setcode(code);

          handleCodeSubmit(code, lang);
        });
      }
    }
    CODECHANGE();
  }, [socketReference.current]);

  // handle Code Submit
  const handleCodeSubmit = async (CODE, lang) => {
    console.log(" -------- >>>>>>>>>>>>>   : ", lang);
    console.log(" -------- >>>>>>>>>>>>>   : ", curr_language_ref.current);
    console.log(" -------- before lang : ", current_language);
    setcurrent_language(lang);
    console.log(" -------- after lang : ", current_language);
    let payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Accept: "application/json",
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

      const res = await fetch(
        "https://codeplayground-111.herokuapp.com/api/run",
        payload
      );

      const JOBID = await res.json();
      if (JOBID === undefined || res.status == 500) {
        console.log("job id is wrong");
        setstatus("");
        return;
      }
      // long - pooling
      let intervalID = setInterval(async () => {
        let rec = await fetch(
          `https://codeplayground-111.herokuapp.com/api/status/${JOBID["jobID"]}`
        );
        let rec_data = await rec.json();
        console.log("curr_lang>>>>>>>>>> : ", current_language);
        console.log("rec_data  ", rec_data);
        // in case of error in code
        if (rec_data.success === false) {
          let value = rec_data.response.output;
          setstatus("");

          let v = value.split("\\r\\n");

          console.log("> ", v);
          if (v.length === 1) {
            console.log("Runtime  : error : ", v);
            setoutput(["RUNTIME ERROR"]);
            // clearInterval(intervalID);
          } else {
            let store = [];
            console.log("::::::::::::::::::::  , ", JOBID.jobID);
            for (let i = 1; i < v.length; i++) {
              console.log("before :  ", v[i]);
              console.log("curr_lang : ", current_language);
              let x = v[i].split(`.${curr_language_ref.current}`);
              // let x = v[i].split(`.${current_language}:`);
              console.log("after :  ", x);
              if (x.length == 1) store.push(x[0]);
              else store.push(x[1]);
            }
            setoutput(store);
            // clearInterval(intervalID);
          }
          // setoutput(v);
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
      console.log("error : ", error);
      alert("Error while connecting to server!!!");
      setstatus("");
    }
  };

  const handleCodeSubmit1 = async () => {
    // console.log("handleCodeSubmit1 : ", curr_language_ref.current);
    // console.log("currlang: ,", current_language);
    curr_language_ref.current = current_language;
    console.log(
      "click run key  ..................... ",
      curr_language_ref.current
    );
    console.log("socket : ", socketReference.current);
    if (!socketReference.current) {
      // socketReference.current = await init_socket();
      console.log("%%%");
    }
    socketReference.current.emit("check");
    socketReference.current.on("check", () => {
      console.log("check*******************************************");
    });
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
  let mobile_view_flag = false;

  //
  function handle_window_size_change() {
    if (window.innerWidth > 700) {
      ishidden = true;
      document.querySelector(".aside").style.display = "flex";
      document.querySelector(".hidden-aside").style.display = "none";
      document.querySelector(".outer-outer").style.removeProperty("filter");
      document.querySelector("body").style.removeProperty("overflow");
      document.querySelector(".hide-pannel1").style.display = "none";
      document.querySelector(".hide-pannel").style.display = "none";
    } else if (window.innerWidth < 700) {
      // document.querySelector(".hide-pannel1").style.display = "flex";
      document.querySelector(".hide-pannel").style.display = "flex";
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
  };
  function handle_mobile_view() {
    document.querySelector(".outer-outer").style.filter = "blur(8px)";
    document.querySelector(".outer-outer").style.height = "100%";
    document.querySelector("body").style.overflow = "hidden";
  }

  async function handleCopyRoomID() {
    try {
      await navigator.clipboard.writeText(id);
    } catch (error) {
      console.log("error while copying roomid");
    }
  }

  return (
    <>
      <div className=" mainWrap">
        {/* left side   */}
        <div className="aside">
          <div className="asideInner">
            {/* <img src="https://img.icons8.com/glyph-neue/64/000000/code.png" /> */}

            <h3 className="mobile-view-sidebar">
              <h3 style={{ "font-family": "cursive" }}> Connected </h3>
              {/*  */}
              <div
                style={{ display: "none" }}
                className="hide-pannel1"
                onClick={(e) => {
                  if (ishidden) {
                    document.querySelector(".aside").style.display = "flex";
                    document.querySelector(
                      ".hide-pannel1"
                    ).children[0].className = "fas fa-times";

                    ishidden = false;
                  } else {
                    ishidden = true;
                    document.querySelector(".aside").style.display = "none";
                    document.querySelector(
                      ".hide-pannel1"
                    ).children[0].className = "fas fa-times";
                    document.querySelector(".hide-pannel").style.display =
                      "flex";
                    mobile_view_flag = false;
                    document
                      .querySelector(".outer-outer")
                      .style.removeProperty("filter");
                    // document.querySelector(".outer-outer").style.height = "100%";
                    document
                      .querySelector("body")
                      .style.removeProperty("overflow");
                    document.querySelector(
                      ".hide-pannel"
                    ).children[0].className = "fas fa-bars";
                  }
                }}
              >
                <i class="fas fa-bars"></i>
                {/* ------------------------------------- */}
                {/* Menu */}
              </div>
              {/*  */}
            </h3>
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
                  // document.querySelector(".hidden-aside").style.display =
                  //   "flex";
                  // document.querySelector(".hide-pannel").children[0].className =
                  //   "fas fa-times";
                  document.querySelector(
                    ".hide-pannel1"
                  ).children[0].className = "fas fa-times";
                  document.querySelector(".aside").style.display = "flex";
                  document.querySelector(".hide-pannel1").style.display =
                    "flex";
                  mobile_view_flag = true;
                  document.querySelector(".hide-pannel").children[0].className =
                    "fas fa-times";
                  document.querySelector(".hide-pannel").style.display = "none";
                  ishidden = false;

                  //
                  handle_mobile_view();
                  //
                } else {
                  ishidden = true;
                  // document.querySelector(".hidden-aside").style.display =
                  //   "none";
                  // document.querySelector(
                  //   ".hide-pannel"
                  // ).children[0].className = "fas fa-bars";

                  document.querySelector(".aside").style.display = "none";
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

              <option onClick={changeLang}>
                {current_language === "cpp"
                  ? "C"
                  : current_language === "C"
                  ? "py"
                  : "cpp"}
              </option>
              <option onClick={changeLang}>
                {current_language === "cpp"
                  ? "py"
                  : current_language === "C"
                  ? "cpp"
                  : "C"}
              </option>
            </select>
            <button
              className="submit-code"
              type="submit"
              onClick={handleCodeSubmit1}
            >
              {/* <i class="fa-solid fa-play"></i> */}
              <div className="btn-inner">
                <span> RUN</span>
                <img
                  style={{ width: "2rem" }}
                  src="https://img.icons8.com/ios-glyphs/30/000000/sort-right.png"
                />
              </div>
            </button>

            <button
              className="copy-code"
              type="submit"
              onClick={handleCopyRoomID}
            >
              <div className="btn-inner">
                <span className="id_copy-text">Copy Room ID</span>

                <img
                  className="id_copy-img"
                  style={{ width: "2rem" }}
                  src="https://img.icons8.com/small/96/000000/copy.png"
                />
              </div>
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
