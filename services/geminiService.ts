import { GoogleGenAI } from "@google/genai";
import { AttendanceLog, Student, AttendanceType } from "../types";

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

export const generateAttendanceSummary = async (
  logs: AttendanceLog[],
  students: Student[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare the data context for the model
    const todayStr = new Date().toLocaleDateString();
    
    // Group logs by student for easier analysis by the model
    const summaryData = students.map(student => {
      const studentLogs = logs.filter(l => l.studentId === student.id);
      const arrival = studentLogs.find(l => l.type === AttendanceType.ARRIVAL);
      const departure = studentLogs.find(l => l.type === AttendanceType.DEPARTURE);
      
      return {
        name: student.name,
        grade: student.grade,
        status: arrival ? (departure ? 'Completed Day' : 'Present (On Campus)') : 'Absent',
        arrivalTime: arrival ? formatTime(arrival.timestamp) : 'N/A',
        departureTime: departure ? formatTime(departure.timestamp) : 'N/A'
      };
    });

    const prompt = `
      Analyze the following school attendance data for today (${todayStr}).
      
      Data:
      ${JSON.stringify(summaryData, null, 2)}
      
      Please provide a professional, concise executive summary for the school principal.
      Include:
      1. Overall attendance rate (percentage).
      2. List of late arrivals (assume classes start at 8:30 AM).
      3. Notable patterns or absent students.
      4. A brief status of who is currently on campus versus who has left.
      
      Keep the tone formal and informative. Use Markdown for formatting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate summary at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating attendance summary. Please ensure your API key is configured correctly.";
  }
};
