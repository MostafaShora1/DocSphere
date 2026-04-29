import { TestBed } from '@angular/core/testing';

import { Translation } from './translation.service';

describe('Translation', () => {
  let service: Translation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Translation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
