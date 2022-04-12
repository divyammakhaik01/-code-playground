import CodeGround from "./Components/CodeGround";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "./Components/Home";

const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/editor/:id" element={<CodeGround />}></Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;
