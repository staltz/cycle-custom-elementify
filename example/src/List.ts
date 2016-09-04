import xs, {Stream} from 'xstream';
import {button, VNode, h, div} from '@cycle/dom';
import {DOMSource} from '@cycle/dom/xstream-typings';

export interface Sources {
  DOM: DOMSource;
}

export interface Sinks {
  DOM: Stream<VNode>;
}

export interface ItemData {
  id: number;
  color: string;
  width: number;
}

export interface Action {
  type: 'ADD_ITEM' | 'REMOVE_ITEM';
  payload?: any;
}

function intent(domSource: DOMSource): Stream<Action> {
  return xs.merge(
    domSource.select('.add-one-btn').events('click')
      .mapTo({type: 'ADD_ITEM', payload: 1} as Action),

    domSource.select('.add-many-btn').events('click')
      .mapTo({type: 'ADD_ITEM', payload: 1000} as Action),

    domSource.select('.item').events('remove')
      .map((ev: CustomEvent) =>
        ({ type: 'REMOVE_ITEM', payload: (ev.target as HTMLElement).id } as Action)
      )
  );
}

let mutableId = 0;

function model(action$: Stream<Action>): Stream<Array<ItemData>> {
  function createRandomItemProps(): ItemData {
    let hexColor = Math.floor(Math.random() * 16777215).toString(16);
    while (hexColor.length < 6) {
      hexColor = '0' + hexColor;
    }
    hexColor = '#' + hexColor;
    const randomWidth = Math.floor(Math.random() * 800 + 200);
    return {color: hexColor, width: randomWidth, id: mutableId++};
  }

  const addItemReducer$ = action$
    .filter(a => a.type === 'ADD_ITEM')
    .map(action => {
      const amount = action.payload;
      let newItems: Array<ItemData> = [];
      for (let i = 0; i < amount; i++) {
        newItems.push(createRandomItemProps());
      }
      return function addItemReducer(listItems: Array<ItemData>): Array<ItemData> {
        return listItems.concat(newItems);
      };
    });

  const removeItemReducer$ = action$
    .filter(a => a.type === 'REMOVE_ITEM')
    .map(action => function removeItemReducer(listItems: Array<ItemData>): Array<ItemData> {
      return listItems.filter(item => `item-${item.id}` !== action.payload);
    });

  const initialState: Array<ItemData> = [{ color: 'red', width: 300, id: mutableId++ }];

  return xs.merge(addItemReducer$, removeItemReducer$)
    .fold((listItems, reducer) => reducer(listItems), initialState);
}

function view(items$: Stream<Array<ItemData>>) {
  return items$.map(items =>
    div('.addButtons', [
      button('.add-one-btn', 'Add New Item'),
      button('.add-many-btn', 'Add Many Items'),
      ...(items.map(x =>
        h(`many-item#item-${x.id}.item`, {
          key: `${x.id}`,
          attrs: { color: x.color, width: x.width },
        }))
      )
    ])
  );
}

export default function List(sources: Sources): Sinks {
  const action$ = intent(sources.DOM);
  const items$ = model(action$);
  const vdom$ = view(items$);

  return {
    DOM: vdom$
  }
}