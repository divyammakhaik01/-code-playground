import React, { useState } from "react";
import "./Home.css";
import { v4 } from "uuid";
import { useNavigate } from "react-router-dom";

export const Home = () => {
  const [room_id, setroom_id] = useState("");
  const [userName, setuserName] = useState("");
  const navigate = useNavigate();
  const generate_room_id = (e) => {
    e.preventDefault();
    setroom_id(v4());
  };

  const submit_form = (e) => {
    e.preventDefault();
    if (!room_id || !userName) {
      alert("missing roomid or username");
      return;
    }
    navigate(`/editor/${room_id}`, {
      state: {
        userName,
      },
    });
  };

  return (
    <>
      <div className="container">
        {/* room  */}
        <div className="room_wraper">
          <div className="logo">
            <img
              className="logo-img"
              src="/logo.jpg"
              alt="logo"
              target="_blank"
            />
          </div>
          <div className="room_form">
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
            </div>
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
    </>
  );
};
