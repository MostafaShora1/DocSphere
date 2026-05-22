import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-doctors-management',
  templateUrl: './doctors-management.html',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  styleUrls: ['./doctors-management.css']
})
export class DoctorsManagementComponent implements OnInit {

  doctors: any[] = [];
  pendingDoctors: any[] = [];
  selectedDoctor: any = null;
  showDetailsModal = false;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadDoctors();
    this.loadPendingDoctors();
  }

  loadDoctors() {
    this.apiService.getDoctors(true).subscribe(res => {
      this.doctors = res;
    });
  }

  loadPendingDoctors() {
    this.apiService.getPendingDoctors().subscribe(res => {
      this.pendingDoctors = res;
    });
  }

  viewDetails(doctor: any) {
    this.selectedDoctor = doctor;
    this.showDetailsModal = true;
  }

  closeModal() {
    this.showDetailsModal = false;
    this.selectedDoctor = null;
  }

  approve(id: string) {
    this.apiService.approveDoctor(id).subscribe(() => {
      this.loadDoctors();
      this.loadPendingDoctors();
      this.closeModal();
    });
  }

  // Other methods if needed (delete/edit can be implemented similarly)
}