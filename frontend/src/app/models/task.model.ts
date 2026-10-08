export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'LATE';

export type FreqType = 'once' | 'weekly_until_done';

export interface SubTask {
  id: number;
  task_id: number;
  titre: string;
  terminee: boolean;
  ordre: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  category: string;
  deadline?: string;
  start_time?: string;
  end_time?: string;
  goal_id?: number;
  freq_type?: FreqType;
  recurrence_hebdomadaire?: boolean;
  jours_assignes?: string[] | null;
  action_index?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  subtasks?: SubTask[];
}

export interface PlanningSlot extends Task {
  is_action_variable: boolean;
  is_generated_slot: boolean;
  goal_title?: string | null;
  goal_color?: string | null;
  occurrence_date?: string;
  task_deadline?: string | null;
  is_overdue?: boolean;
  is_completed_occurrence?: boolean;
  // champs file séquentielle
  queue_state?: 'active' | 'upcoming' | 'completed' | 'overdue' | null;
  // subtasks est déjà hérité de Task (SubTask[]) — pas besoin de le redéclarer
  current_subtask_id?: number | null;
}


export interface WeekPlanning {
  week: {
    number: number;
    year: number;
    start: string;
    end: string;
    day_labels: string[];
  };
  slots: PlanningSlot[];
  by_day: Record<string, PlanningSlot[]>;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority: Priority;
  category: string;
  deadline?: string;
  start_time?: string;
  end_time?: string;
}

export interface TaskUpdate extends Partial<TaskCreate> {
  status?: Status;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  late: number;
  completionRate: number;
}

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  category: string;
  sortBy: string;
  order: string;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute'
};

export const STATUS_LABELS: Record<Status, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
  LATE: 'En retard'
};

export const CATEGORIES = [
  'Général', 'Travail', 'Personnel', 'Dev', 'Études',
  'Réunions', 'Administratif', 'Santé', 'Projets'
];

// ──── Objectifs ────────────────────────────────────────────────

export interface GoalStats {
  annualDone: number;
  annualPct: number;
  monthDone: number;
  monthlyPct: number;
  weekDone: number;
  weeklyPct: number;
  weeklyTarget: number;
  monthlyTarget: number;
  idealPacePct: number;
  evolutionRate: number;
  isLate: boolean;
  currentWeek: number;
}

export interface WeeklyPoint {
  week: number;
  actual: number;
  ideal: number;
}

export type GoalType = 'habit' | 'actions';

export interface Goal {
  id: number;
  title: string;
  category: string;
  annual_target: number;
  year: number;
  color: string;
  description?: string;
  goal_type?: GoalType;
  created_at: string;
  updated_at: string;
  stats: GoalStats;
  weeklyData: WeeklyPoint[];
}

export interface ActionVariableCreate {
  title: string;
  jours_assignes?: string[];
}

export interface GoalCreate {
  title: string;
  category: string;
  annual_target: number;
  year: number;
  color: string;
  description?: string;
  goal_type?: GoalType;
  action_variables?: (string | ActionVariableCreate)[];
}

export interface DashboardSummary {
  totalGoals: number;
  lateCount: number;
  dailyAlertsCount: number;
  overdueCount: number;
  currentWeek: number;
  currentMonth: number;
  year: number;
}

export interface GoalDashboard {
  goals: Goal[];
  lateGoals: Goal[];
  dailyAlerts: Task[];
  overdueTasks: Task[];
  summary: DashboardSummary;
}

export const GOAL_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#f43f5e', '#14b8a6'
];
