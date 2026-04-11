export interface PredefinedRoute {
  id: string;
  name: string;
  /** [lng, lat] for each waypoint — OSRM format */
  waypoints: [number, number][];
  /** Default color for display */
  color: string;
}

export const PREDEFINED_ROUTES: PredefinedRoute[] = [
  {
    id: "route_au_samras",
    name: "Ahmedabad University → Samras Boys Hostel",
    waypoints: [
      [72.5566, 23.0335], // Ahmedabad University
      [72.5510, 23.0339], // Commerce Six Roads
      [72.5450, 23.0345], // Vijay Cross Roads
      [72.5425, 23.0350], // Helmet Circle
      [72.5400, 23.0360], // Samras Boys Hostel
    ],
    color: "#3b82f6",
  },
  {
    id: "route_au_iim",
    name: "Ahmedabad University → IIM Ahmedabad",
    waypoints: [
      [72.5566, 23.0335], // Ahmedabad University
      [72.5501, 23.0371], // Navrangpura
      [72.5413, 23.0354], // Gujarat University
      [72.5356, 23.0298], // Panjrapole
      [72.5312, 23.0333], // ATIRA
      [72.5270, 23.0270], // IIM Ahmedabad
    ],
    color: "#10b981",
  },
  {
    id: "route_rto_iskon",
    name: "RTO Circle → ISKCON Temple",
    waypoints: [
      [72.5715, 23.0645], // RTO Circle
      [72.5645, 23.0598], // Ranip
      [72.5596, 23.0487], // Wadaj
      [72.5623, 23.0401], // Usmanpura
      [72.5446, 23.0185], // Nehrunagar
      [72.5298, 23.0201], // Shivranjani
      [72.5080, 23.0300], // ISKCON Temple
    ],
    color: "#f59e0b",
  },
  {
    id: "route_cg_rto",
    name: "CG Road → RTO Circle",
    waypoints: [
      [72.5530, 23.0280], // CG Road
      [72.5560, 23.0330], // Swastik Char Rasta
      [72.5585, 23.0410], // Stadium Cross Road
      [72.5615, 23.0520], // Vadaj Terminus
      [72.5715, 23.0645], // RTO Circle
    ],
    color: "#8b5cf6",
  }
];
