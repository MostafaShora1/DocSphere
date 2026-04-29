import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesManagement } from './services-management';

describe('ServicesManagement', () => {
  let component: ServicesManagement;
  let fixture: ComponentFixture<ServicesManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
