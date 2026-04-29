import { animate, style, transition, trigger } from '@angular/animations';

export const slideInDownAnimation = trigger('slideInDown', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translate3d(0, -12px, 0)'
    }),
    animate('240ms ease-in-out', style({
      opacity: 1,
      transform: 'translate3d(0, 0, 0)'
    }))
  ])
]);

export const slideInUpAnimation = trigger('slideInUp', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translate3d(0, 18px, 0)'
    }),
    animate('260ms ease-in-out', style({
      opacity: 1,
      transform: 'translate3d(0, 0, 0)'
    }))
  ])
]);
