import React from 'react';
import QRCode from 'react-qr-code';
import { Student } from '../types';

interface StudentCardProps {
  student: Student;
}

const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
      <div className="bg-white p-2 rounded-lg border border-slate-100 mb-3">
        <QRCode 
          value={student.id} 
          size={120} 
          level="H"
          className="w-full h-auto"
        />
      </div>
      <div className="text-center w-full">
        <h3 className="font-bold text-slate-800 text-lg">{student.name}</h3>
        <p className="text-sm text-slate-500 font-medium">{student.id}</p>
        <span className="inline-block px-2 py-0.5 mt-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
          Grade {student.grade}
        </span>
      </div>
    </div>
  );
};

export default StudentCard;