import xs, {Stream} from 'xstream';
import {run} from '@cycle/xstream-run';
import {h, VNode, makeDOMDriver} from '@cycle/dom';
import Item from './Item';
import List from './List';
import {DOMSource} from '@cycle/dom/xstream-typings';
import customElementify from 'cycle-custom-elementify';

interface Sources {
  DOM: DOMSource;
}

interface Sinks {
  DOM: Stream<VNode>;
}

function main(sources: Sources): Sinks {
  return List(sources);
}

window.addEventListener('WebComponentsReady', () => {
  (document as any).registerElement('many-item', { prototype: customElementify(Item as any) });
  run(main, {
    DOM: makeDOMDriver('#main-container')
  });
});
