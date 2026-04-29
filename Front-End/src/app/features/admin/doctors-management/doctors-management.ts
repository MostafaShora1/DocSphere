import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-doctors-management',
  templateUrl: './doctors-management.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./doctors-management.css']
})
export class DoctorsManagementComponent implements OnInit {

  doctors: any[] = [];

  doctor: any = {};

  showForm = false;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.load();
  }

  load() {

    this.dataService.getDoctors().subscribe(res => {

      this.doctors = res;

    });

  }

  add() {

    this.dataService.addDoctor(this.doctor);

    this.doctor = {};

    this.showForm = false;

    this.load();

  }

  edit(d: any) {

    this.doctor = { ...d };

    this.showForm = true;

  }

  update() {

    this.dataService.updateDoctor(
      this.doctor.id,
      this.doctor
    );

    this.doctor = {};

    this.showForm = false;

    this.load();

  }

  delete(id: string) {

    this.dataService.deleteDoctor(id);

    this.load();

  }

}