// tslint:disable:max-file-line-count no-magic-numbers

import { parseLML } from '../index';

describe('DOMNodeAttribute', () => {
  describe('sort', () => {
    it('does not sort by default', () => {
      const json = parseLML(`div\n\tspan x Y z a`).toJSON();
      expect(json[0].children[0].name).toBe('span');
      expect(json[0].children[0].attributes.length).toBe(4);
      expect(json[0].children[0].attributes[0].name).toBe('x');
      expect(json[0].children[0].attributes[1].name).toBe('Y');
      expect(json[0].children[0].attributes[2].name).toBe('z');
      expect(json[0].children[0].attributes[3].name).toBe('a');
    });

    it('uses ASCII order', () => {
      const json = parseLML(`div\n\tspan x Y z a`).toJSON({orderAttributes: 'ascii'});
      expect(json[0].children[0].name).toBe('span');
      expect(json[0].children[0].attributes.length).toBe(4);
      expect(json[0].children[0].attributes[0].name).toBe('Y');
      expect(json[0].children[0].attributes[1].name).toBe('a');
      expect(json[0].children[0].attributes[2].name).toBe('x');
      expect(json[0].children[0].attributes[3].name).toBe('z');
    });

    it('can do natural', () => {
      const json = parseLML(`div\n\tspan x Y z a`).toJSON({orderAttributes: 'natural'});
      expect(json[0].children[0].name).toBe('span');
      expect(json[0].children[0].attributes.length).toBe(4);
      expect(json[0].children[0].attributes[0].name).toBe('a');
      expect(json[0].children[0].attributes[1].name).toBe('x');
      expect(json[0].children[0].attributes[2].name).toBe('Y');
      expect(json[0].children[0].attributes[3].name).toBe('z');
    });

    it('orders for angular: #ref > *template > normal+input attributes > banana-box > event handlers', () => {
      const json = parseLML(`div\n\tspan x #B C #a *ngIf="x" b (tick)="do" (click)="do" [(zox)]="mox" [n]=1 [a]="a" `)
        .toJSON({orderAttributes: 'angular'});
      expect(json[0].children[0].name).toBe('span');
      expect(json[0].children[0].attributes.length).toBe(11);
      expect(json[0].children[0].attributes[0].name).toBe('#a');
      expect(json[0].children[0].attributes[1].name).toBe('#B');
      expect(json[0].children[0].attributes[2].name).toBe('*ngIf');
      expect(json[0].children[0].attributes[3].name).toBe('[a]');
      expect(json[0].children[0].attributes[4].name).toBe('b');
      expect(json[0].children[0].attributes[5].name).toBe('C');
      expect(json[0].children[0].attributes[6].name).toBe('[n]');
      expect(json[0].children[0].attributes[7].name).toBe('x');
      expect(json[0].children[0].attributes[8].name).toBe('[(zox)]');
      expect(json[0].children[0].attributes[9].name).toBe('(click)');
      expect(json[0].children[0].attributes[10].name).toBe('(tick)');
    });
  });
});
