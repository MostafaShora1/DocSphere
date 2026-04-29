import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Service } from '../../shared/models/service.model';
import { Doctor } from '../../shared/models/doctor.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly doctorsStorageKey = 'doctors';
  private readonly appointmentsStorageKey = 'appointments';

  private readonly initialServices: Service[] = [
    {
      id: '1',
      name: 'Dental Check',
      description: 'Basic check',
      duration: '30 min',
      price: 200,
      doctorId: '1',
      isActive: true,
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    },
    {
      id: '1',
      name: 'Dental Check',
      description: 'Basic check',
      duration: '30 min',
      price: 200,
      doctorId: '1',
      isActive: true,
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    }
  ];

  private readonly initialDoctors: Doctor[] = [
    {
      id: '1',
      name: 'Ahmed Ali',
      specialty: 'Dentistry',
      phone: '123-456-7890',
      email: 'test@example.com',
      experience: '5 years',
      rating: 4.5,
      bio: 'Experienced dentist',
      image: 'doctor.jpg',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    },
    {
      id: '1',
      name: 'Ahmed Ali',
      specialty: 'Dentistry',
      phone: '123-456-7890',
      email: 'test@example.com',
      experience: '5 years',
      rating: 4.5,
      bio: 'Experienced dentist',
      image: 'doctor.jpg',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    },
    {
      id: '1',
      name: 'Ahmed Ali',
      specialty: 'Dentistry',
      phone: '123-456-7890',
      email: 'test@example.com',
      experience: '5 years',
      rating: 4.5,
      bio: 'Experienced dentist',
      image: 'doctor.jpg',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    },
    {
      id: '1',
      name: 'Ahmed Ali',
      specialty: 'Dentistry',
      phone: '123-456-7890',
      email: 'test@example.com',
      experience: '5 years',
      rating: 4.5,
      bio: 'Experienced dentist',
      image: 'doctor.jpg',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    },
    {
      id: '1',
      name: 'Ahmed Ali',
      specialty: 'Dentistry',
      phone: '123-456-7890',
      email: 'test@example.com',
      experience: '5 years',
      rating: 4.5,
      bio: 'Experienced dentist',
      image: 'doctor.jpg',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimes: ['10:00', '14:00', '16:00']
    }
  ];

  private readonly initialAppointments: any[] = [
    {
      id: '1',
      doctorId: '1',
      serviceId: '1',
      patientName: 'Mohamed',
      date: '2026-01-01',
      time: '10:00',
      status: 'pending'
    }
  ];

  // =============================
  // SERVICES DATA
  // =============================

  private servicesSubject = new BehaviorSubject<Service[]>(
    this.initialServices
  );

  // =============================
  // DOCTORS DATA
  // =============================

  private doctorsSubject = new BehaviorSubject<Doctor[]>(
    this.readState(this.doctorsStorageKey, this.initialDoctors)
  );

  // =============================
  // APPOINTMENTS DATA
  // =============================

  private appointmentsSubject = new BehaviorSubject<any[]>(
    this.readState(this.appointmentsStorageKey, this.initialAppointments)
  );

  // =============================
  // GET AS OBSERVABLE
  // =============================

  getServices() {
    return this.servicesSubject.asObservable();
  }

  getDoctors() {
    return this.doctorsSubject.asObservable();
  }

  getAppointments() {
    return this.appointmentsSubject.asObservable();
  }

  // =============================
  // SERVICES CRUD
  // =============================

  addService(service: Service) {

    const current = this.servicesSubject.value;

    this.servicesSubject.next([
      ...current,
      {
        ...service,
        id: Date.now().toString(),
        isActive: service.isActive ?? true
      }
    ]);

  }

  updateService(id: string, service: Service) {

    const updated = this.servicesSubject.value.map(s =>
      s.id === id
        ? { ...service, id }
        : s
    );

    this.servicesSubject.next(updated);

  }

  deleteService(id: string) {

    const updated = this.servicesSubject.value.filter(
      s => s.id !== id
    );

    this.servicesSubject.next(updated);

  }

  // =============================
  // DOCTORS CRUD
  // =============================

  addDoctor(doctor: Doctor) {

    const current = this.doctorsSubject.value;

    this.setDoctors([
      ...current,
      {
        ...doctor,
        id: Date.now().toString(),
        rating: doctor.rating ?? 0
      }
    ]);

  }

  updateDoctor(id: string, doctor: Doctor) {

    const updated = this.doctorsSubject.value.map(d =>
      d.id === id
        ? { ...doctor, id }
        : d
    );

    this.setDoctors(updated);

  }

  deleteDoctor(id: string) {

    const updated = this.doctorsSubject.value.filter(
      d => d.id !== id
    );

    this.setDoctors(updated);

  }

  // =============================
  // APPOINTMENTS CRUD
  // =============================

  addAppointment(appointment: any) {

    const current = this.appointmentsSubject.value;

    this.setAppointments([
      ...current,
      {
        id: Date.now().toString(),
        status: 'pending',
        ...appointment
      }
    ]);

  }

  updateAppointment(id: string, appointment: any) {

    const updated = this.appointmentsSubject.value.map(a =>
      a.id === id
        ? { ...appointment, id }
        : a
    );

    this.setAppointments(updated);

  }

  deleteAppointment(id: string) {

    const updated = this.appointmentsSubject.value.filter(
      a => a.id !== id
    );

    this.setAppointments(updated);

  }

  // =============================
  // HELPERS
  // =============================

  getDoctorById(id: string) {

    return this.doctorsSubject.value.find(
      d => d.id === id
    );

  }

  getDoctorName(id: string): string {

    const doctor = this.doctorsSubject.value.find(
      d => d.id === id
    );

    return doctor?.name ?? 'Unknown';

  }

  getServiceById(id: string) {

    return this.servicesSubject.value.find(
      s => s.id === id
    );

  }

  private setDoctors(doctors: Doctor[]): void {
    this.doctorsSubject.next(doctors);
    this.writeState(this.doctorsStorageKey, doctors);
  }

  private setAppointments(appointments: any[]): void {
    this.appointmentsSubject.next(appointments);
    this.writeState(this.appointmentsStorageKey, appointments);
  }

  private readState<T>(storageKey: string, fallback: T): T {
    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
      return fallback;
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      localStorage.removeItem(storageKey);
      return fallback;
    }
  }

  private writeState<T>(storageKey: string, value: T): void {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }

}
