function StateWithTimeTravel() {
  let undoStack = [];
  let redoStack = [];

  return {
    undo() {
      if (undoStack.length > 1) {
        let nowState = undoStack.pop();
        redoStack.push(nowState);
        let previousState = undoStack[undoStack.length - 1];
        return previousState;
      }
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
        undoStack.push(o);
        redoStack = [];
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

chrome.commands.onCommand.addListener(command => {

  let tabToOpen;
  if (command === 'tabundo_undo_tab') {
    tabToOpen = tabStack.undo();
  }
  if (command === 'tabundo_redo_tab') {
    tabToOpen = tabStack.redo();
  }

  if (tabToOpen) {
    chrome.tabs.update(tabToOpen, {active: true});
  }

});