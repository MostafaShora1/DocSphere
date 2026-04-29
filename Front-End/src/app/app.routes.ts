import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin.guard';
import { doctorGuard } from './core/guards/doctor.guard';
import { patientGuard } from './core/guards/patient.guard';

export const routes: Routes = [

  {
    path: '',
    loadChildren: () =>
      import('./features/public/public-module')
        .then(m => m.PublicModule)
  },

  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth-module')
        .then(m => m.AuthModule)
  },

  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin-module')
        .then(m => m.AdminModule),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'doctor',
    loadChildren: () =>
      import('./features/doctor/doctor-module')
        .then(m => m.DoctorModule),
    canActivate: [authGuard, doctorGuard]
  },

  {
    path: 'patient',
    loadChildren: () =>
      import('./features/patient/patient-module')
        .then(m => m.PatientModule),
    canActivate: [authGuard, patientGuard]
  }

];