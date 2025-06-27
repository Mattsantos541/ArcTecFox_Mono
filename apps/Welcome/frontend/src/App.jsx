import { Routes, Route } from 'react-router-dom'
import PMPlanner from './pages/PMPlanner'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<PMPlanner />} />
        <Route path="/pm-planner" element={<PMPlanner />} />
      </Routes>
    </div>
  )
}

export default App