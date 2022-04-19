<div className=" editor_container">
  {/* left side   */}
  <div className="container side_block">
    <div className="side_inner">
      <h3>Connected</h3>
      <div className="clients">
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

    <button className="leave-room-btn">LEAVE ROOM</button>
  </div>
  {/* --------------------------------------------------------------------------------------- */}
  {/* main_editor  */}
  <div className="outer">
    <div className="top-editor">
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
      <button
        // className="border-solid border-4 border-indigo-500 my-5 px-5 bg-blue-200 rounded-md "
        className="submit-code"
        type="submit"
        onClick={handleCodeSubmit1}
      >
        Submit
      </button>
    </div>
    <div className="main_editor">
      {/* main-editor */}
      <div className="main-editor">
        <textarea id="editor"></textarea>
      </div>
      {/* bottom-editor */}
      <div className="bottom-editor">
        <span>OUTPUT</span>
        <div className="output-status">{status}</div>
        <div className="output">
          {output !== ""
            ? output.map((e) => (e === "\r\n" ? <br /> : <span>{e}</span>))
            : ""}
        </div>
      </div>
    </div>
  </div>
</div>;

// home
<>
  <div className="container">
    {/* room  */}
    <div className="room_wraper">
      <div className="room_form">
        {/* <div className="logo"> */}
        <img className="logo-img" src="/logo.jpg" alt="logo" target="_blank" />
        {/* </div> */}
        <div className="input_here">
          <div className="heading-enter-room"> Enter invitation code </div>
          <input
            type="text"
            className="inputBox"
            placeholder="ROOM ID"
            value={room_id}
            onChange={(e) => setroom_id(e.target.value)}
          />
          <div className="heading-enter-name"> Enter your name </div>
          <input
            type="text"
            className="inputBox"
            placeholder="USER NAME"
            value={userName}
            onChange={(e) => setuserName(e.target.value)}
          />
          <button onClick={submit_form} className="submit_form" type="submit">
            JOIN
          </button>
          {/* generate new room */}
          <div className="heading-create-room">
            create new room &nbsp;
            <span onClick={generate_room_id} className="create-room-btn">
              click
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</>;
