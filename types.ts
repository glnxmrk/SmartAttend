export interface Student {
  id: string;
  name: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  photoUrl: string;
}

export enum AttendanceType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  timestamp: number;
  type: AttendanceType;
}

export interface Notification {
  id: string;
  studentName: string;
  message: string;
  type: 'success' | 'info';
  timestamp: number;
}
