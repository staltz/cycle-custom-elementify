import xs, {Stream} from 'xstream';
import {button, div, input, VNode} from '@cycle/dom';
import {DOMSource} from '@cycle/dom/xstream-typings';

export interface Action {
  type: 'CHANGE_COLOR' | 'CHANGE_WIDTH' | 'REMOVE';
  payload?: any;
}

export interface Props {
  color: string;
  width: number;
}

type State = Props;

function intent(domSource: DOMSource): Stream<Action> {
  return xs.merge(
    domSource.select('.color-field').events('input')
      .map(ev => ({
        type: 'CHANGE_COLOR',
        payload: (ev.target as HTMLInputElement).value
      } as Action)),

    domSource.select('.width-slider').events('input')
      .map(ev => ({
        type: 'CHANGE_WIDTH',
        payload: parseInt((ev.target as HTMLInputElement).value)
      } as Action)),

    domSource.select('.remove-btn').events('click')
      .mapTo({type: 'REMOVE'} as Action)
  );
}

function model(props$: Stream<Props>, action$: Stream<Action>): Stream<State> {
  const usePropsReducer$ = props$
    .map(props => function usePropsReducer(oldState: State) {
      return props;
    });

  const changeWidthReducer$ = action$
    .filter(a => a.type === 'CHANGE_WIDTH')
    .map(action => function changeWidthReducer(oldState: State): State {
      return {color: oldState.color, width: action.payload};
    });

  const changeColorReducer$ = action$
    .filter(a => a.type === 'CHANGE_COLOR')
    .map(action => function changeColorReducer(oldState: State): State {
      return {color: action.payload, width: oldState.width};
    });

  return xs.merge(usePropsReducer$, changeWidthReducer$, changeColorReducer$)
    .fold((state, reducer) => reducer(state), {color: '#888', width: 200});
}

function view(state$: Stream<State>) {
  return state$.map(({color, width}) => {
    const style = {
      border: '1px solid #000',
      background: 'none repeat scroll 0% 0% ' + color,
      width: width + 'px',
      height: '70px',
      display: 'block',
      padding: '20px',
      margin: '10px 0px'
    };
    return div('.item', {style}, [
      input('.color-field', {
        attrs: {type: 'text', value: color}
      }),
      div('.slider-container', [
        input('.width-slider', {
          attrs: {type: 'range', min: '200', max: '1000', value: width}
        })
      ]),
      div('.width-content', String(width)),
      button('.remove-btn', 'Remove')
    ]);
  });
}

export interface Sources {
  DOM: DOMSource;
  props: Stream<Props>;
}

export interface Sinks {
  DOM: Stream<VNode>;
  remove: Stream<any>;
}

function Item(sources: Sources): Sinks {
  const action$ = intent(sources.DOM);
  const state$ = model(sources.props, action$);
  const vtree$ = view(state$);

  const remove$ = state$
    .map(state => action$.filter(action => action.type === 'REMOVE'))
    .flatten();

  return {
    DOM: vtree$,
    remove: remove$,
  };
}

export default Item;
