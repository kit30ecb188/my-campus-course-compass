export type PastQuestion = {
  course: string;
  unit: number;
  marks: 2 | 5 | 10 | 16;
  college: string;
  session: string;
  text: string;
};

export const SAMPLE_COURSES = [
  { code: "EC3301", title: "Semiconductor Devices" },
  { code: "EC3402", title: "Power & Optoelectronic Devices" },
];

export const SESSIONS = ["Nov/Dec 2024", "Apr/May 2024", "Nov/Dec 2023"];
export const COLLEGES = ["Anna University", "PSG Tech", "CIT Coimbatore", "VIT Vellore"];

export const QUESTIONS: PastQuestion[] = [
  { course: "EC3301", unit: 1, marks: 2, college: "Anna University", session: "Nov/Dec 2024", text: "Differentiate between conductors, insulators and semiconductors using energy band diagrams." },
  { course: "EC3301", unit: 1, marks: 16, college: "Anna University", session: "Apr/May 2024", text: "Explain intrinsic and extrinsic semiconductors. Derive the expression for conductivity of an intrinsic semiconductor." },
  { course: "EC3301", unit: 1, marks: 10, college: "PSG Tech", session: "Nov/Dec 2023", text: "What is Hall effect? Derive the expression for Hall coefficient and list its applications." },
  { course: "EC3301", unit: 2, marks: 16, college: "Anna University", session: "Nov/Dec 2024", text: "Explain the formation of depletion region in a PN junction and derive the expression for barrier potential." },
  { course: "EC3301", unit: 2, marks: 16, college: "CIT Coimbatore", session: "Apr/May 2024", text: "Draw and explain the V-I characteristics of a PN junction diode. Write the diode current equation." },
  { course: "EC3301", unit: 2, marks: 2, college: "Anna University", session: "Nov/Dec 2023", text: "Define transition capacitance and diffusion capacitance." },
  { course: "EC3301", unit: 3, marks: 16, college: "PSG Tech", session: "Nov/Dec 2024", text: "Explain Zener and avalanche breakdown. Design a Zener diode voltage regulator." },
  { course: "EC3301", unit: 3, marks: 2, college: "VIT Vellore", session: "Apr/May 2024", text: "What is a Schottky barrier diode? Mention two applications." },
  { course: "EC3301", unit: 4, marks: 16, college: "Anna University", session: "Nov/Dec 2023", text: "Explain the input and output characteristics of a BJT in CE configuration." },
  { course: "EC3301", unit: 4, marks: 10, college: "CIT Coimbatore", session: "Apr/May 2024", text: "Explain the Early effect and its consequences in a BJT." },
  { course: "EC3301", unit: 5, marks: 16, college: "Anna University", session: "Nov/Dec 2024", text: "With neat diagrams explain the construction and working of an enhancement-type MOSFET." },
  { course: "EC3301", unit: 5, marks: 5, college: "VIT Vellore", session: "Nov/Dec 2023", text: "Compare JFET and MOSFET." },
  { course: "EC3402", unit: 1, marks: 16, college: "Anna University", session: "Apr/May 2024", text: "Explain the two-transistor model of SCR and its V-I characteristics." },
  { course: "EC3402", unit: 1, marks: 10, college: "PSG Tech", session: "Nov/Dec 2023", text: "Explain the construction and working of DIAC and TRIAC." },
  { course: "EC3402", unit: 2, marks: 16, college: "Anna University", session: "Nov/Dec 2024", text: "Explain UJT relaxation oscillator with a neat circuit and waveforms." },
  { course: "EC3402", unit: 3, marks: 16, college: "CIT Coimbatore", session: "Apr/May 2024", text: "Explain the working of LED, photodiode and phototransistor." },
  { course: "EC3402", unit: 3, marks: 5, college: "VIT Vellore", session: "Nov/Dec 2024", text: "Explain the V-I characteristics of a solar cell." },
  { course: "EC3402", unit: 5, marks: 10, college: "Anna University", session: "Nov/Dec 2023", text: "What is an opto-coupler? Explain its working and applications." },
];
