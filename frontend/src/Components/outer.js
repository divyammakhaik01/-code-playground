<div className="outer">
  <div className="top-editor">
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

        socketReference.current.on("change_lang", ({ userName, id, lang }) => {
          setcurrent_language(lang);
        });
      }}
    >
      <option onChange={changeLang}>{current_language}</option>
      <option>{current_language === "cpp" ? "py" : "cpp"}</option>
    </select>
    <button className="submit-code" type="submit" onClick={handleCodeSubmit1}>
      Submit
    </button>
  </div>
  <div className="main_editor">
    {/* main-editor */}
    {/* <div className="main-editor"> */}
    <textarea id="editor"></textarea>
    {/* </div> */}
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
</div>;
