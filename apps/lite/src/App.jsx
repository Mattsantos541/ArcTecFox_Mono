import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PMPlanner from "./pages/PMPlanner";
import Header from "./components/Header";

function App() {
  return (
    <>
      <Header />
      <Router>
        <Routes>
          <Route path="/" element={<PMPlanner />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
