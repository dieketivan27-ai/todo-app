import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { AuthGuard } from './guards/auth.guard';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FocusComponent } from './components/focus/focus.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { GoalsDashboardComponent } from './components/goals/goals-dashboard.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { PlanningComponent } from './components/planning/planning.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'focus', component: FocusComponent },
      { path: 'tasks', component: TaskListComponent },
      { path: 'goals', component: GoalsDashboardComponent },
      { path: 'projects', component: ProjectsComponent },
      { path: 'planning', component: PlanningComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
