import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Automatically generates a unique, sequential Employee ID.
 * Format: MNTSGBL-001-2026
 */
export async function generateEmployeeId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const snap = await getDocs(collection(db, "employees"));
    let maxSeq = 0;
    snap.forEach((doc) => {
      const data = doc.data();
      const empId = data.employeeId || "";
      if (empId.startsWith("MNTSGBL-")) {
        const parts = empId.split("-");
        if (parts.length === 3) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });
    const nextSeq = maxSeq + 1;
    const paddedSeq = nextSeq.toString().padStart(3, "0");
    return `MNTSGBL-${paddedSeq}-${currentYear}`;
  } catch (err) {
    console.error("Failed to generate employee ID:", err);
    return `MNTSGBL-001-${currentYear}`;
  }
}
