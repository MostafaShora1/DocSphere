import { Component, OnInit } from '@angular/core';
import { DataService } from '../../../core/services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-services-management',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './services-management.html',
  styleUrls: ['./services-management.css']
})
export class ServicesManagementComponent implements OnInit {

  services: any[] = [];

  doctors: any[] = [];

  service: any = {};

  showForm = false;

  isEditMode = false;

  editingId: string | null = null;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.load();
  }

  load() {

    this.dataService
      .getServices()
      .subscribe(res => {

        this.services = res;

      });

    this.dataService
      .getDoctors()
      .subscribe(res => {

        this.doctors = res;

      });

  }

  // =========================
  // FORM CONTROL
  // =========================

  openAddForm() {

    this.service = {};

    this.isEditMode = false;

    this.showForm = true;

  }

  closeForm() {

    this.showForm = false;

  }

  // =========================
  // SAVE (ADD / UPDATE)
  // =========================

  saveService() {

    if (this.isEditMode) {

      this.dataService.updateService(
        this.editingId!,
        this.service
      );

    } else {

      this.dataService.addService(
        this.service
      );

    }

    this.closeForm();

    this.load();

  }

  // =========================
  // EDIT
  // =========================

  editService(service: any) {

    this.service = { ...service };

    this.editingId = service.id;

    this.isEditMode = true;

    this.showForm = true;

  }

  // =========================
  // DELETE
  // =========================

  deleteService(id: string) {

    this.dataService.deleteService(id);

    this.load();

  }

  // =========================
  // HELPER
  // =========================

  getDoctorName(id: string) {

    return this.dataService.getDoctorName(id);

  }

}