import { animate, group, query, style, transition, trigger } from '@angular/animations';

export const routeTransitionAnimation = trigger('routeTransition', [
  transition('* <=> *', [
    style({
      position: 'relative'
    }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        inset: 0,
        width: '100%'
      })
    ], { optional: true }),
    query(':enter', [
      style({
        opacity: 0,
        transform: 'translate3d(0, 14px, 0)'
      })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('180ms ease-in-out', style({
          opacity: 0,
          transform: 'translate3d(0, -10px, 0)'
        }))
      ], { optional: true }),
      query(':enter', [
        animate('260ms ease-in-out', style({
          opacity: 1,
          transform: 'translate3d(0, 0, 0)'
        }))
      ], { optional: true })
    ])
  ])
]);
