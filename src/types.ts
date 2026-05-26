/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EventPhoto {
  id: string;
  base64: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export type EventStatus = 'Direncanakan' | 'Berlangsung' | 'Selesai';

export interface JobEvent {
  id: string;
  date: string; // YYYY-MM-DD
  day: number;   // 1-31
  month: number; // 1-12 (Jan = 1, Dec = 12)
  year: number;  // Year e.g., 2026
  eventName: string;
  team: string[]; // List of person names
  location: string;
  notes: string;
  photos: EventPhoto[];
  status: EventStatus;
  createdAt: string;
}

export interface Teammate {
  id: string;
  name: string;
  role?: string;
  isActive: boolean;
}

export interface AppStats {
  totalEvents: number;
  completedEvents: number;
  ongoingEvents: number;
  plannedEvents: number;
  uniqueLocations: number;
  totalTeamMembers: number;
}
