import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PMPlanner from "./pages/PMPlanner";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PMPlanner />} />
      </Routes>
    </Router>
  );
}

export default App;
