export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  summary: string;
  stakeholders: string[];
  actionItems: string[];
  timeWeight: number; // relative weight of this section's duration
}

export interface MeetingAgenda {
  meetingTitle: string;
  meetingGoal: string;
  agendaItems: AgendaItem[];
}

export interface GenerateAgendaResponse {
  success: boolean;
  data: MeetingAgenda;
  extractedLength: number;
}
