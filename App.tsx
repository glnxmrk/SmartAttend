import React, { useState, useCallback } from 'react';
import { 
  Scan, 
  Users, 
  BarChart3, 
  LayoutDashboard, 
  Search,
  Sparkles,
  School,
  LogOut,
  LogIn,
  Plus,
  X
} from 'lucide-react';
import { Student, AttendanceLog, AttendanceType, Notification } from './types';
import { MOCK_STUDENTS } from './constants';
import Scanner from './components/Scanner';
import StudentCard from './components/StudentCard';
import NotificationToast from './components/NotificationToast';
import { generateAttendanceSummary } from './services/geminiService';

enum Tab {
  DASHBOARD = 'DASHBOARD',
  SCAN = 'SCAN',
  STUDENTS = 'STUDENTS',
  REPORTS = 'REPORTS'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Student State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    grade: '',
    parentName: '',
    parentPhone: ''
  });

  // Notification Handler
  const addNotification = useCallback((studentName: string, message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now().toString();
    setNotifications(prev => [{ id, studentName, message, type, timestamp: Date.now() }, ...prev]);
    // Auto remove after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Scanning Logic
  const handleScan = useCallback((data: string) => {
    const student = students.find(s => s.id === data);
    if (!student) {
      addNotification("Unknown", `Invalid QR Code: ${data}`, 'info');
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Find today's logs for this student
    const studentLogsToday = logs.filter(l => 
      l.studentId === student.id && 
      l.timestamp >= todayStart.getTime()
    );

    const hasArrived = studentLogsToday.some(l => l.type === AttendanceType.ARRIVAL);
    const hasDeparted = studentLogsToday.some(l => l.type === AttendanceType.DEPARTURE);

    let newType: AttendanceType | null = null;
    let message = "";

    if (!hasArrived) {
      newType = AttendanceType.ARRIVAL;
      message = `Arrived at school at ${new Date().toLocaleTimeString()}`;
    } else if (hasArrived && !hasDeparted) {
      // Prevent accidental double scan (debouncing logic is also in scanner, but this is logical)
      const lastLog = studentLogsToday[studentLogsToday.length - 1];
      if (Date.now() - lastLog.timestamp < 60000) return; // Ignore if scanned within last minute

      newType = AttendanceType.DEPARTURE;
      message = `Left school at ${new Date().toLocaleTimeString()}`;
    } else {
      addNotification(student.name, "Already completed attendance for today.", 'info');
      return;
    }

    // Play Success Sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {}); // Ignore interaction errors

    // Add Log
    const newLog: AttendanceLog = {
      id: Date.now().toString(),
      studentId: student.id,
      timestamp: Date.now(),
      type: newType
    };

    setLogs(prev => [newLog, ...prev]);

    // Send Notification
    const parentMsg = `Hello ${student.parentName}, this is SmartAttend. ${student.name} has ${newType === AttendanceType.ARRIVAL ? 'arrived at' : 'left'} school safely.`;
    addNotification(student.name, `SMS sent to ${student.parentPhone}: "${message}"`);
    console.log(`[SMS SIMULATION] To: ${student.parentPhone}, Body: ${parentMsg}`);
  }, [students, logs, addNotification]);

  // AI Summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const result = await generateAttendanceSummary(logs, students);
    setSummary(result);
    setIsGeneratingSummary(false);
  };

  // Add Student Logic
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name || !newStudentForm.grade || !newStudentForm.parentName) {
      alert("Please fill in all required fields");
      return;
    }

    const newStudent: Student = {
      id: `STU-${Math.floor(10000 + Math.random() * 90000)}`, // Random ID
      name: newStudentForm.name,
      grade: newStudentForm.grade,
      parentName: newStudentForm.parentName,
      parentPhone: newStudentForm.parentPhone || '+1 (555) 000-0000',
      photoUrl: `https://picsum.photos/100/100?random=${Date.now()}`
    };

    setStudents(prev => [...prev, newStudent]);
    addNotification(newStudent.name, "New student registered successfully.");
    setIsAddModalOpen(false);
    setNewStudentForm({ name: '', grade: '', parentName: '', parentPhone: '' });
  };

  // Derived State for Dashboard
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayLogs = logs.filter(l => l.timestamp >= todayStart.getTime());
  const presentCount = new Set(todayLogs.filter(l => l.type === AttendanceType.ARRIVAL).map(l => l.studentId)).size;
  const departCount = new Set(todayLogs.filter(l => l.type === AttendanceType.DEPARTURE).map(l => l.studentId)).size;
  const activeOnCampus = presentCount - departCount;

  // Render Helpers
  const renderScanner = () => (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Scan QR Code</h2>
        <p className="text-slate-500">Point the camera at a student ID card to check in/out.</p>
      </div>
      
      <Scanner onScan={handleScan} isActive={activeTab === Tab.SCAN} />
      
      <div className="max-w-md w-full bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-sm text-emerald-800">
        <p className="font-semibold flex items-center gap-2">
          <Scan className="w-4 h-4" />
          Pro Tip:
        </p>
        Ensure adequate lighting and hold the card steady for faster detection.
      </div>

      {/* Manual Simulator for demo purposes if camera fails or no QR available */}
      <div className="mt-8 pt-8 border-t w-full max-w-md">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Development Tools</p>
        <div className="grid grid-cols-2 gap-2">
          {students.slice(0, 4).map(s => (
            <button 
              key={s.id}
              onClick={() => handleScan(s.id)}
              className="px-3 py-2 text-xs bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition"
            >
              Simulate {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-emerald-100">On Campus</h3>
            <div className="p-2 bg-emerald-400/30 rounded-lg">
              <School className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold mb-1">{activeOnCampus}</div>
          <p className="text-emerald-200 text-sm">Students currently present</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-500">Total Arrivals</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <LogIn className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-800 mb-1">{presentCount}</div>
          <p className="text-slate-400 text-sm">Checked in today</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-500">Departures</h3>
            <div className="p-2 bg-orange-100 rounded-lg">
              <LogOut className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-800 mb-1">{departCount}</div>
          <p className="text-slate-400 text-sm">Checked out today</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800">Recent Activity</h3>
          <button onClick={() => setActiveTab(Tab.REPORTS)} className="text-sm text-emerald-600 font-medium hover:text-emerald-800">View All</button>
        </div>
        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No activity recorded yet today.</div>
          ) : (
            logs.slice(0, 5).map(log => {
              const student = students.find(s => s.id === log.studentId);
              return (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.type === AttendanceType.ARRIVAL ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <div>
                      <p className="font-medium text-slate-800">{student?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{student?.grade}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${log.type === AttendanceType.ARRIVAL ? 'text-green-600' : 'text-orange-600'}`}>
                      {log.type === AttendanceType.ARRIVAL ? 'Arrived' : 'Departed'}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderStudents = () => {
    const filteredStudents = students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Student Directory</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
              />
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Student</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map(student => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Daily Attendance Report</h2>
        <button 
          onClick={handleGenerateSummary}
          disabled={isGeneratingSummary || logs.length === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition
            ${isGeneratingSummary || logs.length === 0 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'}
          `}
        >
          <Sparkles className={`w-4 h-4 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
          {isGeneratingSummary ? 'Analyzing...' : 'Generate AI Summary'}
        </button>
      </div>

      {summary && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-slate-800 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-emerald-800 mb-4">
            <Sparkles className="w-5 h-5" />
            AI Executive Summary
          </h3>
          <div className="prose prose-sm max-w-none text-slate-700">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{summary}</pre>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Time</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Student Name</th>
                <th className="px-6 py-4 font-semibold text-slate-600">ID</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Action</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No records found for today.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const student = students.find(s => s.id === log.studentId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {student?.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {student?.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          log.type === AttendanceType.ARRIVAL 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {log.type === AttendanceType.ARRIVAL ? <LogIn size={12}/> : <LogOut size={12}/>}
                          {log.type === AttendanceType.ARRIVAL ? 'CHECK IN' : 'CHECK OUT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <span className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          Logged
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <NotificationToast notifications={notifications} removeNotification={removeNotification} />

      {/* Navigation - Sidebar on Desktop, Bottom on Mobile */}
      <nav className="md:w-64 bg-slate-900 text-slate-300 flex flex-col md:h-screen fixed md:sticky top-0 z-40 w-full shadow-xl">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Scan className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">SmartAttend</span>
        </div>

        <div className="flex-1 px-4 space-y-2 py-4 md:py-0 overflow-x-auto md:overflow-visible flex md:block whitespace-nowrap">
          <NavButton active={activeTab === Tab.DASHBOARD} onClick={() => setActiveTab(Tab.DASHBOARD)} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={activeTab === Tab.SCAN} onClick={() => setActiveTab(Tab.SCAN)} icon={<Scan />} label="Scanner" />
          <NavButton active={activeTab === Tab.STUDENTS} onClick={() => setActiveTab(Tab.STUDENTS)} icon={<Users />} label="Students & QR" />
          <NavButton active={activeTab === Tab.REPORTS} onClick={() => setActiveTab(Tab.REPORTS)} icon={<BarChart3 />} label="Reports & AI" />
        </div>
        
        <div className="hidden md:block p-6 text-xs text-slate-500 border-t border-slate-800">
          <p>© 2024 SmartAttend Sys.</p>
          <p className="mt-1">v1.2.1 • Online</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 mt-20 md:mt-0 max-w-7xl mx-auto w-full">
        {activeTab === Tab.DASHBOARD && renderDashboard()}
        {activeTab === Tab.SCAN && renderScanner()}
        {activeTab === Tab.STUDENTS && renderStudents()}
        {activeTab === Tab.REPORTS && renderReports()}
      </main>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Register New Student</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
                <input 
                  type="text" 
                  required
                  value={newStudentForm.name}
                  onChange={e => setNewStudentForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g. Alice Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade / Class</label>
                <input 
                  type="text" 
                  required
                  value={newStudentForm.grade}
                  onChange={e => setNewStudentForm(prev => ({...prev, grade: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g. 10-B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name</label>
                <input 
                  type="text" 
                  required
                  value={newStudentForm.parentName}
                  onChange={e => setNewStudentForm(prev => ({...prev, parentName: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g. Bob Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Phone (for notifications)</label>
                <input 
                  type="tel" 
                  required
                  value={newStudentForm.parentPhone}
                  onChange={e => setNewStudentForm(prev => ({...prev, parentPhone: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g. +1 555 123 4567"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 shadow-md transition"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all duration-200
      ${active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
        : 'hover:bg-slate-800 text-slate-400 hover:text-white'}
    `}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default App;