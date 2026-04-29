import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class AboutComponent implements OnInit {

  staff: any[] = [];
  filteredStaff: any[] = [];

  activeFilter: string = 'all';

  testimonials: any[] = [
    {
      name: 'Abdo',
      text: 'The medical staff is outstanding.',
      rating: 5
    },
    {
      name: 'Nour',
      text: 'I felt like I was with family.',
      rating: 5
    },
    {
      name: 'Mohamed Ali',
      text: 'Highly professional staff.',
      rating: 4
    }
  ];

  newName: string = '';
  newText: string = '';
  newRating: number = 5;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStaff();
  }

  // ================= Load Staff =================

  loadStaff() {
    this.http
      .get<any>('assets/medical.json')
      .subscribe(data => {

        const doctors = (data.doctors || []).map((p: any) => ({
          ...p,
          type: 'doctor'
        }));

        const nurses = (data.nurses || []).map((p: any) => ({
          ...p,
          type: 'nurse'
        }));

        const admins = (data.management || []).map((p: any) => ({
          ...p,
          type: 'admin'
        }));

        this.staff = [...doctors, ...nurses, ...admins];

        this.applyFilter('all');
      });
  }

  // ================= Filter =================

  applyFilter(type: string) {
    this.activeFilter = type;

    if (type === 'all') {
      this.filteredStaff = this.staff;
    } else {
      this.filteredStaff = this.staff.filter(p => p.type === type);
    }
  }

  // ================= Testimonials =================

  addTestimonial() {

    if (!this.newName || this.newName.length < 3) {
      alert('Enter valid name');
      return;
    }

    if (!this.newText || this.newText.length < 10) {
      alert('Enter longer comment');
      return;
    }

    this.testimonials.unshift({
      name: this.newName,
      text: this.newText,
      rating: this.newRating
    });

    this.newName = '';
    this.newText = '';
    this.newRating = 5;
  }

  deleteTestimonial(index: number) {
    this.testimonials.splice(index, 1);
  }

  getStars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

}