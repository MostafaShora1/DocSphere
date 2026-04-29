import { animate, animation, style, transition, trigger, useAnimation, query, stagger } from '@angular/animations';

const timing = '240ms ease-in-out';

export const fadeIn = animation([
  style({ opacity: 0 }),
  animate('{{ timing }}', style({ opacity: 1 }))
], {
  params: { timing }
});

export const fadeInUp = animation([
  style({
    opacity: 0,
    transform: 'translate3d(0, 16px, 0)'
  }),
  animate('{{ timing }}', style({
    opacity: 1,
    transform: 'translate3d(0, 0, 0)'
  }))
], {
  params: { timing }
});

export const fadeScaleIn = animation([
  style({
    opacity: 0,
    transform: 'scale3d(0.98, 0.98, 1)'
  }),
  animate('{{ timing }}', style({
    opacity: 1,
    transform: 'scale3d(1, 1, 1)'
  }))
], {
  params: { timing: '220ms ease-in-out' }
});

export const fadeInAnimation = trigger('fadeIn', [
  transition(':enter', [
    useAnimation(fadeIn)
  ])
]);

export const fadeInUpAnimation = trigger('fadeInUp', [
  transition(':enter', [
    useAnimation(fadeInUp)
  ])
]);

export const staggerFadeInUpAnimation = trigger('staggerFadeInUp', [
  transition(':enter', [
    query(':scope > *', [
      stagger(60, [
        useAnimation(fadeInUp, {
          params: { timing: '260ms ease-in-out' }
        })
      ])
    ], { optional: true })
  ])
]);
