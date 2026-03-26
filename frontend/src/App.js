import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout        from './components/Layout';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Students      from './pages/Students';
import Teachers      from './pages/Teachers';
import Classes       from './pages/Classes';
import Exams         from './pages/Exams';
import Fees          from './pages/Fees';
import Events        from './pages/Events';
import Announcements from './pages/Announcements';
import Reports       from './pages/Reports';
import Subjects      from './pages/Subjects';
import Settings      from './pages/Settings';
import UserManagement from './pages/UserManagement';
import Graduation    from './pages/Graduation';
import StudentPortal from './pages/StudentPortal';
import SHSHub           from './pages/shs/SHSHub';
import StrandManagement from './pages/shs/StrandManagement';
import GradingSystem    from './pages/shs/GradingSystem';
import ReportCards      from './pages/shs/ReportCards';
import { WorkImmersion, BehaviorLog } from './pages/shs/SHSModules';
import ClearanceManagement from './pages/shs/ClearanceManagement';
import DepEdForms from './pages/shs/DepEdForms';

// Role-based protection
const Private = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Layout /></Private>}>

          {/* Student portal — students land here */}
          <Route index element={<RoleBasedHome />} />

          {/* Student-only */}
          <Route path="my-portal" element={<Private roles={['student']}><StudentPortal /></Private>} />

          {/* Staff, Teacher, Admin */}
          <Route path="dashboard"     element={<Private roles={['admin','teacher','staff']}><Dashboard /></Private>} />
          <Route path="students"      element={<Private roles={['admin','teacher','staff']}><Students /></Private>} />
          <Route path="teachers"      element={<Private roles={['admin','staff']}><Teachers /></Private>} />
          <Route path="classes"       element={<Private roles={['admin','teacher','staff']}><Classes /></Private>} />
          <Route path="exams"         element={<Private roles={['admin','teacher','staff']}><Exams /></Private>} />
          <Route path="fees"          element={<Private roles={['admin','staff']}><Fees /></Private>} />
          <Route path="events"        element={<Private roles={['admin','teacher','staff']}><Events /></Private>} />
          <Route path="announcements" element={<Private roles={['admin','teacher','staff']}><Announcements /></Private>} />
          <Route path="reports"       element={<Private roles={['admin','staff']}><Reports /></Private>} />
          <Route path="subjects"      element={<Private roles={['admin','teacher']}><Subjects /></Private>} />
          <Route path="settings"      element={<Private roles={['admin']}><Settings /></Private>} />

          {/* Admin-only */}
          <Route path="users"         element={<Private roles={['admin']}><UserManagement /></Private>} />
          <Route path="graduation"    element={<Private roles={['admin']}><Graduation /></Private>} />

          {/* SHS */}
          <Route path="shs"                 element={<Private roles={['admin','teacher','staff']}><SHSHub /></Private>} />
          <Route path="shs/strands"         element={<Private roles={['admin','teacher','staff']}><StrandManagement /></Private>} />
          <Route path="shs/grades"          element={<Private roles={['admin','teacher']}><GradingSystem /></Private>} />
          <Route path="shs/reportcards"     element={<Private roles={['admin','teacher','staff']}><ReportCards /></Private>} />
          <Route path="shs/clearance"       element={<Private roles={['admin','teacher','staff']}><ClearanceManagement /></Private>} />
          <Route path="shs/immersion"       element={<Private roles={['admin','teacher']}><WorkImmersion /></Private>} />
          <Route path="shs/behavior"        element={<Private roles={['admin','teacher','staff']}><BehaviorLog /></Private>} />
          <Route path="shs/deped"           element={<Private roles={['admin','staff']}><DepEdForms /></Private>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Redirect based on role
function RoleBasedHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <Navigate to="/my-portal" replace />;
  return <Navigate to="/dashboard" replace />;
}
