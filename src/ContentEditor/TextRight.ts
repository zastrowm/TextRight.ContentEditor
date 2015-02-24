module TextRight.Editor {

  function main() {
    var output = <any>document.querySelector("#document");
    var view = new Internal.DocumentView(output);

    var debug = document.querySelector("#debug");

    document.querySelector("body").addEventListener('keydown', (evt:KeyboardEvent) => {
      debug.textContent = evt.keyCode.toString();
    });

    view.focus();
  }

  window.addEventListener('load', main);
} 