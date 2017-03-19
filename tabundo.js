// todo: rxify everything


let fromListener = (listenerAddition) => {
  let subject = new Rx.Subject();

  function l(...data) {
    subject.onNext(data);
  }

  listenerAddition.addListener(l);

  return subject;
};



function StateWithTimeTravel() {
  let undoStack = [];
  let redoStack = [];

  function copyStack(from, to) {
    while (from.length > 0) {
      to.push(from.pop());
    }
  }

  return {
    undo() {
      if (undoStack.length > 1) {
        let nowState = undoStack.pop();
        redoStack.push(nowState);
        let previousState = undoStack[undoStack.length - 1];
        return previousState;
      }
    },

    getAllFromUndoStack() {
      return undoStack;
    },

    redo() {
      if (redoStack.length > 0) {
        let currentState = redoStack.pop();
        undoStack.push(currentState);
        return currentState;
      }
    },

    add(o) {
      if(undoStack.length == 0 || undoStack[undoStack.length - 1] !== o) {
        let last = [];
        if (undoStack.length > 0) {
          last = [undoStack.pop()];
        }

        copyStack(redoStack, undoStack);
        copyStack(last, undoStack);

        undoStack.push(o);
      }
    },

    remove(pred) {
      undoStack = undoStack.filter(pred);
      redoStack = redoStack.filter(pred);
    }
  }

}


let tabStack = StateWithTimeTravel();

function tabChanged({tabId}) {
  tabStack.add(tabId);
}

function tabRemoved(tabId) {
  tabStack.remove(tabIdStack => tabId !== tabIdStack);
}


chrome.tabs.onRemoved.addListener(tabRemoved);
chrome.tabs.onActivated.addListener(tabChanged);

let tabsGet = Rx.Observable.fromCallback(chrome.tabs.get);
let tabUpdate = Rx.Observable.fromCallback(chrome.tabs.update);
let windowUpdate = Rx.Observable.fromCallback(chrome.windows.update);

fromListener(chrome.commands.onCommand)
  .subscribe(([command]) => {

    let tabToOpen;
    if (command === 'tabundo_undo_tab') {
      tabToOpen = tabStack.undo();
    }
    if (command === 'tabundo_redo_tab') {
      tabToOpen = tabStack.redo();
    }

    if (tabToOpen) {

      // todo: what to do with this sideffect + callback hell here ?

      chrome.tabs.get(tabToOpen, ({windowId, tabId}) => {

        chrome.tabs.update(tabToOpen, {active: true}, () => {

          chrome.windows.update(windowId, {focused: true});

        });

      });

    }

  });


function normalize(term) {
  if (term === undefined || term === null) return '';
  return term.replace(/ /g, '').toLowerCase();
}


function getAllTabs(ids) {
  return Rx.Observable.from(ids)
    .flatMap(id => tabsGet(id).catch(err => Rx.Observable.empty()))
    .filter(id => id !== undefined)
    .toArray();
}

fromListener(chrome.omnibox.onInputChanged)

  .flatMap(([text, suggest]) =>

    getAllTabs(tabStack.getAllFromUndoStack())

      .map(allTabs => {

        let searchFor = normalize(text);

        return allTabs
          .filter(tab => {
            let searchThrough = normalize(tab.title);
            return searchThrough.includes(searchFor);
          })
          .map(tab =>
            ({
              content: "" + tab.id,
              description: `${tab.title} ${tab.url}`
            })
          )

      })

      .map(found => ({
        found, suggest
      }))
  )

  .subscribe(({found, suggest}) => {
    suggest(found);
  });


fromListener(chrome.omnibox.onInputEntered)
  .subscribe(([text]) =>
    chrome.tabs.update(parseInt(text, 10), {active: true})
  );
