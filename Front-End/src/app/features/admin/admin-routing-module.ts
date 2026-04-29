import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard';
import { DoctorsManagementComponent } from './doctors-management/doctors-management';
import { ServicesManagementComponent } from './services-management/services-management';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'doctors',
    component: DoctorsManagementComponent
  },
  {
    path: 'services',
    component: ServicesManagementComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
