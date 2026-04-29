import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home';
import { DoctorsComponent } from './doctors/doctors';
import { ServicesComponent } from './services/services';
import { ContactComponent } from './contact/contact';
import { LoginComponent } from '../auth/login/login';
import { AboutComponent } from './about/about';
import { ForgotPasswordComponent } from '../auth/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from '../auth/verify-email/verify-email.component';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password';

const routes: Routes = [

  {
    path: '',
    component: HomeComponent
  },

  {
    path: 'doctors',
    component: DoctorsComponent
  },

  {
    path: 'services',
    component: ServicesComponent
  },

  {
    path: 'contact',
    component: ContactComponent
  },

  {
    path: 'about',
    component: AboutComponent
  },

  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },

  {
    path: 'verify-email',
    component: VerifyEmailComponent
  },

  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },

  {
    path: 'reset-password/:token',
    component: ResetPasswordComponent
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule {}
