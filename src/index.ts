import xs, {Stream, Listener} from 'xstream';
import {VNode, h, makeDOMDriver} from '@cycle/dom';
import Cycle from '@cycle/xstream-run';
import {DOMSource} from '@cycle/dom/xstream-typings';

export interface RequiredSources {
  DOM: DOMSource;
  props: Stream<Object>;
}

export interface RequiredSinks {
  DOM: Stream<VNode>;
}

export type Component = (sources: RequiredSources) => RequiredSinks;

type CycleExec = {
  sources: RequiredSources;
  sinks: RequiredSinks;
  run: () => () => {};
}

export interface CustomElementV0 {
  createdCallback(): void;
  attachedCallback(): void;
  detachedCallback(): void;
  attributeChangedCallback(attrName: string): void;
}

export interface CyclejsCustomElement extends CustomElementV0 {
  _cyclejsProps$: Stream<Object>;
  _cyclejsProps: Object;
  _cyclejsDispose(): void;
}

export interface SinkForCustomElement extends Stream<any> {
  _customElementListener: Listener<any>;
}

function createDispatcherForSink(eventName: string, element: Element): Listener<any> {
  return {
    next: (detail: any) => {
      const event = document.createEvent('Event');
      event.initEvent(eventName, true, true);
      event['detail'] = detail;
      element.dispatchEvent(event);
    },
    error: () => { },
    complete: () => { },
  }
}

function createDispatcherForAllSinks(sinks: Object): Listener<Element> {
  return {
    next: (element: Element) => {
      for (let key in sinks) {
        if (sinks.hasOwnProperty(key) && key !== 'DOM') {
          const sink = sinks[key] as SinkForCustomElement;
          sink.removeListener(sink._customElementListener);
          sink._customElementListener = createDispatcherForSink(key, element);
          sink.addListener(sink._customElementListener);
        }
      }
    },
    error: () => { },
    complete: () => { },
  };
}

function makePropsObject(element: HTMLElement): Object {
  const result = {};
  const attributes = element.attributes;
  for (let i = 0, N = attributes.length; i < N; i++) {
    const attribute = attributes[i];
    result[attribute.name] = attribute.value;
  }
  return result;
}

export default function customElementify(component: Component): typeof HTMLElement {
  var CEPrototype = Object.create(HTMLElement.prototype) as any as (CyclejsCustomElement & typeof HTMLElement);

  CEPrototype.attachedCallback = function attachedCallback() {
    const self: CyclejsCustomElement & HTMLElement = this;
    self._cyclejsProps$ = xs.create<any>();
    const {sources, sinks, run} = Cycle(component, {
      DOM: makeDOMDriver(self),
      props: () => self._cyclejsProps$
    }) as CycleExec;
    sources.DOM.elements().addListener(createDispatcherForAllSinks(sinks));
    self._cyclejsDispose = run();
    self._cyclejsProps = makePropsObject(self);
    self._cyclejsProps$.shamefullySendNext(self._cyclejsProps);
  };

  CEPrototype.detachedCallback = function detachedCallback() {
    (this as CyclejsCustomElement)._cyclejsDispose();
  };

  CEPrototype.attributeChangedCallback = function attributeChangedCallback(attrName: string) {
    const self: CyclejsCustomElement & HTMLElement = this;
    if (!self._cyclejsProps) return;
    self._cyclejsProps[attrName] = self.attributes.getNamedItem(attrName).value;
    self._cyclejsProps$.shamefullySendNext(self._cyclejsProps);
  };

  return CEPrototype;
}