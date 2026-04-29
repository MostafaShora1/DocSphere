import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorsManagement } from './doctors-management';

describe('DoctorsManagement', () => {
  let component: DoctorsManagement;
  let fixture: ComponentFixture<DoctorsManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorsManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorsManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
